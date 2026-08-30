import { useEffect, useRef } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { setPeeking, toggleDiscreet, useDiscreet } from "@/lib/discreet";

// The sidebar eye: click flips Discreet mode, press-and-hold peeks the real values
// until release without touching the persisted flag. The same event scaffolding as
// hold-button (pointer + Space/Enter with cancel-on-leave), with the semantics
// inverted: the hold acts while held instead of firing once at the end.

const HOLD_MS = 250;

export function DiscreetEye() {
	const hidden = useDiscreet();
	const timer = useRef(0);
	const peeked = useRef(false);

	// A press can outlive the component (a route away mid-hold); never leave the
	// store stuck peeking.
	useEffect(() => {
		return () => {
			window.clearTimeout(timer.current);
			setPeeking(false);
		};
	}, []);

	function press() {
		peeked.current = false;
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => {
			peeked.current = true;
			setPeeking(true);
		}, HOLD_MS);
	}

	function release() {
		window.clearTimeout(timer.current);
		if (peeked.current) {
			peeked.current = false;
			setPeeking(false);
		} else {
			void toggleDiscreet();
		}
	}

	// A drag off the button or a focus loss is neither a click nor a finished peek.
	function abort() {
		window.clearTimeout(timer.current);
		peeked.current = false;
		setPeeking(false);
	}

	const Icon = hidden ? IconEyeOff : IconEye;
	return (
		<button
			type="button"
			aria-pressed={hidden}
			aria-label="Discreet mode"
			title={hidden ? "Click to show, hold to peek" : "Click to hide"}
			onPointerDown={press}
			onPointerUp={release}
			onPointerLeave={abort}
			onPointerCancel={abort}
			onBlur={abort}
			onKeyDown={(e) => {
				if ((e.key === " " || e.key === "Enter") && !e.repeat) {
					e.preventDefault();
					press();
				}
			}}
			onKeyUp={(e) => {
				if (e.key === " " || e.key === "Enter") {
					e.preventDefault();
					release();
				}
			}}
			className="flex shrink-0 cursor-pointer select-none items-center text-white/45 transition-colors hover:text-white/80 focus-visible:outline-2 focus-visible:outline-brand"
			style={{ touchAction: "none" }}
		>
			<Icon className="size-3.5" />
		</button>
	);
}
