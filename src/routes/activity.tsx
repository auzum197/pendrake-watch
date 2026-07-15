import { useRef, useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { TxList } from "@/components/app/tx-list";
import { useWalletData } from "@/hooks/use-wallet-data";
import { txsToCsv } from "@/lib/format";
import type { Tx } from "@/lib/ipc";

export function ActivityPage() {
  const { txs, error } = useWalletData();

  return (
    <>
      <h1 className="font-heading text-xl font-bold">Activity</h1>
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          Can't reach the background process: {error}
        </p>
      )}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">
            Transaction history
          </h2>
          <ExportButton txs={txs} />
        </div>
        <TxList txs={txs} />
      </section>
    </>
  );
}

// Copies the whole history to the clipboard as CSV. WKWebView resolves
// navigator.clipboard on this click (a user gesture), so no Tauri plugin is needed.
// Deliberately not gated on Discreet mode: the clipboard isn't visible to an
// onlooker, and the export is an explicit action, unlike the always-on-screen rows.
function ExportButton({ txs }: { txs: Tx[] }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function copy() {
    await navigator.clipboard.writeText(txsToCsv(txs));
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={txs.length === 0}
      className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
    >
      {copied ? (
        <IconCheck className="size-3.5 text-brand" />
      ) : (
        <IconCopy className="size-3.5" />
      )}
      {copied ? "Copied" : "Export CSV"}
    </button>
  );
}
