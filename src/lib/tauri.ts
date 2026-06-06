/**
 * The single place where the frontend talks to Rust.
 *
 * RULE: components and stores import `tauri.*` from here — they never call
 * `invoke()` directly. This keeps the IPC surface typed, centralized, and easy
 * to mock in tests.
 *
 * Command names match the Rust function names exactly (snake_case), as
 * registered in `src-tauri/src/lib.rs`.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  Account,
  SyncStatus,
  TransactionRecord,
  WalletBalance,
  WalletStatus,
} from "@/types/wallet";
import type {
  AppSettings,
  EndpointConfig,
  EndpointInfo,
  NamedEndpoint,
} from "@/types/settings";

/** Mirror of `AppError` in `src-tauri/src/error.rs`. */
export interface AppError {
  code: string;
  message: string;
}

/** Type guard for structured errors coming back from a command `Result::Err`. */
function isAppError(value: unknown): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value
  );
}

/** Normalized error thrown by every wrapped invoke call. */
export class TauriInvokeError extends Error {
  readonly code: string;

  constructor(cause: unknown) {
    if (isAppError(cause)) {
      super(cause.message);
      this.code = cause.code;
    } else if (typeof cause === "string") {
      super(cause);
      this.code = "unknown";
    } else if (cause instanceof Error) {
      super(cause.message);
      this.code = "unknown";
    } else {
      super("Unknown IPC error");
      this.code = "unknown";
    }
    this.name = "TauriInvokeError";
  }
}

/** Internal: wrap `invoke` so every failure surfaces as a `TauriInvokeError`. */
async function call<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (cause) {
    throw new TauriInvokeError(cause);
  }
}

/** Typed IPC surface. One method per registered Rust command. */
export const tauri = {
  /** Diagnostics: should resolve to "pong". */
  ping: () => call<string>("ping"),

  getBalance: () => call<WalletBalance>("get_balance"),
  getSyncStatus: () => call<SyncStatus>("get_sync_status"),
  getTransactions: () => call<TransactionRecord[]>("get_transactions"),
  getAccounts: () => call<Account[]>("get_accounts"),

  // --- vault / auth (PW-012/014/016/017) ---
  walletStatus: () => call<WalletStatus>("wallet_status"),
  setupWallet: (viewingKey: string, password: string) =>
    call<void>("setup_wallet", { viewingKey, password }),
  unlockWallet: (password: string) => call<void>("unlock_wallet", { password }),
  lockWallet: () => call<void>("lock_wallet"),
  changePassword: (oldPassword: string, newPassword: string) =>
    call<void>("change_password", { oldPassword, newPassword }),

  // --- settings (PW-037/038) ---
  getAppSettings: () => call<AppSettings>("get_app_settings"),
  setSetting: (key: string, value: string) =>
    call<void>("set_setting", { key, value }),
  setEndpoint: (endpoint: EndpointConfig) =>
    call<void>("set_endpoint", { endpoint }),
  listDefaultEndpoints: () => call<NamedEndpoint[]>("list_default_endpoints"),
  /** Live probe: structural check + real GetLightdInfo gRPC handshake (PW-040). */
  validateEndpointLive: (endpoint: EndpointConfig) =>
    call<EndpointInfo>("validate_endpoint_live", { endpoint }),

  // --- notifications (PW-051+) ---
  /** Fire a sample native notification end-to-end. `kind` is "tx" | "sync". */
  notifyTest: (kind: "tx" | "sync") => call<void>("notify_test", { kind }),
};
