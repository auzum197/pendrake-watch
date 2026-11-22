import type { Accessor } from "solid-js";
import logo from "@/assets/pendrake-logo.svg";
import { Dashboard, type Row, type WalletSim } from "./fragments";
import { Icon, type IconName } from "./icons";
import { LifeHashIcon } from "./shared";
import "./window.css";

export const FRAME_W = 1180;
export const FRAME_H = 900;

function NavItem(props: { icon: IconName; label: string; active?: boolean }) {
  return (
    <button
      type="button"
      class="frame-nav-item"
      aria-current={props.active ? "page" : undefined}
    >
      <Icon name={props.icon} class="size-4 shrink-0" />
      <span class="frame-nav-label">{props.label}</span>
    </button>
  );
}

export function MacWindow(props: { wallet: WalletSim; rows: Accessor<Row[]> }) {
  return (
    <div class="mac-window">
      <aside class="mac-side">
        <div class="mac-lights" aria-hidden>
          <span class="is-close" />
          <span class="is-min" />
          <span class="is-zoom" />
        </div>
        <Icon name="sidebar" class="mac-rail" />
        <div class="mac-logo">
          <img src={logo} alt="" draggable={false} />
        </div>
        <div class="mac-wallet">
          <LifeHashIcon
            fingerprint={props.wallet.fp}
            size={40}
            class="rounded-full"
          />
          <div class="mac-wallet-text">
            <p class="frame-wallet-name">{props.wallet.name}</p>
            <p class="frame-wallet-fp">{props.wallet.fp.slice(0, 8)}</p>
          </div>
          <Icon name="chevron" class="size-4 text-white/40" />
        </div>
        <nav class="frame-nav">
          <NavItem icon="home" label="Home" active />
          <NavItem icon="activity" label="Activity" />
          <NavItem icon="notes" label="Notes" />
        </nav>
        <nav class="frame-nav mt-auto">
          <NavItem icon="settings" label="Settings" />
          <NavItem icon="help" label="About" />
          <NavItem icon="lock" label="Sign Out" />
        </nav>
      </aside>
      <main class="mac-main">
        <Dashboard wallet={props.wallet} rows={props.rows} limit={4} />
      </main>
    </div>
  );
}
