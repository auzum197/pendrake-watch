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

export interface AppSettings {
  endpoint: EndpointConfig;
  theme: Theme;
  currency: Currency;
  selectedAccountId: number | null;
  autoSyncOnStartup: boolean;
}
