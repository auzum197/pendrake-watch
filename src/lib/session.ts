// In-memory passphrase for the current run. The daemon has no encryption or
// password store yet, so this only backs the lock/unlock UI within a session and
// is gone on restart. The real model (docs/adr/0003) hands the passphrase to the
// engine, which Argon2-encrypts the wallet and stays locked until it's supplied.
let passphrase: string | null = null;

export function setSessionPassphrase(pw: string) {
  passphrase = pw;
}

export function clearSessionPassphrase() {
  passphrase = null;
}

// No stored passphrase (a fresh process) can't be checked, so it accepts. Once a
// passphrase was set this run, unlock must match it.
export function verifySessionPassphrase(pw: string): boolean {
  return passphrase === null || passphrase === pw;
}
