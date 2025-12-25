;; Multi-Signature Escrow Smart Contract
;; Enables escrow with multiple signature requirements (2-of-3, 3-of-5, etc.)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u600))
(define-constant err-invalid-escrow (err u601))
(define-constant err-unauthorized (err u602))
(define-constant err-escrow-not-found (err u603))
(define-constant err-already-signed (err u604))
(define-constant err-insufficient-signatures (err u605))
(define-constant err-escrow-expired (err u606))
(define-constant err-not-expired (err u607))
(define-constant err-invalid-signers (err u608))
(define-constant err-already-executed (err u609))

;; Platform fee: 3% for multi-sig escrow
(define-constant platform-fee-percentage u3)
(define-constant max-signers u10)

;; Data Variables
(define-data-var total-escrows uint u0)
(define-data-var total-fees-collected uint u0)

;; Data Maps
(define-map multisig-escrows
    uint
    {
        buyer: principal,
        seller: principal,
        amount: uint,
        required-signatures: uint,
        total-signers: uint,
        current-signatures: uint,
        release-signatures: uint,
        refund-signatures: uint,
        expires-at: uint,
        created-at: uint,
        status: (string-ascii 20), ;; "pending", "released", "refunded", "expired"
        description: (string-ascii 200)
    }
)

(define-map escrow-signers
    { escrow-id: uint, signer-index: uint }
    {
        signer: principal,
        signed-release: bool,
        signed-refund: bool,
        signing-weight: uint ;; For weighted voting (default 1)
    }
)

(define-map escrow-transactions
    uint
    {
        escrow-id: uint,
        action: (string-ascii 20), ;; "released" or "refunded"
        amount: uint,
        fee: uint,
        executed-at: uint,
        executed-by: principal
    }
)

(define-data-var transaction-nonce uint u0)

;; Read-only functions
(define-read-only (get-escrow (escrow-id uint))
    (map-get? multisig-escrows escrow-id)
)

(define-read-only (get-signer (escrow-id uint) (signer-index uint))
    (map-get? escrow-signers { escrow-id: escrow-id, signer-index: signer-index })
)

(define-read-only (get-transaction (tx-id uint))
    (map-get? escrow-transactions tx-id)
)

(define-read-only (get-total-escrows)
    (ok (var-get total-escrows))
)

(define-read-only (get-total-fees)
    (ok (var-get total-fees-collected))
)

(define-read-only (is-signer (escrow-id uint) (user principal))
    (match (get-escrow escrow-id)
        escrow-data
            (ok (or
                (is-eq user (get buyer escrow-data))
                (is-eq user (get seller escrow-data))
                (check-signer-list escrow-id user (get total-signers escrow-data))
            ))
        (err err-escrow-not-found)
    )
)

;; Private functions

(define-private (check-signer-list (escrow-id uint) (user principal) (total-signers uint))
    (check-signer-recursive escrow-id user u0 total-signers)
)

(define-private (check-signer-recursive (escrow-id uint) (user principal) (current-index uint) (total uint))
    (if (< current-index total)
        (match (map-get? escrow-signers { escrow-id: escrow-id, signer-index: current-index })
            signer-data
                (if (is-eq (get signer signer-data) user)
                    true
                    (check-signer-recursive escrow-id user (+ current-index u1) total)
                )
            (check-signer-recursive escrow-id user (+ current-index u1) total)
        )
        false
    )
)

(define-private (store-signer 
    (signer-principal principal)
    (context { escrow-id: uint, index: uint })
)
    (begin
        (map-set escrow-signers
            { escrow-id: (get escrow-id context), signer-index: (get index context) }
            {
                signer: signer-principal,
                signed-release: false,
                signed-refund: false,
                signing-weight: u1
            }
        )
        { escrow-id: (get escrow-id context), index: (+ (get index context) u1) }
    )
)

;; Public functions

