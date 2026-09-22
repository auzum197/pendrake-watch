import type { ReactNode } from "react";

const IS_MAC =
	typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

export const MOD_KEY = IS_MAC ? "⌘" : "Ctrl";

export function Kbd({ children }: { children: ReactNode }) {
	return (
		<kbd className="inline-flex h-[18px] items-center rounded-[5px] border border-white/15 bg-black/25 px-[5px] font-sans text-[10px] font-semibold text-white/45">
			{children}
		</kbd>
	);
}
