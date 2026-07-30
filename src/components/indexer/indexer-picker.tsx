import type { Ref } from "react";
import { IconCheck } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { CUSTOM_INDEXER, isCustomIndexer } from "@/lib/indexer";
import { MAINNET_INDEXERS, type Network } from "@/lib/ipc";
import { cn } from "@/lib/utils";

// The Indexer choice: on mainnet the curated zec.rocks region list plus a custom
// entry, on regtest the custom field alone, since there is no public default to
// offer. Shared by the onboarding step and Settings, which differ only in the copy
// around it and how the change is committed.
export function IndexerPicker({
  network,
  selection,
  customUrl,
  disabled = false,
  autoFocus = false,
  inputRef,
  inputClassName,
  className,
  onSelect,
  onCustomChange,
  onCustomSubmit,
}: {
  network: Network;
  // A preset's URI, or CUSTOM_INDEXER.
  selection: string;
  customUrl: string;
  disabled?: boolean;
  autoFocus?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  inputClassName?: string;
  className?: string;
  onSelect: (selection: string) => void;
  onCustomChange: (url: string) => void;
  // Enter in the custom field, where the caller has somewhere to go.
  onCustomSubmit?: () => void;
}) {
  const custom = isCustomIndexer(selection, network);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {network === "mainnet" && (
        <ul className="flex flex-col gap-1.5">
          {MAINNET_INDEXERS.map((preset) => (
            <IndexerRow
              key={preset.uri}
              label={preset.label}
              sub={hostOf(preset.uri)}
              selected={selection === preset.uri}
              disabled={disabled}
              onClick={() => onSelect(preset.uri)}
            />
          ))}
          <IndexerRow
            label="Custom…"
            sub="Point at your own Indexer"
            selected={custom}
            disabled={disabled}
            onClick={() => onSelect(CUSTOM_INDEXER)}
          />
        </ul>
      )}

      {custom && (
        <Input
          ref={inputRef}
          autoFocus={autoFocus}
          value={customUrl}
          spellCheck={false}
          autoComplete="off"
          disabled={disabled}
          placeholder={
            network === "regtest"
              ? "http://localhost:8232"
              : "https://your-indexer:443"
          }
          className={cn("font-mono", inputClassName)}
          onChange={(e) => onCustomChange(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCustomSubmit?.();
          }}
        />
      )}
    </div>
  );
}

function hostOf(uri: string): string {
  try {
    return new URL(uri).hostname;
  } catch {
    return uri;
  }
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
            : "border-border hover:border-muted-foreground/40"
        }`}
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="truncate font-mono text-xs text-muted-foreground">{sub}</span>
        </span>
        <span
          className={`ml-auto flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
            selected ? "border-brand bg-brand text-white" : "border-muted-foreground/40"
          }`}
        >
          {selected && <IconCheck className="size-3.5" />}
        </span>
      </button>
    </li>
  );
}