;; Create a new multi-sig escrow
(define-public (create-multisig-escrow
    (seller principal)
    (amount uint)
    (duration uint)
    (required-signatures uint)
    (additional-signers (list 10 principal))
    (description (string-ascii 200))
)
    (let
        (
            (escrow-id (+ (var-get total-escrows) u1))
            (signer-count (+ (len additional-signers) u2)) ;; +2 for buyer and seller
            (fee-amount (/ (* amount platform-fee-percentage) u100))
        )
        ;; Validations
        (asserts! (> amount u0) err-invalid-escrow)
        (asserts! (> duration u0) err-invalid-escrow)
        (asserts! (> required-signatures u0) err-invalid-escrow)
        (asserts! (<= required-signatures signer-count) err-invalid-signers)
        (asserts! (<= (len additional-signers) max-signers) err-invalid-signers)
        (asserts! (not (is-eq seller tx-sender)) err-invalid-escrow)
        
        ;; Note: In production, would lock funds here
        ;; (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
        
        ;; Store escrow
        (map-set multisig-escrows escrow-id
            {
                buyer: tx-sender,
                seller: seller,
                amount: amount,
                required-signatures: required-signatures,
                total-signers: signer-count,
                current-signatures: u0,
                release-signatures: u0,
                refund-signatures: u0,
                expires-at: (+ stacks-block-height duration),
                created-at: stacks-block-height,
                status: "pending",
                description: description
            }
        )
        
        ;; Store buyer and seller as first two signers
        (map-set escrow-signers
            { escrow-id: escrow-id, signer-index: u0 }
            {
                signer: tx-sender,
                signed-release: false,
                signed-refund: false,
                signing-weight: u1
            }
        )
        (map-set escrow-signers
            { escrow-id: escrow-id, signer-index: u1 }
            {
                signer: seller,
                signed-release: false,
                signed-refund: false,
                signing-weight: u1
            }
        )
        
        ;; Store additional signers
        (fold store-signer additional-signers { escrow-id: escrow-id, index: u2 })
        
        (var-set total-escrows escrow-id)
        
        (ok escrow-id)
    )
)

;; Sign to release escrow (requires required-signatures count)
(define-public (sign-release (escrow-id uint))
    (let
        (
            (escrow (unwrap! (map-get? multisig-escrows escrow-id) err-escrow-not-found))
            (signer-index (unwrap! (find-signer-index escrow-id tx-sender (get total-signers escrow)) err-unauthorized))
            (signer-data (unwrap! (map-get? escrow-signers { escrow-id: escrow-id, signer-index: signer-index }) err-unauthorized))
        )
        ;; Validations
        (asserts! (is-eq (get status escrow) "pending") err-already-executed)
        (asserts! (< stacks-block-height (get expires-at escrow)) err-escrow-expired)
        (asserts! (not (get signed-release signer-data)) err-already-signed)
        
        ;; Update signer
        (map-set escrow-signers
            { escrow-id: escrow-id, signer-index: signer-index }
            (merge signer-data { signed-release: true })
        )
        
        ;; Update escrow signature count
        (let
            (
                (new-release-count (+ (get release-signatures escrow) u1))
            )
            (map-set multisig-escrows escrow-id
                (merge escrow { release-signatures: new-release-count })
            )
            
            ;; Check if enough signatures
            (if (>= new-release-count (get required-signatures escrow))
                (execute-release-internal escrow-id escrow)
                (ok true)
            )
        )
    )
)

;; Sign to refund escrow (requires required-signatures count)
(define-public (sign-refund (escrow-id uint))
    (let
        (
            (escrow (unwrap! (map-get? multisig-escrows escrow-id) err-escrow-not-found))
            (signer-index (unwrap! (find-signer-index escrow-id tx-sender (get total-signers escrow)) err-unauthorized))
            (signer-data (unwrap! (map-get? escrow-signers { escrow-id: escrow-id, signer-index: signer-index }) err-unauthorized))
        )
        ;; Validations
        (asserts! (is-eq (get status escrow) "pending") err-already-executed)
        (asserts! (not (get signed-refund signer-data)) err-already-signed)
        
        ;; Update signer
        (map-set escrow-signers
            { escrow-id: escrow-id, signer-index: signer-index }
            (merge signer-data { signed-refund: true })
        )
        
        ;; Update escrow signature count
        (let
            (
                (new-refund-count (+ (get refund-signatures escrow) u1))
            )
            (map-set multisig-escrows escrow-id
                (merge escrow { refund-signatures: new-refund-count })
            )
            
            ;; Check if enough signatures
            (if (>= new-refund-count (get required-signatures escrow))
                (execute-refund-internal escrow-id escrow)
                (ok true)
            )
        )
    )
)

;; Internal function to execute release
(define-private (execute-release-internal 
    (escrow-id uint) 
    (escrow { buyer: principal, seller: principal, amount: uint, required-signatures: uint, total-signers: uint, current-signatures: uint, release-signatures: uint, refund-signatures: uint, expires-at: uint, created-at: uint, status: (string-ascii 20), description: (string-ascii 200) })
)
    (let
        (
            (fee-amount (/ (* (get amount escrow) platform-fee-percentage) u100))
            (net-amount (- (get amount escrow) fee-amount))
            (tx-id (+ (var-get transaction-nonce) u1))
        )
        ;; Note: In production, would transfer from contract
        ;; (try! (as-contract (stx-transfer? net-amount tx-sender (get seller escrow))))
        ;; (try! (as-contract (stx-transfer? fee-amount tx-sender contract-owner)))
        
        ;; Update statistics
        (var-set total-fees-collected (+ (var-get total-fees-collected) fee-amount))
        (var-set transaction-nonce tx-id)
        
        ;; Update escrow status
        (map-set multisig-escrows escrow-id
            (merge escrow { status: "released" })
        )
        
        ;; Record transaction
        (map-set escrow-transactions tx-id
            {
                escrow-id: escrow-id,
                action: "released",
                amount: net-amount,
                fee: fee-amount,
                executed-at: stacks-block-height,
                executed-by: tx-sender
            }
        )
        
        (ok true)
    )
)

;; Internal function to execute refund
(define-private (execute-refund-internal 
    (escrow-id uint) 
    (escrow { buyer: principal, seller: principal, amount: uint, required-signatures: uint, total-signers: uint, current-signatures: uint, release-signatures: uint, refund-signatures: uint, expires-at: uint, created-at: uint, status: (string-ascii 20), description: (string-ascii 200) })
)
    (let
        (
            (tx-id (+ (var-get transaction-nonce) u1))
        )
        ;; Note: In production, would transfer from contract
        ;; (try! (as-contract (stx-transfer? (get amount escrow) tx-sender (get buyer escrow))))
        
        (var-set transaction-nonce tx-id)
        
        ;; Update escrow status
        (map-set multisig-escrows escrow-id
            (merge escrow { status: "refunded" })
        )
        
        ;; Record transaction
        (map-set escrow-transactions tx-id
            {
                escrow-id: escrow-id,
                action: "refunded",
                amount: (get amount escrow),
                fee: u0,
                executed-at: stacks-block-height,
                executed-by: tx-sender
            }
        )
        
        (ok true)
    )
)

;; Helper function to find signer index
(define-private (find-signer-index (escrow-id uint) (user principal) (total-signers uint))
    (find-signer-index-recursive escrow-id user u0 total-signers)
)

(define-private (find-signer-index-recursive (escrow-id uint) (user principal) (current-index uint) (total uint))
    (if (< current-index total)
        (match (map-get? escrow-signers { escrow-id: escrow-id, signer-index: current-index })
            signer-data
                (if (is-eq (get signer signer-data) user)
                    (ok current-index)
                    (find-signer-index-recursive escrow-id user (+ current-index u1) total)
                )
            (find-signer-index-recursive escrow-id user (+ current-index u1) total)
        )
        (err u0)
    )
)
