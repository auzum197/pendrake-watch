// First-launch splash. Held while StartGate probes the daemon (which spawns on
// first contact), so the app reads as starting rather than hanging. The mark and
// brand glow mirror the onboarding DragonPanel.
export function Splash() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-ink">
      <div className="absolute size-112 rounded-full bg-brand/30 blur-3xl" />
      <span className="relative animate-pulse font-heading text-[12rem] leading-none font-bold text-brand select-none">
        龙
      </span>
    </div>
  );
}
