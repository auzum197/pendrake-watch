import type { ReactNode } from "react";
import { IconClock, IconCube } from "@tabler/icons-react";
import {
  type BlockDisplay,
  toggleBlockDisplay,
  useBlockDisplay,
  useBlockSwapping,
} from "@/lib/block-display";
import { cn } from "@/lib/utils";
import "./block-display-toggle.css";

export function BlockDisplayToggle({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const display = useBlockDisplay();
  const swapping = useBlockSwapping();
  const asTime = display === "time";
  const Icon = asTime ? IconCube : IconClock;
  return (
    <button
      type="button"
      aria-pressed={asTime}
      aria-label={children ? undefined : "Show blocks as local time"}
      title={asTime ? "Show block heights" : "Show block times"}
      onClick={toggleBlockDisplay}
      className={cn(
        "block-toggle inline-flex items-center hover:text-foreground",
        asTime && "text-foreground",
        className,
      )}
    >
      <span
        key={display}
        className={cn("whitespace-nowrap", swapping && "block-swap")}
      >
        {children ?? <Icon className="size-3.5" />}
      </span>
    </button>
  );
}

export function blockLabel(display: BlockDisplay): string {
  return display === "time" ? "Block time" : "Block";
}
