// PROTOTYPE. Fake results for the Verify tab, shaped like what the daemon would
// return once it walks a transaction's shielded outputs through the outgoing
// cipher key (OCK) pipeline. Pure and deterministic from the inputs so the same
// paste always renders the same report. Nothing here touches the daemon.

import type { Pool } from "@/lib/ipc";

export type ShieldedPool = Extract<Pool, "sapling" | "orchard" | "ironwood">;

// The stages a sender-side recovery goes through, in order. The first six come
// straight from the protocol spec's decryption-with-ovk procedure, the last is the
// ZIP 212 ephemeral key check. A report names the stage an output failed at.
export const STAGES = [
	{
		key: "ock",
		label: "OCK",
		detail: "PRF_ock(ovk, cv, cm*, epk) derives the outgoing cipher key",
	},
	{
		key: "outCiphertext",
		label: "out_ciphertext",
		detail: "OCK opens out_ciphertext, revealing pk_d and esk",
	},
	{
		key: "noteCiphertext",
		label: "enc_ciphertext",
		detail: "KDF(esk · pk_d, epk) opens the note ciphertext",
	},
	{
		key: "noteParse",
		label: "plaintext",
		detail: "d, v, rseed and memo parse into a note for pk_d",
	},
	{
		key: "eskCheck",
		label: "esk",
		detail: "esk equals the one derived from rseed (ZIP 212)",
	},
	{
		key: "commitment",
		label: "cm*",
		detail: "NoteCommit(note) matches the commitment on chain",
	},
	{
		key: "ephemeralKey",
		label: "epk",
		detail: "esk · g_d matches the ephemeral key on chain",
	},
] as const;

export type Stage = (typeof STAGES)[number]["key"];

export type KeyLabel =
	| "wallet external"
	| "wallet internal"
	| "wallet transparent"
	| "pasted OVK"
	| "pasted OCK";

export type RecoveredNote = {
	recipient: string;
	valueZat: bigint;
	memo?: string;
};

export type OutputReport = {
	pool: ShieldedPool;
	index: number;
	cmstar: string;
	ephemeralKey: string;
	// The stage that refused the output. Absent when every stage passed.
	failedAt?: Stage;
	// Which key got furthest. Absent when no key opened out_ciphertext.
	key?: KeyLabel;
	// The OCK that opened the output, the value a sender hands a third party as
	// proof of this one payment.
	ock?: string;
	note?: RecoveredNote;
};

export type Report = {
	txid: string;
	version: "v4" | "v5" | "v6";
	height?: number;
	transparentOutputs: number;
	keysTried: KeyLabel[];
	outputs: OutputReport[];
};

export type OckEntry = { pool: ShieldedPool; index: number; ock: string };

export type Inputs = {
	source: "txid" | "hex";
	txid: string;
	txHex: string;
	walletKeys: boolean;
	ovk: string;
	ocks: OckEntry[];
	// Demo switch so the failure states can be judged without a real bad tx.
	tamper: boolean;
};

export const EMPTY_INPUTS: Inputs = {
	source: "txid",
	txid: "",
	txHex: "",
	walletKeys: true,
	ovk: "",
	ocks: [],
	tamper: false,
};

export function isRecovered(o: OutputReport): boolean {
	return o.failedAt === undefined;
}

export function stageIndex(stage: Stage): number {
	return STAGES.findIndex((s) => s.key === stage);
}

// A txid pasted as hex or a raw transaction: whichever the form is on.
export function sourceText(inputs: Inputs): string {
	return inputs.source === "txid" ? inputs.txid.trim() : inputs.txHex.trim();
}

export function hasSource(inputs: Inputs): boolean {
	return sourceText(inputs).length > 0;
}

