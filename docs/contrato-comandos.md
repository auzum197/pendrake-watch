# Contrato de comandos Tauri ↔ React (PW-007)

Referencia de todo lo que el backend Rust expone al frontend. Pensado como guía
para integrar nuevas funciones (sync, etc.) sin romper el contrato existente.

- **Fuente de verdad:** `src-tauri/src/lib.rs` (`generate_handler!`) y los módulos
  en `src-tauri/src/commands/`.
- **Consumo en el frontend:** SIEMPRE vía `src/lib/tauri.ts` (wrapper tipado). Los
  componentes no llaman `invoke()` directo; lo hacen las *actions* de los stores.

---

## Convenciones

| Tema | Regla |
|---|---|
| **Nombres de comando** | El comando JS = nombre de la función Rust en snake_case. Ej: `invoke("get_balance")`. |
| **Argumentos** | Tauri mapea **camelCase (JS) → snake_case (Rust)**. Ej: Rust `viewing_key` ← JS `{ viewingKey }`. |
| **Retornos** | serde con `#[serde(rename_all = "camelCase")]` → los campos llegan en camelCase a TS. |
| **Montos** | zatoshis como **string** en el límite JS (precisión de `Number`); en Rust/SQLite son `i64`. Parsear con `BigInt` (`src/lib/zec.ts`). |
| **Errores** | Cada comando falible devuelve `Result<T, AppError>`. Al fallar, la promesa **rechaza** con `{ code, message }`; el wrapper lo envuelve en `TauriInvokeError` (con `.code` y `.message`). |

---

## Inventario de comandos

Leyenda estado: ✅ real · 🟡 mock (se reemplaza con la integración de zingolib).

### Sistema / diagnóstico

| Comando | Args | Retorno | Errores | Estado |
|---|---|---|---|---|
| `ping` | — | `string` (`"pong"`) | — (infalible) | ✅ |
| `greet` | `{ name: string }` | `string` | — | demo (removible) |

### Wallet — lectura de datos

| Comando | Args | Retorno | Errores | Estado |
|---|---|---|---|---|
| `get_balance` | — | `WalletBalance` | `db`, `state` | 🟡 mock |
| `get_sync_status` | — | `SyncStatus` | `db`, `state` | 🟡 mock |
| `get_transactions` | — | `TransactionRecord[]` | `db`, `state` | 🟡 mock |
| `get_accounts` | — | `Account[]` | `db`, `state` | 🟡 mock |

> Estos 4 hoy devuelven datos hardcodeados. **Punto de integración de dorianvp:** se
> reemplaza el cuerpo por la lógica de zingolib **sin cambiar la firma** → el
> frontend no se entera. El progreso de sync conviene empujarlo por un **Channel**
> de Tauri (no por polling de `get_sync_status`).

### Autenticación / vault

| Comando | Args | Retorno | Errores | ¿Requiere unlock? | Estado |
|---|---|---|---|---|---|
| `wallet_status` | — | `WalletStatus` | `state`, `db` | no | ✅ |
| `setup_wallet` | `{ viewingKey: string, password: string }` | `void` | `invalid_viewing_key`, `weak_password`, `already_initialized`, `keychain`, `kdf`, `crypto`, `db`, `rng`, `state` | no (crea el vault) | ✅ |
| `unlock_wallet` | `{ password: string }` | `void` | `not_initialized`, `bad_credentials`, `keychain`, `kdf`, `crypto`, `db`, `state` | no (lo desbloquea) | ✅ |
| `lock_wallet` | — | `void` | `state` | — | ✅ |
| `change_password` | `{ oldPassword: string, newPassword: string }` | `void` | `weak_password`, `not_initialized`, `bad_credentials`, `keychain`, `kdf`, `crypto`, `db`, `state` | no (verifica la actual) | ✅ |

### Settings / endpoint

| Comando | Args | Retorno | Errores | Estado |
|---|---|---|---|---|
| `get_app_settings` | — | `AppSettings` | `db`, `state` | ✅ |
| `set_setting` | `{ key: string, value: string }` | `void` | `unknown_setting`, `db`, `state` | ✅ |
| `set_endpoint` | `{ endpoint: EndpointConfig }` | `void` | `invalid_endpoint`, `insecure_endpoint`, `serialize`, `db`, `state` | ✅ |
| `list_default_endpoints` | — | `NamedEndpoint[]` | — | ✅ |
| `validate_endpoint_live` | `{ endpoint: EndpointConfig }` | `EndpointInfo` | `invalid_endpoint`, `insecure_endpoint`, `endpoint_unreachable` | ✅ (async, red) |

> Los comandos de settings leen/escriben la tabla `settings` (no cifrada), así que
> **no requieren el vault desbloqueado** (necesario para el tema en login/setup).

> **`validate_endpoint_live` (PW-040, Fase 2 del core).** Validación **en vivo** del
> endpoint: chequeo estructural + handshake gRPC real `GetLightdInfo` contra el
> lightwalletd. Confirma que el server es alcanzable, habla el protocolo y qué
> cadena/altura sirve. Es **async** (red) y no toca la DB. El conector vive en
> `src-tauri/src/grpc.rs` (adaptado de `zingolib/src/grpc_connector.rs`: TLS webpki +
> timeout 10s; proveedor cripto rustls = `ring` vía feature `tonic/tls-ring`).
> `EndpointInfo = { chainName, blockHeight, vendor, version }`.

### Notificaciones (PW-051+)

| Comando | Args | Retorno | Errores | Estado |
|---|---|---|---|---|
| `notify_test` | — | `void` | `string` (fallo del backend) | 🟡 simulación |

