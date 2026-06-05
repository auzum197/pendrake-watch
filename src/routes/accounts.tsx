import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { IconChevronRight } from "@tabler/icons-react";
import { useWalletStore } from "@/stores/walletStore";

/** Lists wallet accounts; each links to its typed detail route. */
export function AccountsPage() {
  const accounts = useWalletStore((s) => s.accounts);
  const refreshAccounts = useWalletStore((s) => s.refreshAccounts);

  useEffect(() => {
    if (accounts.length === 0) void refreshAccounts();
  }, [accounts.length, refreshAccounts]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Accounts
      </h1>

      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {accounts.map((account) => (
          <li key={account.id}>
            <Link
              to="/accounts/$accountId"
              params={{ accountId: String(account.id) }}
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-accent"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{account.label}</span>
                <span className="text-xs text-muted-foreground">
                  {account.addresses.length} addresses
                </span>
              </div>
              <IconChevronRight size={18} className="text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
