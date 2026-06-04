import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function AboutPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-6 px-4 pt-[6vh] text-center">
      <h1 className="font-heading text-4xl font-bold tracking-tight">About</h1>

      <p className="text-muted-foreground">
        Pendrake Watch is a Tauri + React desktop app. This page exists to
        demonstrate client-side routing with{" "}
        <span className="text-foreground font-medium">TanStack Router</span> and
        an animated view transition between routes.
      </p>

      <p className="text-muted-foreground">
        Navigate back and forth using the header to see the page transition.
      </p>

      <Button asChild>
        <Link to="/">Back home</Link>
      </Button>
    </div>
  );
}
