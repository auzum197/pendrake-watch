import ReactDOM from "react-dom/client";
import { AboutCard } from "./components/app/about-card/about-card";
import "./index.css";

// Entry for the standalone About window. Kept minimal on purpose: it boots only the
// card, not the router or the daemon wiring the main window carries.
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<div className="flex min-h-screen cursor-default select-none items-center justify-center bg-ink text-foreground">
		<AboutCard />
	</div>,
);
