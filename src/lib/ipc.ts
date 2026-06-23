import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// Mirrors the daemon's pendrake-ipc wire types, camelCase across the boundary.
export type Network = "mainnet" | "regtest";
export type ImportType = "ufvk" | "seed";
export type ViewMode = "full" | "incoming-only";

export type WalletState = {
	exists: boolean;
	locked: boolean;
	// The daemon holds the session passphrase in memory. After a Replace-wipe this
	// stays true, so onboarding skips Set Password (docs/adr/0004).
	sessionHeld: boolean;
	// The current Wallet's fingerprint, seeding its LifeHash. Null when no wallet
	// exists or it predates fingerprint persistence.
	fingerprint: string | null;
	importType: ImportType;
	viewMode: ViewMode;
	network: Network;
	birthdayHeight: number;
	// The Indexer this Wallet syncs against, editable from Settings. Empty when no
	// wallet exists.
	indexerUri: string;
};

export type WalletAddress = {
	ua: string;
	transparent?: string;
};

// The user's raw Birthday choice. The daemon's resolver turns it into a starting
// height (mirrors pendrake-ipc BirthdayInput), so the GUI never pre-resolves. A
// date is unix seconds for midnight UTC of the picked day, mainnet only.
export type BirthdayInput =
	| { kind: "height"; value: number }
	| { kind: "date"; value: number }
	| { kind: "default" };

export type ImportUfvkInput = {
	ufvk: string;
	birthday: BirthdayInput;
	indexerUri: string;
	network: Network;
	// Omitted on a post-Replace import: the daemon reuses the held session passphrase.
	passphrase?: string;
};

// A UFVK declares its own network. Testnet is rejected, so a decoded key is one
// of these two (mirrors the daemon's pendrake-ipc UfvkNetwork).
export type UfvkNetwork = "mainnet" | "regtest";
export type Pool = "orchard" | "sapling" | "transparent";

export type UfvkIdentity = {
	network: UfvkNetwork;
	fingerprint: string;
	pools: Pool[];
};

// The decode verdict, tagged by `kind`. A testnet or malformed key is a result
// the Identity screen renders inline, not a thrown daemon error.
export type ParseUfvkResult =
	| ({ kind: "valid" } & UfvkIdentity)
	| { kind: "testnet" }
	| { kind: "malformed"; reason: string };

export type SyncState = "idle" | "syncing" | "error";
export type SyncPhase = "scanning" | "committing";

export type SyncStatus = {
	state: SyncState;
	syncedHeight: number;
	chainTip: number;
	percent: number;
	phase?: SyncPhase;
	scannedOutputs?: number;
	totalOutputs?: number;
	etaSeconds?: number;
	error?: string;
	// Set only when the sync error was the Indexer being unreachable, gating the
	// "Change server" CTA. Absent reads as false.
	unreachable?: boolean;
	lastSyncedAt?: number;
};

export type PoolBalance = {
	confirmed: string;
	total: string;
};

export type Balance = {
	orchard?: PoolBalance;
	sapling?: PoolBalance;
	transparent?: PoolBalance;
};

export type TxKind = "received" | "sent";
export type TxStatus = "confirmed" | "pending";
export type NoteDirection = "received" | "sent";

// One output within a transaction: a shielded Note or a transparent UTXO (`pool`
// says which). There's no per-note id, so a note is identified by its pool and
// outputIndex. Only shielded notes carry a memo; only Sent outputs carry a
// recipient. Empty memos are stripped daemon-side, so a present `memo` is real.
export type Note = {
	pool: Pool;
	direction: NoteDirection;
	outputIndex: number;
	valueZat: string;
	memo?: string;
	recipient?: string;
};

export type Tx = {
	txid: string;
	datetime: number;
	blockHeight?: number;
	kind: TxKind;
	valueZat: string;
	status: TxStatus;
	notes: Note[];
};

// The public mainnet default: zec.rocks auto-routes to a nearby region.
export const DEFAULT_INDEXER = "https://zec.rocks:443";

// Curated mainnet Indexers shown in Settings. The default is auto-routed; the rest
// pin a region. Regtest has no public default, so it only ever uses a custom one.
export const MAINNET_INDEXERS: { label: string; uri: string }[] = [
	{ label: "Default (auto-routed)", uri: DEFAULT_INDEXER },
	{ label: "North America", uri: "https://na.zec.rocks:443" },
	{ label: "Europe", uri: "https://eu.zec.rocks:443" },
	{ label: "South America", uri: "https://sa.zec.rocks:443" },
	{ label: "Middle East", uri: "https://me.zec.rocks:443" },
];

