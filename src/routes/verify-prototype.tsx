// PROTOTYPE. Three variants of a transaction verifier, switchable via `?variant=`,
// on the new /verify tab (and /verify-window when detached). Results are mocked in
// components/verify-prototype/mock.ts; see NOTES.md there for the question.

import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { PrototypeSwitcher } from "@/components/app/prototype-switcher/prototype-switcher";
import { EMPTY_INPUTS, mockVerify, type Inputs, type Report } from "@/components/verify-prototype/mock";
import { VariantA, name as nameA } from "@/components/verify-prototype/variant-a";
import { VariantB, name as nameB } from "@/components/verify-prototype/variant-b";
import { VariantC, name as nameC } from "@/components/verify-prototype/variant-c";

export type Variant = "a" | "b" | "c";

export function parseVariant(s: Record<string, unknown>): { variant: Variant } {
	return { variant: s.variant === "b" || s.variant === "c" ? s.variant : "a" };
}

const VARIANTS: { key: Variant; name: string }[] = [
	{ key: "a", name: nameA },
	{ key: "b", name: nameB },
	{ key: "c", name: nameC },
];

let verifyWindow: WebviewWindow | null = null;

async function openDetached(variant: Variant) {
	if (verifyWindow) {
		try {
			await verifyWindow.setFocus();
			return;
		} catch {
			verifyWindow = null;
		}
	}
	const win = new WebviewWindow("verify", {
		url: `/verify-window?variant=${variant}`,
		title: "Verify transaction",
		width: 960,
		height: 720,
		minWidth: 640,
		minHeight: 480,
	});
	win.once("tauri://destroyed", () => {
		verifyWindow = null;
	});
	verifyWindow = win;
}

export function VerifyPrototypePage({ detached }: { detached: boolean }) {
	const { variant: current } = parseVariant(useSearch({ strict: false }));
	const navigate = useNavigate();
	const [inputs, setInputs] = useState<Inputs>(EMPTY_INPUTS);
	const [report, setReport] = useState<Report | null>(null);
	const [running, setRunning] = useState(false);

	const run = async () => {
		setRunning(true);
		// A beat of latency so the pending state can be judged too.
		await new Promise((r) => setTimeout(r, 400));
		setReport(mockVerify(inputs));
		setRunning(false);
	};

	const setVariant = (next: Variant) =>
		navigate({
			to: detached ? "/verify-window" : "/verify",
			search: { variant: next },
			replace: true,
		});

	const props = {
		inputs,
		setInputs,
		report,
		running,
		run,
		detached,
		detach: () => openDetached(current),
	};

	return (
		<>
			{current === "a" && <VariantA {...props} />}
			{current === "b" && <VariantB {...props} />}
			{current === "c" && <VariantC {...props} />}
			<PrototypeSwitcher variants={VARIANTS} current={current} onChange={setVariant} />
		</>
	);
}

// The detached window: the same page in a plain frame, no sidebar.
export function VerifyWindow() {
	return (
		<div className="min-h-screen bg-background px-8 py-7 text-foreground">
			<VerifyPrototypePage detached />
		</div>
	);
}
