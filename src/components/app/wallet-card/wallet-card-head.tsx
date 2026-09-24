import type { Ref } from "react";
import { IconAlertCircle, IconChevronDown } from "@tabler/icons-react";
import type { WalletState } from "@/lib/ipc";
import { LifeHashIcon } from "@/components/onboarding/lifehash";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { InlineName } from "../inline-name/inline-name";
import {
  WalletContextMenu,
  WalletMenu,
  type WalletMenuTarget,
} from "../wallet-menu/wallet-menu";
import { DiscreetEye } from "../discreet-eye/discreet-eye";

export function selectedDisplayName(wallet: WalletState | null): string {
  const custom = wallet?.label?.trim();
  if (custom) return custom;
  if (wallet?.fingerprint) return wallet.fingerprint.slice(0, 8);
  return "—";
}

function shortFingerprint(fingerprint: string | null): string {
  return fingerprint ? fingerprint.slice(0, 8) : "watch-only";
}

function WalletAvatar({ fingerprint }: { fingerprint: string | null }) {
  const shape = "size-10 rounded-full";
  return fingerprint ? (
    <LifeHashIcon fingerprint={fingerprint} className={shape} />
  ) : (
    <span
      className={`flex items-center justify-center bg-brand text-white ${shape}`}
    >
      <IconWallet className="size-4" />
    </span>
  );
}

import { IconWallet } from "@tabler/icons-react";

export function WalletCardHead({
  ref,
  wallet,
  switching,
  open,
  editing,
  menuTarget,
  onToggle,
  onRename,
  onRemove,
  onClose,
  onCommitRename,
  onCancelRename,
}: {
  ref: Ref<HTMLDivElement>;
  wallet: WalletState | null;
  switching: boolean;
  open: boolean;
  editing: boolean;
  menuTarget: WalletMenuTarget | null;
  onToggle: () => void;
  onRename: () => void;
  onRemove: () => void;
  onClose: () => void;
  onCommitRename: (next: string) => void;
  onCancelRename: () => void;
}) {
  const head = (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-label="Switch wallet"
      onClick={() => !switching && onToggle()}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className="wallet-card-head"
    >
      {switching ? (
        <HeadSkeleton />
      ) : (
        <HeadIdentity
          wallet={wallet}
          editing={editing}
          menuTarget={menuTarget}
          onRename={onRename}
          onRemove={onRemove}
          onClose={onClose}
          onCommitRename={onCommitRename}
          onCancelRename={onCancelRename}
        />
      )}
      <IconChevronDown className="wallet-card-chevron size-4 shrink-0" />
    </div>
  );

  if (!menuTarget) return head;
  return (
    <WalletContextMenu
      wallet={menuTarget}
      onRename={onRename}
      onRemove={onRemove}
      onClose={onClose}
    >
      {head}
    </WalletContextMenu>
  );
}

function HeadSkeleton() {
  return (
    <>
      <Skeleton className="size-10 shrink-0 rounded-full bg-white/10" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3 w-24 bg-white/10" />
        <Skeleton className="h-2.5 w-16 bg-white/10" />
      </div>
    </>
  );
}

function HeadIdentity({
  wallet,
  editing,
  menuTarget,
  onRename,
  onRemove,
  onClose,
  onCommitRename,
  onCancelRename,
}: {
  wallet: WalletState | null;
  editing: boolean;
  menuTarget: WalletMenuTarget | null;
  onRename: () => void;
  onRemove: () => void;
  onClose: () => void;
  onCommitRename: (next: string) => void;
  onCancelRename: () => void;
}) {
  const fingerprint = wallet?.fingerprint ?? null;
  return (
    <>
      <span className="wallet-avatar shrink-0">
        <WalletAvatar fingerprint={fingerprint} />
        {menuTarget && (
          <span className="wallet-avatar-overlay">
            <WalletMenu
              wallet={menuTarget}
              onRename={onRename}
              onRemove={onRemove}
              onClose={onClose}
            />
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {editing ? (
            <InlineName
              value={wallet?.label ?? ""}
              placeholder={shortFingerprint(fingerprint)}
              className="wallet-rename wallet-rename-head"
              onCommit={onCommitRename}
              onCancel={onCancelRename}
            />
          ) : (
            <p className="wallet-card-name truncate">
              {selectedDisplayName(wallet)}
            </p>
          )}
          <span onClick={(e) => e.stopPropagation()}>
            <DiscreetEye />
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="wallet-card-fp truncate">
            {shortFingerprint(fingerprint)}
          </span>
          {wallet?.unavailable && (
            <IconAlertCircle
              className="size-3.5 shrink-0 text-red-400"
              aria-label="Unavailable"
            />
          )}
        </div>
      </div>
    </>
  );
}
