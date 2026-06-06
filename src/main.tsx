import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { registerDeepLinks } from "@/lib/deeplink";
import "./index.css";
import "./App.css";
import "./transitions.css";

// Wire `pendrake://` notification clicks → router navigation (no-op outside Tauri).
void registerDeepLinks();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
