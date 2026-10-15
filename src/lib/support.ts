export const SUPPORT_ADDRESS =
  "u1ev2ccxmpu98txsr7tpfrzysjqxmcss62vgy687wrp5jjmp3knw8arz9gazxlk0xsglefpat6lpxrvx87rahpvuueahmsp5n7zcqam4l2";

export function paymentUri(address: string): string {
  return `zcash:${address}`;
}

export const MARK = 6;

export function abbreviate(address: string): { head: string; tail: string } {
  return { head: address.slice(0, 12), tail: address.slice(-12) };
}
