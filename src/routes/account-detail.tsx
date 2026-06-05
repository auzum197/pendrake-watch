import { getRouteApi, Link } from "@tanstack/react-router";
import { IconArrowLeft } from "@tabler/icons-react";
import { useWalletStore } from "@/stores/walletStore";

// Typed access to the `$accountId` path param (see router.tsx).
const routeApi = getRouteApi("/app/accounts/$accountId");

/** Detail view for a single account — demonstrates typed path params. */
export function AccountDetailPage() {
  const { accountId } = routeApi.useParams();
  const account = useWalletStore((s) =>
    s.accounts.find((a) => String(a.id) === accountId),
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link
        to="/accounts"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft size={16} /> Accounts
      </Link>

      {account === undefined ? (
        <p className="text-sm text-muted-foreground">
          Account {accountId} not found.
        </p>
      ) : (
        <>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {account.label}
          </h1>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {account.addresses.map((addr) => (
              <li key={addr.address} className="px-4 py-3">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {addr.pool}
                </span>
                <p className="break-all font-mono text-sm">{addr.address}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
