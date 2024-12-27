;; Define NFT for achievement badges
(define-non-fungible-token skill-badge uint)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-already-exists (err u102))
(define-constant err-invalid-progress (err u103))

;; Data structures
(define-map skills 
    { skill-id: uint }
    { name: (string-ascii 64), description: (string-ascii 256) }
)

(define-map user-skills
    { user: principal, skill-id: uint }
    { progress: uint, last-updated: uint }
)

(define-map badges 
    { badge-id: uint }
    { skill-id: uint, required-progress: uint, name: (string-ascii 64) }
)

(define-map user-badges
    { user: principal, badge-id: uint }
    { awarded-at: uint }
)

;; Data vars
(define-data-var next-skill-id uint u1)
(define-data-var next-badge-id uint u1)

;; Admin functions
(define-public (register-skill (name (string-ascii 64)) (description (string-ascii 256)))
    (let ((skill-id (var-get next-skill-id)))
        (if (is-eq tx-sender contract-owner)
            (begin
                (map-set skills {skill-id: skill-id} {name: name, description: description})
                (var-set next-skill-id (+ skill-id u1))
                (ok skill-id)
            )
            err-owner-only
        )
    )
)

(define-public (create-badge (skill-id uint) (required-progress uint) (name (string-ascii 64)))
    (let ((badge-id (var-get next-badge-id)))
        (if (is-eq tx-sender contract-owner)
            (begin
                (map-set badges 
                    {badge-id: badge-id} 
                    {skill-id: skill-id, required-progress: required-progress, name: name}
                )
                (var-set next-badge-id (+ badge-id u1))
                (ok badge-id)
            )
            err-owner-only
        )
    )
)

;; User functions
(define-public (update-skill-progress (skill-id uint) (progress uint))
    (let (
        (current-data (default-to 
            {progress: u0, last-updated: u0}
            (map-get? user-skills {user: tx-sender, skill-id: skill-id})
        ))
    )
    (if (and 
        (>= progress (get progress current-data))
        (map-get? skills {skill-id: skill-id}))
        (begin
            (map-set user-skills 
                {user: tx-sender, skill-id: skill-id}
                {progress: progress, last-updated: block-height}
            )
            (try! (check-and-award-badges tx-sender skill-id progress))
            (ok true)
        )
        err-invalid-progress
    ))
)

;; Helper functions
(define-private (check-and-award-badges (user principal) (skill-id uint) (progress uint))
    (let ((badge-id (get-badge-for-progress skill-id progress)))
        (if (is-some badge-id)
            (mint-badge user (unwrap-panic badge-id))
            (ok true)
        )
    )
)

(define-private (mint-badge (user principal) (badge-id uint))
    (if (is-none (map-get? user-badges {user: user, badge-id: badge-id}))
        (begin
            (try! (nft-mint? skill-badge badge-id user))
            (map-set user-badges 
                {user: user, badge-id: badge-id}
                {awarded-at: block-height}
            )
            (ok true)
        )
        (ok false)
    )
)

;; Read functions
(define-read-only (get-skill-progress (user principal) (skill-id uint))
    (ok (default-to 
        {progress: u0, last-updated: u0}
        (map-get? user-skills {user: user, skill-id: skill-id})
    ))
)

(define-read-only (get-badge-for-progress (skill-id uint) (progress uint))
    (let ((badge-id (var-get next-badge-id)))
        (filter-matching-badge badge-id skill-id progress)
    )
)

(define-read-only (get-user-badges (user principal))
    (ok (map-get? user-badges {user: user}))
)

(define-private (filter-matching-badge (badge-id uint) (skill-id uint) (progress uint))
    (let ((badge-data (map-get? badges {badge-id: badge-id})))
        (if (and
            (is-some badge-data)
            (is-eq (get skill-id (unwrap-panic badge-data)) skill-id)
            (>= progress (get required-progress (unwrap-panic badge-data)))
        )
            (some badge-id)
            none
        )
    )
)