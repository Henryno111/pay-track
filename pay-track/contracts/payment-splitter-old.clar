;; Payment Splitter Smart Contract - Simplified Version
;; Split payments among multiple recipients

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-invalid-split (err u401))
(define-constant err-unauthorized (err u402))
(define-constant err-split-not-found (err u403))

(define-constant platform-fee-percentage u150) ;; 1.5%

;; Data Variables
(define-data-var total-splits uint u0)
(define-data-var total-fees uint u0)

;; Data Maps
(define-map splits
    uint
    {
        creator: principal,
        description: (string-ascii 100),
        created-at: uint,
        total-distributed: uint
    }
)

(define-map split-recipients
    { split-id: uint, index: uint }
    {
        recipient: principal,
        percentage: uint
    }
)

;; Read-only
(define-read-only (get-split (split-id uint))
    (map-get? splits split-id)
)

(define-read-only (get-recipient (split-id uint) (index uint))
    (map-get? split-recipients { split-id: split-id, index: index })
)

(define-read-only (get-total-splits)
    (ok (var-get total-splits))
)

;; Create split (just saves configuration)
(define-public (create-split (description (string-ascii 100)))
    (let ((split-id (+ (var-get total-splits) u1)))
        (map-set splits split-id
            {
                creator: tx-sender,
                description: description,
                created-at: stacks-block-height,
                total-distributed: u0
            }
        )
        (var-set total-splits split-id)
        (ok split-id)
    )
)

;; Add recipient to split
(define-public (add-recipient (split-id uint) (index uint) (recipient principal) (percentage uint))
    (let ((split-data (unwrap! (map-get? splits split-id) err-split-not-found)))
        (asserts! (is-eq tx-sender (get creator split-data)) err-unauthorized)
        (map-set split-recipients
            { split-id: split-id, index: index }
            { recipient: recipient, percentage: percentage }
        )
        (ok true)
    )
)

;; Execute split payment
(define-public (execute-split (split-id uint) (amount uint) (recipient-count uint))
    (let (
        (split-data (unwrap! (map-get? splits split-id) err-split-not-found))
        (fee (/ (* amount platform-fee-percentage) u10000))
        (net-amount (- amount fee))
    )
        (try! (pay-recipients split-id net-amount recipient-count))
        (try! (stx-transfer? fee tx-sender contract-owner))
        (var-set total-fees (+ (var-get total-fees) fee))
        (ok true)
    )
)

(define-private (pay-recipients (split-id uint) (net-amount uint) (count uint))
    (pay-loop split-id net-amount u0 count)
)

(define-private (pay-loop (split-id uint) (net-amount uint) (current uint) (total uint))
    (if (< current total)
        (match (map-get? split-recipients { split-id: split-id, index: current })
            recipient-data
                (let ((payment (/ (* net-amount (get percentage recipient-data)) u10000)))
                    (try! (stx-transfer? payment tx-sender (get recipient recipient-data)))
                    (pay-loop split-id net-amount (+ current u1) total)
                )
            (err err-split-not-found)
        )
        (ok true)
    )
)
