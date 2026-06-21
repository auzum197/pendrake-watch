import { useEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  IconAlertTriangle,
  IconCheck,
  IconCircleCheck,
  IconServer2,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LifeHashIcon } from "@/components/onboarding/lifehash";
import { ReplaceDialog } from "@/components/settings/replace-dialog";
import { useWalletData } from "@/hooks/use-wallet-data";
import { MAINNET_INDEXERS, setIndexer, type Network } from "@/lib/ipc";

// Settings, with the current Wallet's identity, the Indexer it syncs against, and a
// danger zone for Replace.
export function SettingsPage() {
  const { hash } = useLocation();
  const { wallet } = useWalletData();
  const [replacing, setReplacing] = useState(false);

  return (
    <>
      <h1 className="font-heading text-xl font-bold">Settings</h1>

      <section className="rounded-2xl border border-zinc-200 bg-card p-6">
        <h2 className="font-heading text-base font-semibold">Wallet</h2>
        <div className="mt-4 flex items-center gap-4">
          {wallet?.fingerprint ? (
            <LifeHashIcon
              fingerprint={wallet.fingerprint}
              className="size-14 shrink-0 rounded-full"
            />
          ) : (
            <div className="size-14 shrink-0 rounded-full bg-zinc-100" />
          )}
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="inline-flex w-fit items-center rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium capitalize text-brand">
              {wallet?.network ?? "—"}
            </span>
            <span className="truncate font-mono text-xs text-zinc-400">
              {wallet?.fingerprint ?? "No wallet"}
            </span>
          </div>
        </div>
      </section>

      {wallet?.exists && (
        <IndexerSection
          key={wallet.fingerprint ?? "wallet"}
          network={wallet.network}
          current={wallet.indexerUri}
          focusOnMount={hash === "indexer"}
        />
      )}

      <section className="rounded-2xl border border-destructive/30 bg-destructive/[0.03] p-6">
        <div className="flex items-center gap-2 text-destructive">
          <IconAlertTriangle className="size-4" />
          <h2 className="font-heading text-base font-semibold">Danger zone</h2>
        </div>
        <div className="mt-4 flex items-start justify-between gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-900">
              Replace Wallet
            </span>
            <span className="text-sm text-zinc-500">
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

type SaveStatus = "idle" | "connecting" | "saved" | "error";

// "custom" is a sentinel selection; any other value is a preset's URI.
const CUSTOM = "custom";

// A minimally well-formed http(s) URL with a host. Deliberately light (no scheme
// enforcement), so a regtest `http://localhost:…` passes; the daemon's connect is
// the real gate.
function looksLikeUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname !== "";
  } catch {
    return false;
  }
}

function hostOf(uri: string): string {
  try {
    return new URL(uri).hostname;
  } catch {
    return uri;
  }
}

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

  // Selection is a preset URI or CUSTOM. Regtest is always custom. A saved value
  // that matches no preset opens as custom with the value filled in.
  const [selection, setSelection] = useState(
    isMainnet && preset ? preset.uri : CUSTOM,
  );
  const [customUrl, setCustomUrl] = useState(preset ? "" : current);
  const [saved, setSaved] = useState(current);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCustom = selection === CUSTOM;
  const resolved = isCustom ? customUrl.trim() : selection;
  const connecting = status === "connecting";
  const valid = isCustom ? looksLikeUrl(resolved) : true;
  const changed = valid && resolved.length > 0 && resolved !== saved;

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
      className="rounded-2xl border border-zinc-200 bg-card p-6"
    >
      <div className="flex items-center gap-2">
        <IconServer2 className="size-4 text-zinc-500" />
        <h2 className="font-heading text-base font-semibold">Indexer</h2>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        {isMainnet
          ? "The Indexer this Wallet syncs from. Switching connects to the new one before saving."
          : "This regtest Wallet has no public default, so point it at your own Indexer."}
      </p>

      {isMainnet && (
        <ul className="mt-4 flex flex-col gap-1.5">
          {MAINNET_INDEXERS.map((p) => (
            <IndexerRow
              key={p.uri}
              label={p.label}
              sub={hostOf(p.uri)}
              selected={selection === p.uri}
              disabled={connecting}
              onClick={() => choose(p.uri)}
            />
          ))}
          <IndexerRow
            label="Custom…"
            sub="Point at your own Indexer"
            selected={isCustom}
            disabled={connecting}
            onClick={() => choose(CUSTOM)}
          />
        </ul>
      )}

      {isCustom && (
        <Input
          ref={inputRef}
          value={customUrl}
          spellCheck={false}
          autoComplete="off"
          disabled={connecting}
          placeholder="https://your-indexer:443"
          className={`font-mono ${isMainnet ? "mt-2" : "mt-4"}`}
          onChange={(e) => {
            setCustomUrl(e.currentTarget.value);
            if (status !== "idle") setStatus("idle");
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && changed && !connecting) save();
          }}
        />
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0 text-xs">
          {status === "saved" && (
            <span className="flex items-center gap-1.5 text-emerald-600">
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

function IndexerRow({
  label,
  sub,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  sub: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${
          selected
            ? "border-brand bg-brand/5"
            : "border-zinc-200 hover:border-zinc-300"
        }`}
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-medium text-zinc-900">{label}</span>
          <span className="truncate font-mono text-xs text-zinc-400">{sub}</span>
        </span>
        <span
          className={`ml-auto flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
            selected ? "border-brand bg-brand text-white" : "border-zinc-300"
          }`}
        >
          {selected && <IconCheck className="size-3.5" />}
        </span>
      </button>
    </li>
  );
}
