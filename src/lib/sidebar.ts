// Whether the sidebar is collapsed to its icon rail. Per device, survives reload.

const KEY = "pendrake.sidebarRail";

export function sidebarRail(): boolean {
  return (
    typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "on"
  );
}

export function setSidebarRail(on: boolean): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, on ? "on" : "off");
  }
}
