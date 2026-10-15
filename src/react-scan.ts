// Highlights re-renders in dev when VITE_REACT_SCAN=1. main.tsx imports this first so
// react-scan installs its hook before react-dom loads. Production builds drop the import.
// react-scan checks react-grab.com for a newer version on start, which is the one
// egress from the UI outside ADR 0008, so it stays opt-in.
if (import.meta.env.DEV && import.meta.env.VITE_REACT_SCAN === "1") {
  const { scan } = await import("react-scan");
  scan();
}

export {};
