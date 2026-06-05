/**
 * Zcash amount helpers. Amounts cross the IPC boundary as decimal strings of
 * zatoshis; we parse them with `BigInt` to avoid floating-point precision loss.
 */

export const ZATOSHIS_PER_ZEC = 100_000_000n;

/** Mask shown when the user hides their balance. */
export const HIDDEN_AMOUNT = "$•••••••";

/**
 * Format a zatoshi string as a human ZEC amount, e.g. "1225000000" -> "12.25".
 * Trailing zeros in the fractional part are trimmed; whole amounts show no
 * decimals.
 */
export function zatoshisToZec(zatoshis: string, opts?: { maxFractionDigits?: number }): string {
  const max = opts?.maxFractionDigits ?? 8;
  let value: bigint;
  try {
    value = BigInt(zatoshis);
  } catch {
    return "0";
  }

  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / ZATOSHIS_PER_ZEC;
  const frac = abs % ZATOSHIS_PER_ZEC;

  let fracStr = frac.toString().padStart(8, "0").slice(0, max).replace(/0+$/, "");
  const sign = negative ? "-" : "";
  return fracStr.length > 0 ? `${sign}${whole}.${fracStr}` : `${sign}${whole}`;
}

/** Convenience: format with the " ZEC" suffix. */
export function formatZec(zatoshis: string): string {
  return `${zatoshisToZec(zatoshis)} ZEC`;
}
