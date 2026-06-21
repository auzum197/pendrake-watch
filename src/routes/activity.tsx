import { TxList } from "@/components/app/tx-list";
import { useWalletData } from "@/hooks/use-wallet-data";

export function ActivityPage() {
  const { txs, error } = useWalletData();

  return (
    <>
      <h1 className="font-heading text-xl font-bold">Activity</h1>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          Can't reach the background process: {error}
        </p>
      )}
      <section className="rounded-2xl border border-zinc-200 bg-card p-6">
        <h2 className="font-heading text-base font-semibold">
          Transaction history
        </h2>
        <TxList txs={txs} />
      </section>
    </>
  );
}
