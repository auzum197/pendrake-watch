import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import { IconPlus } from "@tabler/icons-react";
import {
  listWallets,
  onSyncEvent,
  setWalletLabel,
  type Network,
  type WalletState,
  type WalletSummary,
} from "@/lib/ipc";
import { orderWallets } from "@/lib/wallet-recency";
import { openWalletPalette } from "@/lib/wallet-palette";
import { setCachedWallet } from "@/hooks/use-wallet-data";
import { Kbd, MOD_KEY } from "@/components/ui/kbd/kbd";
import { RemoveDialog } from "@/components/settings/remove-dialog";
import type { WalletMenuTarget } from "../wallet-menu/wallet-menu";
import { appToast } from "../app-toast/app-toast";
import { switchWallet } from "./switch-wallet";
import { useFold, useHeight } from "./use-fold";
import { WalletCardHead, selectedDisplayName } from "./wallet-card-head";
import { WalletCardList } from "./wallet-card-list";
import "./wallet-card.css";
import "../wallet-menu/wallet-menu.css";

type RemoveTarget = {
  id: string;
  fingerprint: string | null;
  network: Network;
};

const HEAD_FALLBACK_PX = 72;

export function WalletCard({
  wallet,
  switching = false,
}: {
  wallet: WalletState | null;
  switching?: boolean;
}) {
  const navigate = useNavigate();
  const [wallets, setWallets] = useState<WalletSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<RemoveTarget | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const slabRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { open, animate, settle, toggle } = useFold(slabRef);
  const headH = useHeight(headRef) || HEAD_FALLBACK_PX;
  const bodyH = useHeight(contentRef);

  function reload() {
    listWallets()
      .then(setWallets)
      .catch(() => setWallets([]));
  }

  useEffect(() => {
    if (!open) return;
    reload();
    const unlisten = onSyncEvent((ev) => {
      if (ev.event === "finished" || ev.event === "transaction") reload();
    });
    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [open, wallet?.walletId, wallet?.fingerprint, wallet?.label]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target instanceof Element ? e.target : null;
      if (!target || rootRef.current?.contains(target)) return;
      if (target.closest("[data-wallet-menu]")) return;
      settle(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") settle(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  const close = () => settle(false);

  async function onPick(id: string) {
    settle(false);
    if (busy || id === wallet?.walletId) return;
    setBusy(true);
    try {
      await switchWallet(id);
    } finally {
      setBusy(false);
    }
  }

  function askRemove(target: RemoveTarget) {
    setRemoving(target);
    setRemoveOpen(true);
  }

  async function commitRename(id: string, before: string, after: string) {
    setEditingId(null);
    const label = after.trim();
    if (label === before) return;
    try {
      const state = await setWalletLabel(id, label);
      if (id === wallet?.walletId) setCachedWallet(state);
      reload();
    } catch (e) {
      appToast.error("Couldn't rename Wallet", String(e));
    }
  }

  function onAdd() {
    settle(false);
    navigate({ to: "/onboarding", search: { mode: "add" } });
  }

  function onSearch() {
    settle(false);
    openWalletPalette();
  }

  const headId = wallet?.walletId ?? null;
  const headTarget: WalletMenuTarget | null =
    headId && !switching
      ? { id: headId, label: selectedDisplayName(wallet), selected: true }
      : null;
  const others = orderWallets(wallets, headId).filter((w) => !w.selected);

  return (
    <div ref={rootRef} className="wallet-card" style={{ height: headH }}>
      <div
        ref={slabRef}
        className="wallet-card-slab"
        data-open={open}
        data-reduced={animate ? undefined : ""}
        style={{ "--body-h": `${bodyH}px` } as CSSProperties}
      >
        <WalletCardHead
          ref={headRef}
          wallet={wallet}
          switching={switching}
          open={open}
          editing={headId !== null && editingId === headId}
          menuTarget={headTarget}
          onToggle={toggle}
          onRename={() => setEditingId(headId)}
          onRemove={() =>
            headId &&
            askRemove({
              id: headId,
              fingerprint: wallet?.fingerprint ?? null,
              network: wallet?.network ?? "mainnet",
            })
          }
          onClose={close}
          onCommitRename={(next) =>
            headId && commitRename(headId, wallet?.label ?? "", next)
          }
          onCancelRename={() => setEditingId(null)}
        />

        <div className="wallet-card-body" inert={!open}>
          <div ref={contentRef} className="wallet-card-content">
            <WalletCardList
              wallets={others}
              loading={wallets.length === 0}
              busy={busy}
              editingId={editingId}
              onPick={onPick}
              onRename={setEditingId}
              onRemove={(w) =>
                askRemove({
                  id: w.id,
                  fingerprint: w.fingerprint,
                  network: w.network,
                })
              }
              onClose={close}
              onCommitRename={commitRename}
              onCancelRename={() => setEditingId(null)}
            />
            <div
              className="wallet-card-foot fold-item"
              style={{ "--i": Math.max(others.length, 1) } as CSSProperties}
            >
              <button
                type="button"
                disabled={busy}
                onClick={onAdd}
                className="wallet-card-add"
              >
                <IconPlus className="size-4" />
                Add wallet
              </button>
              <button
                type="button"
                onClick={onSearch}
                className="wallet-card-search"
              >
                Search
                <Kbd>{MOD_KEY}K</Kbd>
              </button>
            </div>
          </div>
        </div>
      </div>

      <RemoveDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        walletId={removing?.id ?? null}
        fingerprint={removing?.fingerprint ?? null}
        network={removing?.network ?? "mainnet"}
      />
    </div>
  );
}
