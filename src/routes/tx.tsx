import { useEffect, useState } from "react";
import {
  useCanGoBack,
  useParams,
  useRouter,
} from "@tanstack/react-router";
import { IconArrowLeft } from "@tabler/icons-react";
import { getTransaction, onSyncEvent, type Note, type Tx } from "@/lib/ipc";
import { formatZec, splitAddress } from "@/lib/format";
import { getCachedTx } from "@/hooks/use-wallet-data";
import { flagReturnRow } from "@/components/app/return-flash";
import { animationsEnabled } from "@/lib/motion";
import "@/components/app/reveal.css";

// Steps between staggered reveals, matching the transaction list's cascade.
const STAGGER_MS = 40;

// The detail view's entrance reveals, gated on the motion preference and read at call
// time so the Settings toggle applies on the next open. When off, every element renders
// in place with no stagger.
const revealClass = () => (animationsEnabled() ? "reveal-up" : "");
const revealDelay = (ms: number) =>
  animationsEnabled() ? { animationDelay: `${ms}ms` } : undefined;

export function TxDetailPage() {
  const { txid } = useParams({ strict: false }) as { txid: string };
  const router = useRouter();
  const canGoBack = useCanGoBack();
  // Seed from the list snapshot already in memory so a click renders the detail
  // at once; the cached Tx carries its notes. A cold deep-link has no cache hit
  // and falls back to the fetch-and-poll below.
  const [tx, setTx] = useState<Tx | null>(() => getCachedTx(txid));
  const [loading, setLoading] = useState(() => getCachedTx(txid) === null);

  // Flag this row so the list flashes it on arrival, then return to wherever the
  // detail was opened from. A real history pop lets scroll restoration put the
  // list back at its offset; a cold deep-link open has nothing to pop, so fall
  // back to the dashboard.
  const goBack = () => {
    flagReturnRow(txid);
    if (canGoBack) router.history.back();
    else router.navigate({ to: "/dashboard" });
  };

  useEffect(() => {
    let active = true;
    async function find() {
      const found = await getTransaction(txid).catch(() => null);
      if (!active) return;
      // Keep a cache-seeded render if the daemon hasn't repopulated it yet, so a
      // background refetch never blanks a tx that's already on screen.
      if (found) setTx(found);
      setLoading(false);
      return found != null;
    }
    // Refresh in the background even on a cache hit, so a confirmed/updated tx
    // reflects the latest daemon state.
    find();
    const hadCacheHit = getCachedTx(txid) !== null;
    // Only a cold open (no cache hit) needs the discovery listener and poll: the
    // daemon may still be repopulating, so retry until the tx resolves.
    if (hadCacheHit) {
      return () => {
        active = false;
      };
    }
    const unlisten = onSyncEvent((ev) => {
      if (active && (ev.event === "transaction" || ev.event === "finished")) {
        find();
      }
    });
    const timer = setInterval(() => {
      find().then((done) => {
        if (done) clearInterval(timer);
      });
    }, 2000);
    return () => {
      active = false;
      clearInterval(timer);
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [txid]);

  const received = tx?.kind === "received";
  const byIndex = (a: Note, b: Note) => a.outputIndex - b.outputIndex;
  const receivedNotes = tx?.notes.filter((n) => n.direction === "received").sort(byIndex) ?? [];
  const sentNotes = tx?.notes.filter((n) => n.direction === "sent").sort(byIndex) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <button
        type="button"
        onClick={goBack}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconArrowLeft className="size-4" />
        Back
      </button>

      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {tx ? (received ? "Received" : "Sent") : "Transaction"}
        </h1>
        {tx && (
          <span
            className={`${revealClass()} font-heading text-3xl font-semibold tabular-nums ${received ? "text-green-600 dark:text-green-400" : ""}`}
          >
            {received ? "+" : "−"}
            {formatZec(BigInt(tx.valueZat))} ZEC
          </span>
        )}
      </header>

      {loading && !tx && (
        <p className="text-sm text-muted-foreground">Looking up transaction…</p>
      )}

      {!loading && !tx && (
        <p className="text-sm text-muted-foreground">
          This transaction isn't in the wallet yet. It may still be syncing.
        </p>
      )}

      {tx && (
        <dl
          className={`${revealClass()} grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm`}
          style={revealDelay(STAGGER_MS)}
        >
          <dt className="text-muted-foreground">Status</dt>
          <dd className="capitalize">{tx.status}</dd>
          <dt className="text-muted-foreground">Block</dt>
          <dd className="tabular-nums">
            {tx.blockHeight?.toLocaleString() ?? "pending"}
          </dd>
          <dt className="text-muted-foreground">Date</dt>
          <dd>{new Date(tx.datetime * 1000).toLocaleString()}</dd>
          <dt className="self-start text-muted-foreground">Txid</dt>
          <dd className="break-all font-mono text-xs">{tx.txid}</dd>
        </dl>
      )}

      {tx && (
        <>
          {/* Payment leads, change trails. On a Receive the recipient group is
              empty (renders nothing) and only the received notes show. The
              output back to this wallet is the change on a Send, the received
              funds on a Receive, so the label follows the direction. Both are
              created outputs; the consumed inputs land with AUZ-109. */}
          <NoteSection
            title="Sent to recipient"
            notes={sentNotes}
            baseDelay={2 * STAGGER_MS}
          />
          <NoteSection
            title={received ? "Received" : "Change received"}
            notes={receivedNotes}
            baseDelay={3 * STAGGER_MS}
          />
        </>
      )}

      <a
        href={`https://cipherscan.app/tx/${txid}`}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        View on block explorer
      </a>
    </div>
  );
}

function NoteSection({
  title,
  notes,
  baseDelay,
}: {
  title: string;
  notes: Note[];
  baseDelay: number;
}) {
  if (notes.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <ul className="flex flex-col gap-2">
        {notes.map((note, i) => (
          <li
            key={`${note.direction}-${note.pool}-${note.outputIndex}`}
            className={`${revealClass()} rounded-xl border border-border bg-card p-3`}
            style={revealDelay(baseDelay + i * STAGGER_MS)}
          >
            <NoteCard note={note} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function NoteCard({ note }: { note: Note }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
          {note.pool}
        </span>
        <span className="font-mono text-sm tabular-nums">
          {formatZec(BigInt(note.valueZat))} ZEC
        </span>
      </div>
      {note.recipient && (
        <p className="text-xs text-muted-foreground">
          To <Address value={note.recipient} />
        </p>
      )}
      {note.memo && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Memo</span>
          <p className="whitespace-pre-wrap wrap-break-word rounded-lg bg-muted/60 px-3 py-2 text-sm text-foreground">
            {note.memo}
          </p>
        </div>
      )}
    </div>
  );
}

// The recipient address, with its encoding prefix (the "u1" / "zs" human-readable
// part) set apart from the clipped data body so the eye lands on the part that
// distinguishes one address from another.
function Address({ value }: { value: string }) {
  const { prefix, head, tail } = splitAddress(value);
  return (
    <span className="break-all font-mono" title={value}>
      <span className="text-brand">{prefix}</span>
      <span className="text-foreground">{head}</span>
      {tail && (
        <>
          <span className="text-muted-foreground">…</span>
          <span className="text-foreground">{tail}</span>
        </>
      )}
    </span>
  );
}
