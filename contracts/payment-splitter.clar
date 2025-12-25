;; Payment Splitter Contract
;; Enables splitting payments among multiple recipients with defined percentages
;; Use Cases: Team payments, commission splits, revenue sharing

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u600))
(define-constant ERR-INVALID-SPLIT (err u601))
(define-constant ERR-SPLIT-NOT-FOUND (err u602))
(define-constant ERR-INVALID-PERCENTAGE (err u603))
(define-constant ERR-TOO-MANY-RECIPIENTS (err u604))
(define-constant ERR-INSUFFICIENT-AMOUNT (err u605))
(define-constant ERR-ALREADY-EXECUTED (err u606))
(define-constant ERR-PERCENTAGE-MISMATCH (err u607))

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant MAX-RECIPIENTS u20)
(define-constant MIN-SPLIT-AMOUNT u1000) ;; Minimum 1000 microSTX
(define-constant PLATFORM-FEE-PERCENTAGE u150) ;; 1.5% platform fee (150 basis points)

;; Data vars
(define-data-var split-counter uint u0)
(define-data-var total-volume uint u0)
(define-data-var total-platform-fees uint u0)

;; Data structures
(define-map payment-splits
  { split-id: uint }
  {
    creator: principal,
    total-amount: uint,
    recipient-count: uint,
    executed: bool,
    created-at: uint,
    executed-at: (optional uint),
    description: (string-ascii 256)
  }
)

(define-map split-recipients
  { split-id: uint, recipient-index: uint }
  {
    recipient: principal,
    percentage: uint, ;; Basis points (10000 = 100%)
    amount: uint,
    paid: bool
  }
)

(define-map user-split-history
  { user: principal, history-index: uint }
  { split-id: uint }
)

(define-map user-split-count
  { user: principal }
  { count: uint }
)

;; Read-only functions

(define-read-only (get-split (split-id uint))
  (map-get? payment-splits { split-id: split-id })
)

(define-read-only (get-recipient (split-id uint) (recipient-index uint))
  (map-get? split-recipients { split-id: split-id, recipient-index: recipient-index })
)

(define-read-only (get-total-splits)
  (var-get split-counter)
)

(define-read-only (get-total-volume)
  (var-get total-volume)
)

(define-read-only (get-total-platform-fees)
  (var-get total-platform-fees)
)

(define-read-only (get-user-split-count (user principal))
  (default-to 
    { count: u0 }
    (map-get? user-split-count { user: user })
  )
)

(define-read-only (get-user-split-history (user principal) (history-index uint))
  (map-get? user-split-history { user: user, history-index: history-index })
)

;; Helper function to validate percentage total
(define-private (validate-percentage-sum (total uint))
  (is-eq total u10000) ;; Must equal 100% (10000 basis points)
)

;; Private function to calculate fee
(define-private (calculate-platform-fee (amount uint))
  (/ (* amount PLATFORM-FEE-PERCENTAGE) u10000)
)

;; Public functions

;; Create a payment split configuration (without funds)
;; Recipients and percentages are added separately
(define-public (create-split (total-amount uint) (recipient-count uint) (description (string-ascii 256)))
  (let
    (
      (split-id (+ (var-get split-counter) u1))
    )
    ;; Validations
    (asserts! (> total-amount MIN-SPLIT-AMOUNT) ERR-INSUFFICIENT-AMOUNT)
    (asserts! (and (> recipient-count u0) (<= recipient-count MAX-RECIPIENTS)) ERR-TOO-MANY-RECIPIENTS)
    
    ;; Create split record
    (map-set payment-splits
      { split-id: split-id }
      {
        creator: tx-sender,
        total-amount: total-amount,
        recipient-count: recipient-count,
        executed: false,
        created-at: stacks-block-height,
        executed-at: none,
        description: description
      }
    )
    
    ;; Update counter
    (var-set split-counter split-id)
    
    ;; Add to user history
    (let
      (
        (user-count (get count (get-user-split-count tx-sender)))
      )
      (map-set user-split-history
        { user: tx-sender, history-index: user-count }
        { split-id: split-id }
      )
      (map-set user-split-count
        { user: tx-sender }
        { count: (+ user-count u1) }
      )
    )
    
    (ok split-id)
  )
)

;; Add a recipient to a split configuration
(define-public (add-recipient (split-id uint) (recipient-index uint) (recipient principal) (percentage uint))
  (let
    (
      (split-data (unwrap! (get-split split-id) ERR-SPLIT-NOT-FOUND))
    )
    ;; Validations
    (asserts! (is-eq (get creator split-data) tx-sender) ERR-NOT-AUTHORIZED)
    (asserts! (not (get executed split-data)) ERR-ALREADY-EXECUTED)
    (asserts! (< recipient-index (get recipient-count split-data)) ERR-INVALID-SPLIT)
    (asserts! (and (> percentage u0) (<= percentage u10000)) ERR-INVALID-PERCENTAGE)
    
    ;; Calculate amount for this recipient
    (let
      (
        (recipient-amount (/ (* (get total-amount split-data) percentage) u10000))
      )
      ;; Add recipient
      (map-set split-recipients
        { split-id: split-id, recipient-index: recipient-index }
        {
          recipient: recipient,
          percentage: percentage,
          amount: recipient-amount,
          paid: false
        }
      )
      
      (ok true)
    )
  )
)

