import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="login-shell">
      <div className="login-card">
        <span aria-hidden="true">
          <TriangleAlert className="size-10" strokeWidth={2} color="#e07098" />
        </span>
        <h1>Something went wrong</h1>
        <p>{error.message || "An unexpected error occurred. Try reloading the page."}</p>
      </div>
    </main>
  );
}
