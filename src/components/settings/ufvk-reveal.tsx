import { useEffect, useRef, useState } from "react";
import {
  IconCheck,
  IconCopy,
  IconEye,
  IconEyeOff,
  IconLock,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button/button";
import { exportUfvk, type Network } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import "./wallets.css";

const BECH32 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

// Stand-in for the key while it is locked, so the blur has something of the right
// shape over it and the real UFVK never reaches the DOM before it is fetched.
const FILLER = Array.from(
  { length: 320 },
  (_, i) => BECH32[(i * 7 + 11) % BECH32.length],
).join("");

const PREFIX: Record<Network, string> = {
  mainnet: "uview1",
  regtest: "uviewregtest1",
};

// Bech32m puts the separator at the end of the human-readable part.
function splitPrefix(ufvk: string): [string, string] {
  const at = ufvk.indexOf("1");
  return at === -1 ? ["", ufvk] : [ufvk.slice(0, at + 1), ufvk.slice(at + 1)];
}

function PassphraseAsk({
  onUnlocked,
  onCancel,
  walletId,
}: {
  onUnlocked: (ufvk: string) => void;
  onCancel: () => void;
  walletId: string;
}) {
  const [value, setValue] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    try {
      onUnlocked(await exportUfvk(walletId, value));
    } catch {
      setError("That passphrase doesn't match.");
      setBusy(false);
    }
  }

  return (
    <form
      className="ufvk-ask"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="relative flex-1">
        <IconLock className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          data-escape-local
          type={shown ? "text" : "password"}
          value={value}
          placeholder="Passphrase"
          aria-label="Passphrase"
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
          className="ufvk-ask-input"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={shown ? "Hide passphrase" : "Show passphrase"}
          onClick={() => setShown((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {shown ? (
            <IconEyeOff className="size-3.5" />
          ) : (
            <IconEye className="size-3.5" />
          )}
        </button>
      </div>
      <Button size="sm" type="submit" disabled={!value || busy}>
        {busy ? "Checking…" : "Show"}
      </Button>
      {error && <span className="ufvk-ask-error">{error}</span>}
    </form>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className="ufvk-tool"
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), 1400);
      }}
    >
      {copied ? (
        <IconCheck className="size-3.5 text-emerald-400" />
      ) : (
        <IconCopy className="size-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// The key sits on the plate blurred. A capsule in its centre asks for the
// passphrase; the right one fetches the key and sharpens it, and Hide drops it
// again. The fetched key lives here and nowhere else, so remounting the plate
// drops it too.
export function UfvkReveal({
  walletId,
  network,
}: {
  walletId: string;
  network: Network;
}) {
  const [ufvk, setUfvk] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const shown = ufvk !== null;

  const [prefix, body] = ufvk ? splitPrefix(ufvk) : [PREFIX[network], FILLER];

  return (
    <section className="ufvk">
      <div className="ufvk-head">
        <span className="ufvk-title">Viewing key</span>
        {ufvk && (
          <span className="ufvk-tools">
            <CopyButton text={ufvk} />
            <button
              type="button"
              className="ufvk-tool"
              onClick={() => setUfvk(null)}
            >
              <IconEyeOff className="size-3.5" />
              Hide
            </button>
          </span>
        )}
      </div>

      <div className="ufvk-body">
        <p
          className={cn("ufvk-text select-text", !shown && "is-blurred")}
          aria-hidden={!shown}
        >
          <span className="ufvk-prefix">{prefix}</span>
          {body}
        </p>

        {shown ? null : asking ? (
          <PassphraseAsk
            walletId={walletId}
            onUnlocked={(key) => {
              setUfvk(key);
              setAsking(false);
            }}
            onCancel={() => setAsking(false)}
          />
        ) : (
          <button
            type="button"
            className="ufvk-capsule"
            onClick={() => setAsking(true)}
          >
            <IconLock className="size-3.5" />
            Show…
          </button>
        )}
      </div>
    </section>
  );
}