export function mockVerify(inputs: Inputs): Report {
	const seedText = sourceText(inputs);
	const rand = mulberry32(hashText(seedText));
	const txid = /^[0-9a-f]{64}$/i.test(seedText)
		? seedText.toLowerCase()
		: hex(rand, 32);
	const version = inputs.source === "hex" && rand() < 0.3 ? "v4" : "v5";
	const outputCount = 2 + Math.floor(rand() * 3);
	const pools: ShieldedPool[] = version === "v4" ? ["sapling"] : ["orchard", "sapling", "ironwood"];
	const keysTried: KeyLabel[] = [];
	if (inputs.walletKeys) keysTried.push("wallet external", "wallet internal", "wallet transparent");
	if (inputs.ovk.trim()) keysTried.push("pasted OVK");
	if (inputs.ocks.some((o) => o.ock.trim())) keysTried.push("pasted OCK");

	const outputs: OutputReport[] = [];
	for (let i = 0; i < outputCount; i++) {
		const pool = pools[Math.floor(rand() * pools.length)];
		const index = pool === "sapling" ? outputs.filter((o) => o.pool === "sapling").length : outputs.filter((o) => o.pool !== "sapling").length;
		const base = { pool, index, cmstar: hex(rand, 32), ephemeralKey: hex(rand, 32) };
		const valueZat = BigInt(Math.floor(rand() * 4_000_000) + 12_000);
		const note: RecoveredNote = {
			recipient: fakeAddress(pool, rand),
			valueZat,
			memo: rand() < 0.5 ? pickMemo(rand) : undefined,
		};

		const pasted = inputs.ocks.find(
			(o) => o.pool === pool && o.index === index && o.ock.trim(),
		);
		if (pasted) {
			const good = /^[0-9a-f]{64}$/i.test(pasted.ock.trim());
			outputs.push(
				good
					? { ...base, key: "pasted OCK", ock: pasted.ock.trim().toLowerCase(), note }
					: { ...base, failedAt: "outCiphertext" },
			);
			continue;
		}
		if (inputs.ovk.trim()) {
			outputs.push({ ...base, key: "pasted OVK", ock: hex(rand, 32), note });
			continue;
		}
		if (inputs.walletKeys) {
			// The last output plays the change note back to the wallet, the rest
			// went out under the external key.
			const key: KeyLabel = i === outputCount - 1 ? "wallet internal" : "wallet external";
			outputs.push({ ...base, key, ock: hex(rand, 32), note });
			continue;
		}
		outputs.push({ ...base, failedAt: "outCiphertext" });
	}

	if (inputs.tamper && outputs.length > 0) {
		// A tampered output opens fine with the key but its commitment no longer
		// matches, the case a verifier exists to catch.
		const victim = outputs[0];
		outputs[0] = { ...victim, failedAt: "commitment", note: undefined, ock: undefined };
	}

	return {
		txid,
		version,
		height: inputs.source === "txid" ? 2_900_000 + Math.floor(rand() * 40_000) : undefined,
		transparentOutputs: rand() < 0.25 ? 1 : 0,
		keysTried,
		outputs,
	};
}

function pickMemo(rand: () => number): string {
	const memos = [
		"Invoice #4471, thanks!",
		"Rent for October",
		"Reply-to: u1qw…8kx\nSplitting dinner",
		"⚡ tip",
	];
	return memos[Math.floor(rand() * memos.length)];
}

function fakeAddress(pool: ShieldedPool, rand: () => number): string {
	const alphabet = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
	const body = (n: number) =>
		Array.from({ length: n }, () => alphabet[Math.floor(rand() * 32)]).join("");
	return pool === "sapling" ? `zs1${body(75)}` : `u1${body(105)}`;
}

function hex(rand: () => number, bytes: number): string {
	return Array.from({ length: bytes }, () =>
		Math.floor(rand() * 256)
			.toString(16)
			.padStart(2, "0"),
	).join("");
}

function hashText(text: string): number {
	let h = 2166136261;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

function mulberry32(seed: number): () => number {
	let a = seed || 1;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
