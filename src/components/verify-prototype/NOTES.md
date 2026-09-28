# Verify tab prototype

Throwaway. Delete this folder, `src/routes/verify-prototype.tsx`, the `verify`
feature flag and the `/verify` routes once the question below has an answer.

## Question

What should a transaction verifier look like inside Pendrake? The verifier takes a
transaction (a txid the Indexer can serve, or pasted raw hex) and a key (the
Wallet's own outgoing viewing keys, a pasted OVK, or a per-output OCK someone
handed over as proof of one payment), walks every shielded output through the
OCK pipeline (derive OCK, open out_ciphertext, open enc_ciphertext, parse, ZIP 212
esk check, commitment check, ephemeral key check), and reports which outputs
were recovered and where the rest stopped.

Three layouts, on `/verify` behind Settings → Experimental → Verify, switchable
with `?variant=a|b|c` or the yellow bar at the bottom (dev builds only):

- A, Ledger: form on top, one dense row per output, rows expand for the hex.
- B, Pipeline: inputs in a left rail, each output drawn as a seven-step track with
  the failing step marked.
- C, Receipt: verdict first, recovered payments as a receipt with a copyable OCK
  per line, unrecovered outputs folded away.

Every variant has a Detach button that opens the same page in its own window
(`/verify-window`, no sidebar). The detached window starts blank: state is in
memory and not carried across.

All results come from `mock.ts`. Nothing calls the daemon.

## Answer

_(fill in: which variant, what to steal from the others, whether detach earns
its place)_