;; Execute the payment split - transfers funds to all recipients
(define-public (execute-split (split-id uint))
  (let
    (
      (split-data (unwrap! (get-split split-id) ERR-SPLIT-NOT-FOUND))
      (platform-fee (calculate-platform-fee (get total-amount split-data)))
      (total-with-fee (+ (get total-amount split-data) platform-fee))
    )
    ;; Validations
    (asserts! (is-eq (get creator split-data) tx-sender) ERR-NOT-AUTHORIZED)
    (asserts! (not (get executed split-data)) ERR-ALREADY-EXECUTED)
    
    ;; Verify all recipients are configured and percentages sum to 100%
    (asserts! 
      (is-some (validate-recipients split-id (get recipient-count split-data) u0 u0))
      ERR-PERCENTAGE-MISMATCH
    )
    
    ;; Process payments to each recipient
    (unwrap! (process-all-payments split-id (get recipient-count split-data) u0) ERR-INVALID-SPLIT)
    
    ;; Update split as executed
    (map-set payment-splits
      { split-id: split-id }
      (merge split-data {
        executed: true,
        executed-at: (some stacks-block-height)
      })
    )
    
    ;; Update stats
    (var-set total-volume (+ (var-get total-volume) (get total-amount split-data)))
    (var-set total-platform-fees (+ (var-get total-platform-fees) platform-fee))
    
    (ok true)
  )
)

;; Validate all recipients are configured and percentages sum to 100%
(define-private (validate-recipients (split-id uint) (total-count uint) (current-index uint) (percentage-sum uint))
  (if (>= current-index total-count)
    ;; Base case: check if total is 100%
    (if (validate-percentage-sum percentage-sum)
      (some true)
      none
    )
    ;; Recursive case: check next recipient
    (match (get-recipient split-id current-index)
      recipient-data
        (validate-recipients 
          split-id 
          total-count 
          (+ current-index u1) 
          (+ percentage-sum (get percentage recipient-data))
        )
      none ;; Recipient not found
    )
  )
)

;; Process payments to all recipients recursively
(define-private (process-all-payments (split-id uint) (total-count uint) (current-index uint))
  (if (>= current-index total-count)
    ;; Base case: all payments processed
    (ok true)
    ;; Recursive case: pay current recipient and continue
    (match (get-recipient split-id current-index)
      recipient-data
        (begin
          ;; Transfer to recipient
          (try! (stx-transfer? (get amount recipient-data) tx-sender (get recipient recipient-data)))
          
          ;; Mark as paid
          (map-set split-recipients
            { split-id: split-id, recipient-index: current-index }
            (merge recipient-data { paid: true })
          )
          
          ;; Continue to next recipient
          (process-all-payments split-id total-count (+ current-index u1))
        )
      ERR-SPLIT-NOT-FOUND
    )
  )
)

;; Quick split function for simple use cases (2-5 recipients with equal splits)
(define-public (quick-equal-split (amount uint) (recipients (list 20 principal)))
  (let
    (
      (recipient-count (len recipients))
      (split-id (+ (var-get split-counter) u1))
      (per-recipient-amount (/ amount recipient-count))
      (equal-percentage (/ u10000 recipient-count))
    )
    ;; Validations
    (asserts! (> recipient-count u0) ERR-TOO-MANY-RECIPIENTS)
    (asserts! (<= recipient-count MAX-RECIPIENTS) ERR-TOO-MANY-RECIPIENTS)
    (asserts! (> amount MIN-SPLIT-AMOUNT) ERR-INSUFFICIENT-AMOUNT)
    
    ;; Create the split
    (try! (create-split amount recipient-count "Quick equal split"))
    
    ;; Add all recipients with equal percentages
    (try! (add-recipients-equal split-id recipients u0 equal-percentage))
    
    ;; Execute immediately
    (execute-split split-id)
  )
)

;; Helper to add recipients with equal percentages
(define-private (add-recipients-equal (split-id uint) (recipients (list 20 principal)) (index uint) (percentage uint))
  (fold add-recipient-fold recipients { split-id: split-id, index: u0, percentage: percentage, success: true })
  (ok true)
)

;; Fold function to add recipients
(define-private (add-recipient-fold 
  (recipient principal) 
  (state { split-id: uint, index: uint, percentage: uint, success: bool })
)
  (if (get success state)
    (match (add-recipient (get split-id state) (get index state) recipient (get percentage state))
      success (merge state { index: (+ (get index state) u1) })
      error (merge state { success: false })
    )
    state
  )
)
