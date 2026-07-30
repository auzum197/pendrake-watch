import { useEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  IconAlertTriangle,
  IconBell,
  IconCircleCheck,
  IconCurrencyDollar,
  IconEyeOff,
  IconFlask,
  IconServer2,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { IndexerPicker } from "@/components/indexer/indexer-picker";
import { ReplaceDialog } from "@/components/settings/replace-dialog";
import { useWalletData } from "@/hooks/use-wallet-data";
import {
  CUSTOM_INDEXER,
  indexerReady,
  resolveIndexer,
} from "@/lib/indexer";
import {
  MAINNET_INDEXERS,
  setFiatEnabled,
  setIndexer,
  setNotifications,
  type Network,
} from "@/lib/ipc";
import { toggleDiscreet, useDiscreet } from "@/lib/discreet";
import { reduceMotion, setReduceMotion } from "@/lib/motion";
import { FEATURES, setEnabled, useFeature } from "@/lib/features";

// Settings, with the current Wallet's identity, the Indexer it syncs against, and a
// danger zone for Replace.
export function SettingsPage() {
  const { hash } = useLocation();
  const { wallet } = useWalletData();
  const [replacing, setReplacing] = useState(false);

  return (
    <>
      <h1 className="font-heading text-xl font-bold">Settings</h1>

      {wallet?.exists && (
        <NotificationsSection
          key={`notify-${wallet.fingerprint ?? "wallet"}`}
          enabled={wallet.notificationsEnabled}
        />
      )}

      {wallet?.exists && (
        <FiatSection
          key={`fiat-${wallet.fingerprint ?? "wallet"}`}
          enabled={wallet.fiatEnabled ?? false}
        />
      )}

      {wallet?.exists && <DiscreetSection />}

      {wallet?.exists && (
        <IndexerSection
          key={wallet.fingerprint ?? "wallet"}
          network={wallet.network}
          current={wallet.indexerUri}
          focusOnMount={hash === "indexer"}
        />
      )}

      <ExperimentalSection />

      <section className="rounded-2xl border border-destructive/30 bg-destructive/[0.03] p-6">
        <div className="flex items-center gap-2 text-destructive">
          <IconAlertTriangle className="size-4" />
          <h2 className="font-heading text-base font-semibold">Danger zone</h2>
        </div>
        <div className="mt-4 flex items-start justify-between gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              Replace Wallet
            </span>
            <span className="text-sm text-muted-foreground">
              Import a different UFVK in place of this one. Erases the current
              Wallet's identity and history. This can't be undone.
            </span>
          </div>
          <Button
            variant="destructive"
            className="shrink-0"
            onClick={() => setReplacing(true)}
          >
            Replace…
          </Button>
        </div>
      </section>

      <ReplaceDialog
        open={replacing}
        onOpenChange={setReplacing}
        fingerprint={wallet?.fingerprint ?? null}
        network={wallet?.network ?? "mainnet"}
      />
    </>
  );
}

// The desktop-notification toggle (ADR-0006). The daemon persists the choice and is
// the source of truth, so the switch tracks local state optimistically and reverts
// if the call fails. Transaction and "scan finished" toasts are gated; the
// "Indexer unreachable" alert keeps firing regardless.
function NotificationsSection({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);

  async function toggle(next: boolean) {
    setOn(next);
    setBusy(true);
    try {
      const state = await setNotifications(next);
      setOn(state.notificationsEnabled);
    } catch {
      setOn(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <IconBell className="size-4 text-muted-foreground" />
        <h2 className="font-heading text-base font-semibold">Notifications</h2>
      </div>
      <div className="mt-4 flex items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            Transaction alerts
          </span>
          <span className="text-sm text-muted-foreground">
            A desktop notification when funds arrive or leave, and once the
            initial scan finishes. Connectivity warnings are always shown.
          </span>
        </div>
        <Switch
          checked={on}
          disabled={busy}
          onCheckedChange={toggle}
          aria-label="Transaction notifications"
        />
      </div>
    </section>
  );
}

// The fiat price toggle (docs/adr/0008). Turning it off stops all price egress; turning
// it on here (rather than through the chart's consent modal) still records the same
// consent, since the switch is an explicit opt-in. The daemon persists the choice.
function FiatSection({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);

  async function toggle(next: boolean) {
    setOn(next);
    setBusy(true);
    try {
      const state = await setFiatEnabled(next);
      setOn(state.fiatEnabled ?? false);
    } catch {
      setOn(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <IconCurrencyDollar className="size-4 text-muted-foreground" />
        <h2 className="font-heading text-base font-semibold">Fiat price</h2>
      </div>
      <div className="mt-4 flex items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            Show USD values
          </span>
          <span className="text-sm text-muted-foreground">
            Prices your balance in USD using third-party price data (CoinGecko,
            Coinbase, Kraken). Off means no price requests leave your device. Your
            balance always shows in ZEC regardless.
          </span>
        </div>
        <Switch
          checked={on}
          disabled={busy}
          onCheckedChange={toggle}
          aria-label="Fiat price display"
        />
      </div>
    </section>
  );
}

// The Discreet mode mirror (docs/adr/0009). Unlike the sections above, the switch
// reads the shared store instead of local state: the sidebar eye writes the same
// flag, and both surfaces must move together the instant either one flips. The
// store already does the optimistic flip and revert.
function DiscreetSection() {
  const on = useDiscreet();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await toggleDiscreet();
    setBusy(false);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <IconEyeOff className="size-4 text-muted-foreground" />
        <h2 className="font-heading text-base font-semibold">Discreet mode</h2>
      </div>
      <div className="mt-4 flex items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            Hide sensitive values
          </span>
          <span className="text-sm text-muted-foreground">
            Masks balances, amounts, dates and transaction identifiers across the
            app, and drops the amount from new-transaction notifications. The eye
            in the sidebar does the same; hold it to peek.
          </span>
        </div>
        <Switch
          checked={on}
          disabled={busy}
          onCheckedChange={toggle}
          aria-label="Discreet mode"
        />
      </div>
    </section>
  );
}

// Per-device toggles (not daemon-backed): each flips a UI/device choice, not wallet
// state, so they live in localStorage. The registered features gate in-progress UI.
// Reduce motion is a settled accessibility preference that rides along here since it's
// the same kind of switch. Both apply live, no reload.
function ExperimentalSection() {
  return (
    <section className="rounded-2xl border border-amber-400/30 bg-amber-400/6 p-6">
      <div className="flex items-center gap-2 text-amber-300">
        <IconFlask className="size-4" />
        <h2 className="font-heading text-base font-semibold">Experimental</h2>
      </div>
      <p className="mt-1 text-sm text-amber-200/60">
        Device-only toggles that aren't stable yet. They may change or disappear
        between releases.
      </p>
      <div className="mt-4 flex flex-col gap-5 pl-5">
        {FEATURES.map((feature) => (
          <FeatureToggle key={feature.id} feature={feature} />
        ))}
        <ReduceMotionToggle />
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function FeatureToggle({ feature }: { feature: (typeof FEATURES)[number] }) {
  const on = useFeature(feature.id);
  return (
    <ToggleRow
      label={feature.label}
      description={feature.description}
      checked={on}
      onChange={(next) => setEnabled(feature.id, next)}
    />
  );
}

// The switch follows the OS reduce-motion setting until set here, where an explicit
// choice persists and wins. It governs the entrance animations, which fire on mount, so
// a change shows on the next screen opened.
function ReduceMotionToggle() {
  const [reduced, setReduced] = useState(reduceMotion);

  function toggle(next: boolean) {
    setReduceMotion(next);
    setReduced(next);
  }

  return (
    <ToggleRow
      label="Reduce motion"
      description="Turn off the entrance animations when screens and transactions load. Follows your system setting until you choose here."
      checked={reduced}
      onChange={toggle}
    />
  );
}

type SaveStatus = "idle" | "connecting" | "saved" | "error";

// The Indexer the Wallet syncs against, changed here rather than on Home (AUZ-47).
// Mainnet offers the curated zec.rocks region list plus a custom entry; regtest has
// no public default, so it only takes a custom Indexer. Save is connect-then-persist:
// the daemon dials the chosen Indexer before writing it, so a visible "Connecting…"
// step gates the change and an unreachable or malformed URL is rejected without
// disturbing the current one. Mounted only once the wallet has loaded and keyed by
// fingerprint, so `current` is the real value at first render.
function IndexerSection({
  network,
  current,
  focusOnMount,
}: {
  network: Network;
  current: string;
  focusOnMount: boolean;
}) {
  const isMainnet = network === "mainnet";
  const preset = isMainnet
    ? MAINNET_INDEXERS.find((p) => p.uri === current)
    : undefined;

  // Selection is a preset URI or the custom sentinel. Regtest is always custom. A
  // saved value that matches no preset opens as custom with the value filled in.
  const [selection, setSelection] = useState(
    isMainnet && preset ? preset.uri : CUSTOM_INDEXER,
  );
  const [customUrl, setCustomUrl] = useState(preset ? "" : current);
  const [saved, setSaved] = useState(current);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resolved = resolveIndexer(selection, customUrl, network);
  const connecting = status === "connecting";
  const changed =
    indexerReady(selection, customUrl, network) && resolved !== saved;

  // Land on the section when arriving from the dashboard's "Change Indexer" CTA,
  // focusing the custom field if it's open, otherwise the first preset.
  useEffect(() => {
    if (!focusOnMount) return;
    sectionRef.current?.scrollIntoView({ block: "center" });
    (inputRef.current ?? sectionRef.current?.querySelector("button"))?.focus();
  }, [focusOnMount]);

  function choose(next: string) {
    setSelection(next);
    if (status !== "idle") setStatus("idle");
    setError(null);
  }

  async function save() {
    setStatus("connecting");
    setError(null);
    try {
      const result = await setIndexer(resolved);
      setSaved(result.indexerUri);
      setStatus("saved");
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }

  return (
    <section
      ref={sectionRef}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex items-center gap-2">
        <IconServer2 className="size-4 text-muted-foreground" />
        <h2 className="font-heading text-base font-semibold">Indexer</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {isMainnet
          ? "The Indexer this Wallet syncs from. Switching connects to the new one before saving."
          : "This regtest Wallet has no public default, so point it at your own Indexer."}
      </p>

      <IndexerPicker
        network={network}
        selection={selection}
        customUrl={customUrl}
        disabled={connecting}
        inputRef={inputRef}
        className="mt-4"
        onSelect={choose}
        onCustomChange={(url) => {
          setCustomUrl(url);
          if (status !== "idle") setStatus("idle");
          setError(null);
        }}
        onCustomSubmit={() => {
          if (changed && !connecting) save();
        }}
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0 text-xs">
          {status === "saved" && (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <IconCircleCheck className="size-3.5" />
              Connected and saved.
            </span>
          )}
          {status === "error" && error && (
            <span className="text-destructive">{error}</span>
          )}
        </div>
        <Button
          className="shrink-0"
          disabled={!changed || connecting}
          onClick={save}
        >
          {connecting ? (
            <>
              <span
                aria-hidden
                className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70 motion-reduce:hidden"
              />
              Connecting…
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </section>
  );
}
