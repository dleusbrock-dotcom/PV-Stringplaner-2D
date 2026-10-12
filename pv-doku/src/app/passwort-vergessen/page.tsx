"use client";

import Link from "next/link";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/auth/passwort`,
    });
    // Aus Datenschutzgründen immer dieselbe Meldung (keine Auskunft, ob ein Konto existiert)
    setSent(true);
    setBusy(false);
  }

  return (
    <main className="container narrow" style={{ paddingTop: "8vh" }}>
      <div className="card">
        <h1>Passwort zurücksetzen</h1>
        {sent ? (
          <div className="alert ok">Falls ein Konto zu dieser Adresse existiert, wurde eine E-Mail mit einem Link versendet.</div>
        ) : (
          <form onSubmit={submit} className="row" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <label className="field">
              E-Mail-Adresse
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button className="btn primary" disabled={busy}>Link anfordern</button>
          </form>
        )}
        <p><Link href="/login">Zurück zur Anmeldung</Link></p>
      </div>
    </main>
  );
}
