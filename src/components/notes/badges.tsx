import type { NoteStatus, Pool } from "@/lib/ipc";
import "./notes.css";

export function PoolBadge({ pool }: { pool: Pool }) {
  return <span className={`note-badge note-badge--${pool}`}>{pool}</span>;
}

export function StatusBadge({ status }: { status: NoteStatus }) {
  return <span className={`note-badge note-badge--${status}`}>{status}</span>;
}

export function ChangeBadge() {
  return <span className="note-badge note-badge--change">change</span>;
}

export function MempoolBadge() {
  return <span className="note-badge note-badge--mempool">mempool</span>;
}

export function PoolDot({ pool }: { pool: Pool }) {
  return <span className={`pool-dot pool-dot--${pool}`} aria-hidden />;
}
