import type { CSSProperties } from "react";
import type { WalletSummary } from "@/lib/ipc";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { InlineName } from "../inline-name/inline-name";
import { WalletRow } from "../wallet-row/wallet-row";
import { WalletContextMenu, WalletMenu } from "../wallet-menu/wallet-menu";

function customLabel(wallet: WalletSummary): string {
  const fp = wallet.fingerprint ? wallet.fingerprint.slice(0, 8) : null;
  return wallet.label === fp ? "" : wallet.label;
}

export function WalletCardList({
  wallets,
  loading,
  busy,
  editingId,
  onPick,
  onRename,
  onRemove,
  onClose,
  onCommitRename,
  onCancelRename,
}: {
  wallets: WalletSummary[];
  loading: boolean;
  busy: boolean;
  editingId: string | null;
  onPick: (id: string) => void;
  onRename: (id: string) => void;
  onRemove: (wallet: WalletSummary) => void;
  onClose: () => void;
  onCommitRename: (id: string, before: string, after: string) => void;
  onCancelRename: () => void;
}) {
  if (loading) {
    return (
      <div
        className="fold-item flex items-center gap-3 px-4 py-2.5"
        style={{ "--i": 0 } as CSSProperties}
      >
        <Skeleton className="size-9 shrink-0 rounded-full bg-white/10" />
        <Skeleton className="h-3 w-24 bg-white/10" />
      </div>
    );
  }
  if (wallets.length === 0) {
    return (
      <p
        className="fold-item px-4 py-3 text-xs text-white/50"
        style={{ "--i": 0 } as CSSProperties}
      >
        No other wallets
      </p>
    );
  }
  return (
    <ul
      role="listbox"
      aria-label="Other wallets"
      className="max-h-72 divide-y divide-white/[0.06] overflow-y-auto"
    >
      {wallets.map((w, i) => (
        <WalletCardItem
          key={w.id}
          wallet={w}
          index={i}
          busy={busy}
          editing={editingId === w.id}
          onPick={onPick}
          onRename={() => onRename(w.id)}
          onRemove={() => onRemove(w)}
          onClose={onClose}
          onCommitRename={(next) => onCommitRename(w.id, customLabel(w), next)}
          onCancelRename={onCancelRename}
        />
      ))}
    </ul>
  );
}

function WalletCardItem({
  wallet,
  index,
  busy,
  editing,
  onPick,
  onRename,
  onRemove,
  onClose,
  onCommitRename,
  onCancelRename,
}: {
  wallet: WalletSummary;
  index: number;
  busy: boolean;
  editing: boolean;
  onPick: (id: string) => void;
  onRename: () => void;
  onRemove: () => void;
  onClose: () => void;
  onCommitRename: (next: string) => void;
  onCancelRename: () => void;
}) {
  return (
    <WalletContextMenu
      wallet={wallet}
      onRename={onRename}
      onRemove={onRemove}
      onClose={onClose}
    >
      <WalletRow
        wallet={wallet}
        disabled={busy}
        onPick={editing ? () => {} : onPick}
        className="fold-item"
        style={{ "--i": index } as CSSProperties}
        name={
          editing ? (
            <InlineName
              value={customLabel(wallet)}
              placeholder={
                wallet.fingerprint
                  ? wallet.fingerprint.slice(0, 8)
                  : wallet.label
              }
              className="wallet-rename"
              onCommit={onCommitRename}
              onCancel={onCancelRename}
            />
          ) : undefined
        }
        avatarOverlay={
          editing ? undefined : (
            <WalletMenu
              wallet={wallet}
              onRename={onRename}
              onRemove={onRemove}
              onClose={onClose}
            />
          )
        }
      />
    </WalletContextMenu>
  );
}