> **Qué se notifica (decisión con dorianvp):** **solo transacciones nuevas**, nunca
> eventos de sincronización (sería ruidoso). Por eso hay un único tipo de notif/
> deep-link (`tx`).
>
> **Arquitectura (doc de dorianvp).** Las notificaciones siguen el modelo de
> *daemon residente*: el daemon (de dorianvp, aún no existe) sincroniza con la GUI
> cerrada y, al ver una **tx nueva**, dispara una notificación nativa. El clic abre
> una URI `pendrake://tx?account=…&txid=…` que el SO rutea de vuelta a la GUI vía
> `tauri-plugin-deep-link` + `tauri-plugin-single-instance` (`onOpenUrl` →
> navegación al historial con TanStack Router).
>
> El esquema `pendrake://` es **provisional** (lo define dorianvp). Vive en un solo
> lugar: `URI_SCHEME` en `src-tauri/src/notify/deeplink.rs` y su espejo en
> `src/lib/deeplink.ts`.
>
> `notify_test` es el **hook de simulación** hasta que exista el sync real: dispara
> una notificación nativa de prueba (toast WinRT en Windows, `org.freedesktop`
> en Linux, no-op en macOS). El módulo `notify` es **Tauri-free** a propósito, para
> mudarse al `wallet-daemon` cuando exista.

> **Nota de error:** a diferencia del resto, `notify_test` devuelve `Result<_, String>`
> (no `AppError`), por ser un comando de diagnóstico. Si se promueve a producción,
> alinear con `AppError`.

---

## Códigos de error (`AppError.code`)

| Código | Significado |
|---|---|
| `bad_credentials` | Contraseña incorrecta o falta la entrada del keychain (falla el AEAD). |
| `weak_password` | Contraseña < 8 caracteres. |
| `invalid_viewing_key` | Formato de VK no reconocido (chequeo estructural). |
| `already_initialized` / `not_initialized` | Estado del vault incompatible con la operación. |
| `invalid_endpoint` / `insecure_endpoint` | Endpoint mal formado / TLS off en host no-local. |
| `endpoint_unreachable` | El handshake gRPC en vivo (`validate_endpoint_live`) falló: server caído, TLS/DNS, o no habla el protocolo. |
| `unknown_setting` | Clave de setting fuera de la allowlist. |
| `keychain` | Error del OS keychain (crate `keyring`). |
| `db` | Error de SQLite (rusqlite). |
| `kdf` / `crypto` / `decrypt` / `rng` | Capas criptográficas (Argon2/HKDF / AEAD / descifrado / RNG). |
| `serialize` / `decode` | (De)serialización de datos. |
| `state` | Mutex del estado de la app envenenado (no debería ocurrir). |

---

## Tipos de datos (TS ↔ Rust)

```ts
type Pool = "transparent" | "sapling" | "orchard";
type SyncState = "idle" | "syncing" | "synced" | "error";
type TxDirection = "received" | "sent";

interface WalletBalance {
  totalZatoshis: string; transparent: string; sapling: string; orchard: string; // zatoshis
}
interface SyncStatus { state: SyncState; syncedBlocks: number; totalBlocks: number; tipHeight: number; }
interface TransactionRecord {
  txid: string; blockHeight: number; timestamp: number; // unix s
  direction: TxDirection; pool: Pool; valueZatoshis: string; confirmations: number;
}
interface WalletAddress { address: string; pool: Pool; }
interface Account { id: number; label: string; addresses: WalletAddress[]; }

interface WalletStatus { initialized: boolean; unlocked: boolean; }

interface EndpointConfig { host: string; port: number; useTls: boolean; }
interface NamedEndpoint { label: string; config: EndpointConfig; }
interface EndpointInfo { chainName: string; blockHeight: number; vendor: string; version: string; }
interface AppSettings {
  endpoint: EndpointConfig; theme: "light"|"dark"|"system"; currency: "USD"|"ARS";
  selectedAccountId: number | null; autoSyncOnStartup: boolean;
}
```

Definiciones en `src/types/wallet.ts` y `src/types/settings.ts` (espejo de
`src-tauri/src/models.rs`, `commands/*.rs`, `lightwalletd.rs`).

---

## Estado en Rust (para quien agregue comandos)

- El estado compartido vive en `AppState { db: Connection, session: Option<Dek> }`
  detrás de un `Mutex` (`src-tauri/src/state.rs`), inyectado con `tauri::State`.
- La `Dek` (clave de datos) está presente **solo con el vault desbloqueado**; se
  borra de memoria (zeroize) al hacer `lock_wallet`.
- Un comando que necesite descifrar/cifrar datos debe tomar la `Dek` de
  `guard.session` (error si es `None` → wallet bloqueada).

## Para la integración de la sync (dorianvp)

1. Reemplazar el cuerpo de `get_balance/get_sync_status/get_transactions/get_accounts`
   leyendo de las tablas `notes`/`transactions` (descifrando con la `Dek`) o del
   estado de zingolib. **Mantener las firmas.**
2. El endpoint seleccionado está en `get_app_settings().endpoint` (o `selected_endpoint`
   en `settings`). El cliente gRPC de zingolib hace el `GetLightdInfo` real (validación
   en vivo, PW-040) — ver la revisión de seguridad en `docs/decisiones-tecnicas.md`.
3. Para el progreso de sync: agregar un comando que arranque la sync y emita por
   **Channel** (`tauri::ipc::Channel`) el avance, en vez de que la UI haga polling.
