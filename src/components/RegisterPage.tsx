import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { RegisterPayload, UserSession } from "../types";

type RegisterPageProps = {
  onRegister: (payload: RegisterPayload) => Promise<UserSession>;
};

function RegisterPage({ onRegister }: RegisterPageProps) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<RegisterPayload>({
    name: "",
    nrp: "",
    email: "",
    password: "",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onRegister({
        name: form.name.trim(),
        nrp: form.nrp.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      navigate("/sign-in", { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-shell">
      <article className="card auth-card">
        <h2>Register</h2>
        <form className="form" onSubmit={(event) => void submit(event)}>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Name"
            required
          />
          <input
            value={form.nrp}
            onChange={(event) => setForm({ ...form, nrp: event.target.value })}
            placeholder="NRP"
            required
          />
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
            placeholder="Password (min 8 chars)"
            minLength={8}
            required
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Registering..." : "Register"}
          </button>
        </form>
        <p>
          Already have an account? <Link to="/sign-in">Sign in</Link>
        </p>
      </article>
    </section>
  );
}

export default RegisterPage;
