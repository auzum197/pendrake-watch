import logo from "@/assets/pendrake-logo.svg?url";
import { Dashboard, type Wallet } from "./dashboard";
import type { IconName } from "../lib/icon-paths";
import { Icon } from "./icons";
import { LifeHashIcon } from "./shared";
import "../styles/window.css";

export function NavItem({
  icon,
  label,
  active,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className="frame-nav-item"
      aria-current={active ? "page" : undefined}
    >
      <Icon name={icon} className="size-4 shrink-0" />
      <span className="frame-nav-label">{label}</span>
    </button>
  );
}

export function MacWindow({ wallet }: { wallet: Wallet }) {
  return (
    <div className="mac-window">
      <aside className="mac-side">
        <div className="mac-lights" aria-hidden>
          <span className="is-close" />
          <span className="is-min" />
          <span className="is-zoom" />
        </div>
        <Icon name="sidebar" className="mac-rail" />
        <div className="mac-logo">
          <img src={logo} alt="" draggable={false} />
        </div>
        <div className="mac-wallet">
          <LifeHashIcon
            fingerprint={wallet.fingerprint}
            size={40}
            className="rounded-full"
          />
          <div className="mac-wallet-text">
            <p className="frame-wallet-name">{wallet.name}</p>
            <p className="frame-wallet-fp">{wallet.fingerprint.slice(0, 8)}</p>
          </div>
          <Icon name="chevron" className="size-4 text-white/40" />
        </div>
        <nav className="frame-nav" aria-label="Wallet">
          <NavItem icon="home" label="Home" active />
          <NavItem icon="activity" label="Activity" />
          <NavItem icon="notes" label="Notes" />
        </nav>
        <nav className="frame-nav mt-auto" aria-label="App">
          <NavItem icon="settings" label="Settings" />
          <NavItem icon="help" label="About" />
          <NavItem icon="lock" label="Sign Out" />
        </nav>
      </aside>
      <main className="mac-main">
        <Dashboard wallet={wallet} />
      </main>
    </div>
  );
}
