"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError("Anmeldung fehlgeschlagen. Bitte E-Mail-Adresse und Passwort prüfen.");
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid2" style={{ gridTemplateColumns: "1fr" }}>
      <label className="field">
        E-Mail-Adresse
        <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">
        Passwort
        <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <div className="alert err" role="alert">{error}</div>}
      <button className="btn primary" disabled={busy}>{busy ? "Anmelden …" : "Anmelden"}</button>
      <Link href="/passwort-vergessen" className="small">Passwort vergessen?</Link>
    </form>
  );
}
