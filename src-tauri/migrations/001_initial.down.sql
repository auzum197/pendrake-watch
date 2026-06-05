-- Rollback of 001_initial.up.sql
DROP INDEX IF EXISTS idx_notes_nullifier;
DROP INDEX IF EXISTS idx_notes_account_unspent;
DROP INDEX IF EXISTS idx_tx_account_height;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS sync_state;
DROP TABLE IF EXISTS vault_meta;
DROP TABLE IF EXISTS viewing_keys;
DROP TABLE IF EXISTS accounts;
