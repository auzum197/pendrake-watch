import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { animationsEnabled } from "@/lib/motion";
import { createSpring, type Spring } from "@/lib/spring";

const FOLD = { response: 0.32, damping: 1 };

export function useFold(target: RefObject<HTMLElement | null>) {
	const [open, setOpen] = useState(false);
	const [animate] = useState(animationsEnabled);
	const springRef = useRef<Spring | null>(null);

	function spring(): Spring {
		if (!springRef.current) {
			springRef.current = createSpring((v) =>
				target.current?.style.setProperty("--t", String(v)),
			);
		}
		return springRef.current;
	}

	function settle(next: boolean) {
		setOpen(next);
		const t = next ? 1 : 0;
		if (animate) spring().animateTo(t, FOLD);
		else spring().set(t);
	}

	return { open, animate, settle, toggle: () => settle(!open) };
}

export function useHeight(ref: RefObject<HTMLElement | null>): number {
	const [height, setHeight] = useState(0);
	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
		ro.observe(el);
		return () => ro.disconnect();
	}, [ref]);
	return height;
}
