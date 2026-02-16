import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import type { LoginPayload, UserSession } from "../types";

type SignInPageProps = {
  onLogin: (payload: LoginPayload) => Promise<UserSession>;
};

function SignInPage({ onLogin }: SignInPageProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<LoginPayload>({
    email: "",
    password: "",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onLogin({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-shell">
      <article className="card auth-card">
        <h2>Sign in</h2>
        <form className="form" onSubmit={(event) => void submit(event)}>
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
            placeholder="Email"
            required
          />
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
            placeholder="Password"
            required
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p>
          No account yet? <Link to="/register">Register</Link>
        </p>
      </article>
    </section>
  );
}

export default SignInPage;
