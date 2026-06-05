-- PW-006 initial schema (Zcash view-only wallet).
-- Sensitive values (FVK, amounts) are stored as XChaCha20-Poly1305 ciphertext
-- in BLOB columns; only structural/public fields stay in plaintext so they can
-- be indexed. See src/crypto/vault.rs for the key hierarchy.

CREATE TABLE accounts (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT    NOT NULL,
    ufvk_fingerprint BLOB    UNIQUE,                 -- dedupe the same UFVK
    birthday_height  INTEGER NOT NULL,               -- height to start scanning
    created_at       INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 1:1 with account. Encrypted UFVK (the crown jewel).
CREATE TABLE viewing_keys (
    account_id       INTEGER PRIMARY KEY
                       REFERENCES accounts(id) ON DELETE CASCADE,
    encrypted_fvk    BLOB    NOT NULL,               -- XChaCha20-Poly1305(UFVK)
    encryption_nonce BLOB    NOT NULL,               -- 24-byte nonce
    created_at       INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Crypto material to unwrap the DEK (single row). No secret is usable without
-- the OS-keychain master key, which is NOT stored here.
CREATE TABLE vault_meta (
    id               INTEGER PRIMARY KEY CHECK (id = 1),
    wrapped_dek      BLOB    NOT NULL,               -- DEK encrypted under KEK
    wrap_nonce       BLOB    NOT NULL,
    kdf_salt         BLOB    NOT NULL,               -- Argon2id salt
    kdf_mem_kib      INTEGER NOT NULL,
    kdf_iterations   INTEGER NOT NULL,
    kdf_parallelism  INTEGER NOT NULL,
    password_enabled INTEGER NOT NULL DEFAULT 1,
    created_at       INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 1:1 with account.
CREATE TABLE sync_state (
    account_id          INTEGER PRIMARY KEY
                          REFERENCES accounts(id) ON DELETE CASCADE,
    last_scanned_height INTEGER NOT NULL DEFAULT 0,
    last_sync_at        INTEGER,
    status              TEXT    NOT NULL DEFAULT 'idle'
                          CHECK (status IN ('idle','syncing','synced','error')),
    error_message       TEXT
);

-- Non-sensitive app config.
CREATE TABLE settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Cached transactions. Amounts are encrypted; txid/height stay plaintext so the
-- (account_id, txid) uniqueness and height ordering can be enforced/indexed.
CREATE TABLE transactions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    txid         BLOB    NOT NULL,                   -- 32-byte tx hash (public)
    block_height INTEGER,                            -- NULL while in mempool
    block_time   INTEGER,
    is_incoming  INTEGER NOT NULL,
    enc_amounts  BLOB    NOT NULL,                   -- XChaCha20(value_zat,fee_zat)
    enc_nonce    BLOB    NOT NULL,
    created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE (account_id, txid)
);

-- Decrypted notes for balance calc. Note value is encrypted; nullifier stays
-- plaintext for spend detection.
CREATE TABLE notes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    tx_id        INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    pool         TEXT    NOT NULL CHECK (pool IN ('transparent','sapling','orchard')),
    nullifier    BLOB,
    is_spent     INTEGER NOT NULL DEFAULT 0,
    spent_height INTEGER,
    output_index INTEGER,
    enc_value    BLOB    NOT NULL,                   -- XChaCha20(value_zat)
    enc_nonce    BLOB    NOT NULL,
    created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_tx_account_height
    ON transactions(account_id, block_height DESC);
CREATE INDEX idx_notes_account_unspent
    ON notes(account_id) WHERE is_spent = 0;
CREATE INDEX idx_notes_nullifier
    ON notes(nullifier) WHERE nullifier IS NOT NULL;
