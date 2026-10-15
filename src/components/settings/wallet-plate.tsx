import { useState, type CSSProperties } from "react";
import {
  IconArrowsExchange,
  IconPencil,
  IconRefresh,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button/button";
import { Switch } from "@/components/ui/switch/switch";
import { DiscreetValue } from "@/components/ui/discreet-value/discreet-value";
import { LifeHashAvatar } from "@/components/onboarding/lifehash-avatar";
import { lifehashAccent } from "@/components/onboarding/lifehash";
import { InlineName } from "@/components/app/inline-name/inline-name";
import { switchWallet } from "@/components/app/wallet-card/switch-wallet";
import { appToast } from "@/components/app/app-toast/app-toast";
import { setCachedWallet } from "@/hooks/use-wallet-data";
import {
  setNotifications,
  setWalletLabel,
  type WalletSummary,
} from "@/lib/ipc";
import { formatZec } from "@/lib/format";
import { RemoveDialog } from "./remove-dialog";
import { RescanDialog } from "./rescan-dialog";
import { UfvkReveal } from "./ufvk-reveal";
import "./wallets.css";

function ringTone(wallet: WalletSummary): string | undefined {
  if (wallet.unavailable) return "bad";
  if (wallet.sync?.state === "error") return "warn";
  return undefined;
}

function customLabel(wallet: WalletSummary): string {
  const short = wallet.fingerprint ? wallet.fingerprint.slice(0, 8) : "";
  const named = wallet.fingerprint
    ? wallet.label !== short
    : wallet.label.length > 0;
  return named ? wallet.label : "";
}

export function WalletPlate({
  wallet,
  onChanged,
}: {
  wallet: WalletSummary;
  onChanged: () => void;
}) {
  const fp = wallet.fingerprint;
  const accent = fp ? lifehashAccent(fp) : "var(--color-brand)";
  const percent = wallet.unavailable
    ? 0
    : Math.min(100, wallet.sync?.percent ?? 0);
  const [rescanning, setRescanning] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function rename(next: string) {
    const label = next.trim();
    if (label === customLabel(wallet)) return;
    try {
      const state = await setWalletLabel(wallet.id, label);
      if (wallet.selected) setCachedWallet(state);
      onChanged();
    } catch (e) {
      appToast.error("Couldn't rename this Wallet", String(e));
    }
  }

  async function use() {
    await switchWallet(wallet.id);
    onChanged();
  }

  return (
    <div
      className="plate"
      style={{ "--accent": accent, "--pct": percent } as CSSProperties}
    >
      <PlateHero wallet={wallet} onRename={rename} />
      <PlateBand wallet={wallet} />
      <UfvkReveal walletId={wallet.id} network={wallet.network} />
      <PlateActions
        wallet={wallet}
        onUse={() => void use()}
        onRescan={() => setRescanning(true)}
        onRemove={() => setRemoving(true)}
      />

      <RescanDialog
        open={rescanning}
        onOpenChange={setRescanning}
        walletId={wallet.id}
        birthdayHeight={wallet.birthdayHeight}
        onQueued={onChanged}
      />

      <RemoveDialog
        open={removing}
        onOpenChange={(next) => {
          setRemoving(next);
          if (!next) onChanged();
        }}
        walletId={wallet.id}
        fingerprint={fp}
        network={wallet.network}
      />
    </div>
  );
}

function PlateHero({
  wallet,
  onRename,
}: {
  wallet: WalletSummary;
  onRename: (next: string) => void;
}) {
  const fp = wallet.fingerprint;
  const short = fp ? fp.slice(0, 8) : "";
  const custom = customLabel(wallet);
  const groups = fp ? (fp.slice(0, 32).match(/.{1,4}/g) ?? []) : [];
  const [editing, setEditing] = useState(false);

  return (
    <div className="plate-hero">
      <div className="plate-ring" data-tone={ringTone(wallet)}>
        <svg viewBox="0 0 100 100" aria-hidden>
          <circle className="plate-ring-track" cx="50" cy="50" r="46" />
          <circle className="plate-ring-arc" cx="50" cy="50" r="46" />
        </svg>
        {fp && (
          <LifeHashAvatar fingerprint={fp} className="size-20 rounded-full" />
        )}
      </div>

      {editing ? (
        <InlineName
          value={custom}
          placeholder={short}
          className="plate-name plate-name-input"
          onCommit={(next) => {
            setEditing(false);
            onRename(next);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <button
          type="button"
          className="plate-name-btn group/name"
          title="Rename"
          onClick={() => setEditing(true)}
        >
          <span className={`plate-name ${custom ? "" : "font-mono"}`}>
            {wallet.label}
          </span>
          <IconPencil className="plate-name-pencil size-4 text-muted-foreground opacity-0 transition-opacity group-hover/name:opacity-100 group-focus-visible/name:opacity-100" />
        </button>
      )}

      {fp && (
        <p className="plate-strip select-text" aria-label={fp}>
          {groups.map((group, i) => (
            <span key={i}>{group}</span>
          ))}
        </p>
      )}

      <p className="plate-meta capitalize">{wallet.network}</p>
    </div>
  );
}

function PlateBand({ wallet }: { wallet: WalletSummary }) {
  return (
    <dl className="plate-band">
      <div>
        <dt>Balance</dt>
        <dd className="tabular-nums">
          {wallet.lastBalance == null ? (
            "—"
          ) : (
            <>
              <DiscreetValue kind="zec">
                {formatZec(BigInt(wallet.lastBalance))}
              </DiscreetValue>
              <span className="ml-1 text-xs text-muted-foreground">ZEC</span>
            </>
          )}
        </dd>
      </div>
      <div>
        <dt>Birthday</dt>
        <dd className="tabular-nums">
          {wallet.birthdayHeight.toLocaleString()}
        </dd>
      </div>
      <div>
        <dt>Indexer</dt>
        <dd className="font-mono text-xs">
          {wallet.indexerUri?.replace(/^[a-z]+:\/\//, "") || "—"}
        </dd>
      </div>
    </dl>
  );
}

function PlateActions({
  wallet,
  onUse,
  onRescan,
  onRemove,
}: {
  wallet: WalletSummary;
  onUse: () => void;
  onRescan: () => void;
  onRemove: () => void;
}) {
  const [alerts, setAlerts] = useState(wallet.notificationsEnabled ?? true);

  async function toggleAlerts(next: boolean) {
    setAlerts(next);
    try {
      const state = await setNotifications(next, wallet.id);
      if (wallet.selected) setCachedWallet(state);
    } catch {
      setAlerts(!next);
    }
  }

  return (
    <div className="plate-actions">
      {!wallet.selected && (
        <Button variant="outline" size="sm" onClick={onUse}>
          <IconArrowsExchange data-icon="inline-start" />
          Use this Wallet
        </Button>
      )}
      {!wallet.unavailable && (
        <Button variant="outline" size="sm" onClick={onRescan}>
          <IconRefresh data-icon="inline-start" />
          Rescan…
        </Button>
      )}
      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={alerts}
          onCheckedChange={(on) => void toggleAlerts(on)}
          aria-label="Transaction alerts"
        />
        Alerts
      </label>
      <Button
        variant="destructive"
        size="sm"
        className="ml-auto"
        onClick={onRemove}
      >
        Remove…
      </Button>
    </div>
  );
}
