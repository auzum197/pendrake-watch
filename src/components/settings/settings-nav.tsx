import type { Ref } from "react";
import {
  IconFlask,
  IconSearch,
  IconSettings,
  IconWallet,
} from "@tabler/icons-react";

export type Category = "general" | "wallets" | "experimental";

const CATEGORIES: { id: Category; label: string; icon: typeof IconSettings }[] =
  [
    { id: "general", label: "General", icon: IconSettings },
    { id: "wallets", label: "Wallets", icon: IconWallet },
    { id: "experimental", label: "Experimental", icon: IconFlask },
  ];

export function SettingsNav({
  ref,
  query,
  category,
  searching,
  onQueryChange,
  onSelect,
}: {
  ref: Ref<HTMLInputElement>;
  query: string;
  category: Category;
  searching: boolean;
  onQueryChange: (query: string) => void;
  onSelect: (category: Category) => void;
}) {
  return (
    <nav className="flex w-52 shrink-0 flex-col gap-1 border-r border-border bg-ink p-3">
      <div className="relative mb-3">
        <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={ref}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search"
          className="h-9 w-full rounded-lg border border-border bg-white/5 pl-8 pr-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring"
        />
      </div>
      <p className="px-3 pb-2 pt-2 font-heading text-sm font-semibold text-foreground">
        Settings
      </p>
      {CATEGORIES.map((cat) => {
        const current = category === cat.id && !searching;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            aria-current={current ? "true" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              current
                ? "bg-brand font-semibold text-brand-foreground"
                : "cursor-pointer font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}
          >
            <cat.icon className="size-4" />
            {cat.label}
          </button>
        );
      })}
    </nav>
  );
}
