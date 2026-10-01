# The transaction row shows txid and Pools, and status only when Pending

The transaction list row used to carry a Received/Sent word, the amount, a status
badge on every row ("Confirmed" with a check, "Pending" with a spinner), the date and
the block. It never showed the txid or which Pools the transaction touched. It now
reads, left to right: a direction arrow, the signed amount with the Zcash currency
glyph, the truncated txid, the Pools involved, the date, and the block. Confirmed is
the expected state of a transaction, so it gets no mark at all. Pending is the only
status that surfaces, and it takes the block slot, since a pending transaction has no
block yet.

The txid is the one handle a transaction has, and the user asked for it to be always
visible. Pools matter because one transaction can touch several (a Sapling recipient
with Orchard change, a receive split across two receivers), and a row that flattened
that to a single label would misreport the transaction. Pools are drawn as their
names in each pool's identity colour, separated by a comma. Pill components were
rejected for the list.

## Discreet mode covers Pools

Which Pools a wallet moves value through is now hidden with the other sensitive
values. Under Discreet mode each pool name morphs into a 12px grey disc and the discs
gather into a partly stacked row at the cell's left edge, so an onlooker sees only
that a transaction exists and roughly how many pools it touched. The words are real
glyph outlines from Nunito Sans, generated once by `pnpm glyphs` into
`src/components/app/tx-list/pool-glyphs.ts`, and the morph is a point-by-point path
interpolation in `morph.ts`: every letter contour takes its own wedge of the disc and
the counters shrink to the centre. Shape and slide run from one requestAnimationFrame
value over 260ms on one ease-in-out curve, with no stagger, so a toggle reads as one
movement rather than a morph followed by a stack. It is interruptible from wherever
it is. Holding the stack peeks the words, as with every other hidden value.

## Considered options

Ten row shapes were prototyped in storybook, including two-line rows, a left stripe
split by pool value, pool icons as overlapping coins, a path notation
("Orchard → Sapling"), per-pool sub-amounts, a txid-first row, day-grouped rows with
a date gutter, a stacked pool bar, and pool initials. The single dense line won for
scan speed and for keeping the columns aligned across the virtualised list.

For the Discreet transition, a plain crossfade to dots, a slide with a scale-down,
and a gooey SVG filter (blur plus alpha threshold) were tried before the path morph.
The filter fused the glyphs but looked like melting and popped when it switched off.

## Consequences

The pool identity colours now live on `:root` in `index.css` as `--pool-*`, with
`--color-pool-*` aliases for Tailwind, and the Notes dots read them from there. The
Pools page tiles still use their own blue and orange scheme, which is a separate
decision.

The direction word is gone from the list in favour of an arrow with the word as its
accessible label. Notifications still use the words.

The glyph outlines are a generated artifact tied to the bundled Nunito Sans version.
A font upgrade should be followed by `pnpm glyphs`. Only the four pool names are
generated, so a new Pool needs an entry in the script.
