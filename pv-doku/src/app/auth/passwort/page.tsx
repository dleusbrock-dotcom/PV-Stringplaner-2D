"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 10) return setError("Das Passwort muss mindestens 10 Zeichen lang sein.");
    if (pw !== pw2) return setError("Die Passwörter stimmen nicht überein.");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError("Passwort konnte nicht gesetzt werden. Bitte den Link erneut anfordern.");
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="container narrow" style={{ paddingTop: "8vh" }}>
      <div className="card">
        <h1>Neues Passwort festlegen</h1>
        <form onSubmit={submit} className="row" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <label className="field">
            Neues Passwort (mind. 10 Zeichen)
            <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          </label>
          <label className="field">
            Passwort wiederholen
            <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          </label>
          {error && <div className="alert err" role="alert">{error}</div>}
          <button className="btn primary" disabled={busy}>Speichern</button>
        </form>
      </div>
    </main>
  );
}
