import { useSyncExternalStore } from "react";

type State = { open: boolean; instant: boolean };

let state: State = { open: false, instant: false };
const listeners = new Set<() => void>();

function emit() {
	for (const notify of listeners) notify();
}

function subscribe(notify: () => void): () => void {
	listeners.add(notify);
	return () => {
		listeners.delete(notify);
	};
}

export function openWalletPalette(opts?: { instant?: boolean }): void {
	state = { open: true, instant: opts?.instant ?? false };
	emit();
}

export function closeWalletPalette(): void {
	if (!state.open) return;
	state = { open: false, instant: false };
	emit();
}

export function useWalletPalette(): State {
	return useSyncExternalStore(
		subscribe,
		() => state,
		() => state,
	);
}
