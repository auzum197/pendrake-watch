import { IconHeartFilled } from "@tabler/icons-react";
import appIcon from "@/assets/app-icon.png";
import wordmark from "@/assets/pendrake-wordmark.png";

// The About contents: the macOS app icon, the wordmark, a one-line description, and
// the credits. Rendered standalone inside its own window (see about-window.tsx). The
// icon is the shipped AppIcon, so its squircle and gradient come baked into the PNG.
//
// It reads as a native panel, not a page: nothing selects, the images don't lift into
// a drag, and the pointer stays an arrow rather than turning into an I-beam over text.
export function AboutCard() {
	return (
		<div className="flex cursor-default flex-col items-center px-8 text-center">
			<AppIcon />
			<img
				src={wordmark}
				alt="pendrake"
				draggable={false}
				className="mt-6 h-10 [-webkit-user-drag:none]"
			/>
			<p className="mt-5 text-[15px] leading-snug text-muted-foreground">
				A Zcash watch-only wallet to track your savings.
			</p>
			<p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
				Made with
				<IconHeartFilled className="size-3.5 text-sky-200" />
				by Darío, José and Micaela
			</p>
		</div>
	);
}

// The specular rim macOS puts on app icons: a hairline that catches the light at the
// top-left and again at the bottom-right, fading out along the other two edges. The
// ring is cut from the icon's own alpha (the full silhouette minus a 2px-inset copy),
// so it traces the real squircle instead of a border-radius approximation of it.
function AppIcon() {
	const ring = {
		background:
			"linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0) 38%, rgba(255,255,255,0) 62%, rgba(255,255,255,0.45))",
		maskImage: `url(${appIcon}), url(${appIcon})`,
		maskSize: "100% 100%, calc(100% - 2px) calc(100% - 2px)",
		maskPosition: "center, center",
		maskRepeat: "no-repeat, no-repeat",
		maskComposite: "exclude",
		WebkitMaskImage: `url(${appIcon}), url(${appIcon})`,
		WebkitMaskSize: "100% 100%, calc(100% - 2px) calc(100% - 2px)",
		WebkitMaskPosition: "center, center",
		WebkitMaskRepeat: "no-repeat, no-repeat",
		WebkitMaskComposite: "xor",
	} as const;

	return (
		<div className="relative size-20">
			<img
				src={appIcon}
				alt=""
				draggable={false}
				className="size-20 [-webkit-user-drag:none]"
			/>
			<span aria-hidden className="absolute inset-0" style={ring} />
		</div>
	);
}
