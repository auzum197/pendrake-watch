import { IconHeartFilled, IconShieldCheckFilled } from "@tabler/icons-react";

// The About contents: the app's placeholder mark, its name, a one-line description, and
// the credits. Rendered standalone inside its own window (see about-window.tsx).
export function AboutCard() {
	return (
		<div className="flex flex-col items-center gap-4 px-8 text-center">
			<span className="flex size-16 items-center justify-center rounded-2xl bg-brand">
				<IconShieldCheckFilled className="size-9 text-white" />
			</span>
			<div className="flex flex-col gap-1.5">
				<h1 className="font-heading text-xl font-semibold text-foreground">
					Pendrake Watch
				</h1>
				<p className="text-sm text-muted-foreground">
					A Zcash watch-only wallet to track your savings.
				</p>
			</div>
			<p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
				Made with
				<IconHeartFilled className="size-3.5 text-rose-400" />
				by Darío, José and Micaela
			</p>
		</div>
	);
}
