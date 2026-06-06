/**
 * App settings types — mirror of the Rust `AppSettings` / `EndpointConfig`
 * (`src-tauri/src/commands/settings.rs`, `lightwalletd.rs`). camelCase to match
 * the `#[serde(rename_all = "camelCase")]` on the Rust side.
 */

export type Theme = "light" | "dark" | "system";
export type Currency = "USD" | "ARS";

export interface EndpointConfig {
  host: string;
  port: number;
  useTls: boolean;
}

export interface NamedEndpoint {
  label: string;
  config: EndpointConfig;
}

/** Result of a live endpoint probe (`validate_endpoint_live`). */
export interface EndpointInfo {
  chainName: string;
  blockHeight: number;
  vendor: string;
  version: string;
}

export interface AppSettings {
  endpoint: EndpointConfig;
  theme: Theme;
  currency: Currency;
  selectedAccountId: number | null;
  autoSyncOnStartup: boolean;
}
