import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  return (
    <main className="login-shell">
      <div className="login-card">
        <img src="/ornaments/cross.png" alt="" width={36} height={54} />
        <h1>Sign in</h1>
        <p>Operator access for the tournament desk.</p>
        {authEnabled ? (
          GROK_PROVIDERS.map((p) => (
            <button
              key={p.providerId}
              type="button"
              className="login-btn"
              onClick={() => signIn(p.providerId, { callbackURL: "/" })}
            >
              Continue with {p.label}
            </button>
          ))
        ) : (
          <p>Sign-in is disabled.</p>
        )}
        <Link to="/" className="back-link">
          Back to control panel
        </Link>
      </div>
    </main>
  );
}
