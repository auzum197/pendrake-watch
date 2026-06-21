// One-shot handoff from a transaction's detail view back to the list it came
// from. On Back the detail flags its txid; the list reads it once on mount to
// highlight that row and skip the entrance cascade. Scroll restoration already
// returns the list to its offset, so this just lands the eye on the row the
// user opened rather than replaying the whole list arriving.
let flagged: string | null = null;

export function flagReturnRow(txid: string) {
  flagged = txid;
}

export function takeReturnRow(): string | null {
  const txid = flagged;
  flagged = null;
  return txid;
}