export function importUfvk(input: ImportUfvkInput): Promise<WalletState> {
	return invoke("import_ufvk", {
		ufvk: input.ufvk,
		birthday: input.birthday,
		indexerUri: input.indexerUri,
		network: input.network,
		// Pass undefined through so the daemon falls back to the held passphrase.
		passphrase: input.passphrase,
	});
}

// Decode a pasted UFVK into its identity (network, pools, fingerprint) without
// importing it. Drives the Identity screen as the user types.
export function parseUfvk(ufvk: string): Promise<ParseUfvkResult> {
	return invoke("parse_ufvk", { ufvk });
}

// Open an encrypted wallet on this run. Rejects when the passphrase is wrong.
export function unlock(passphrase: string): Promise<WalletState> {
	return invoke("unlock", { passphrase });
}

// Lock the GUI session. The daemon keeps the wallet open and syncing; re-entry needs
// the passphrase. Sign Out calls this.
export function lock(): Promise<void> {
	return invoke("lock");
}

// Point the Wallet at a different Indexer. The daemon connects to the new server
// before persisting, so this rejects when the server is unreachable or the URL is
// malformed, leaving the current Indexer in place.
export function setIndexer(indexerUri: string): Promise<WalletState> {
	return invoke("set_indexer", { indexerUri });
}

// Re-authenticate against the held session passphrase without touching the wallet.
// Gates the Replace wipe; true only when the passphrase matches.
export function verifyPassphrase(passphrase: string): Promise<boolean> {
	return invoke("verify_passphrase", { passphrase });
}

export function getWalletState(): Promise<WalletState> {
	return invoke("get_wallet_state");
}

export function getAddresses(): Promise<WalletAddress[]> {
	return invoke("get_addresses");
}

export function getSyncStatus(): Promise<SyncStatus> {
	return invoke("get_sync_status");
}

export function getBalance(): Promise<Balance> {
	return invoke("get_balance");
}

export function getTransactions(): Promise<Tx[]> {
	return invoke("get_transactions");
}

export function getTransaction(txid: string): Promise<Tx | null> {
	return invoke("get_transaction", { txid });
}

// Wipe the current Wallet. Replace passes keepSession so the daemon retains the
// session passphrase across the wipe (docs/adr/0004); Start over leaves it false.
export function removeWallet(keepSession = false): Promise<void> {
	return invoke("remove_wallet", { keepSession });
}

export type BatchPhase = "scanning" | "waiting" | "committing";

// One in-flight scan range. Animate the active bar from `phaseStartedAtMs`
// against `expectedSecs`; both clocks share the local machine with the daemon.
export type BatchProgress = {
	id: string;
	start: number;
	end: number;
	priority: string;
	outputs: number;
	phase: BatchPhase;
	phaseStartedAtMs: number;
	expectedSecs?: number;
};

export type CommitBreakdown = {
	checkpoints: number;
	frontiers: number;
	insertTree: number;
	spendFetch: number;
	spendCpu: number;
	cleanup: number;
	other: number;
};

export type BatchTiming = {
	totalSecs: number;
	waitSecs: number;
	fetchSecs: number;
	decryptionSecs: number;
	treeSecs: number;
	commitSecs: number;
	commit: CommitBreakdown;
};

export type BatchSummary = {
	id: string;
	start: number;
	end: number;
	priority: string;
	outputs: number;
	timing: BatchTiming;
};

// Pushed from the daemon through the Tauri bridge as the wallet scans. Tagged by
// `event`, mirroring the pendrake-ipc `SyncEvent` enum.
export type SyncEvent =
	| { event: "progress"; status: SyncStatus; batches: BatchProgress[] }
	| { event: "batchDone"; batch: BatchSummary }
	| { event: "finished"; status: SyncStatus }
	| {
			event: "transaction";
			txid: string;
			kind: TxKind;
			valueZat: string;
			received: boolean;
	  }
	| { event: "error"; message: string; unreachable?: boolean };

export function onSyncEvent(
	handler: (event: SyncEvent) => void,
): Promise<UnlistenFn> {
	return listen<SyncEvent>("sync-event", (e) => handler(e.payload));
}
