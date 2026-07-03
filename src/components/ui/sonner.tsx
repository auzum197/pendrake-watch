import type { ComponentProps, CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";

// The app renders one theme (dark), so the toaster is pinned rather than read off a
// provider. The CSS vars map sonner's surfaces onto the app's popover/border tokens so
// a toast reads as part of the same design as cards and popovers.
export function Toaster(props: ComponentProps<typeof Sonner>) {
	return (
		<Sonner
			theme="dark"
			className="toaster group"
			style={
				{
					"--normal-bg": "var(--popover)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "var(--border)",
				} as CSSProperties
			}
			{...props}
		/>
	);
}
