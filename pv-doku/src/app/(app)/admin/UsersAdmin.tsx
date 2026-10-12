"use client";

import { useState } from "react";
import { friendlyError } from "@/components/project/db";
import { ROLE_LABELS } from "@/lib/constants";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { AppRole, Profile } from "@/lib/types";

const ROLES = Object.keys(ROLE_LABELS) as AppRole[];

export default function UsersAdmin({ initial, selfId }: { initial: Profile[]; selfId: string }) {
  const [users, setUsers] = useState(initial);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AppRole>("monteur");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function patch(id: string, p: Partial<Profile>) {
    const { data, error } = await supabaseBrowser().from("profiles").update(p).eq("id", id).select().single<Profile>();
    if (error || !data) return setMsg({ kind: "err", text: friendlyError(error?.message ?? "Fehler") });
    setUsers((u) => u.map((x) => (x.id === id ? data : x)));
    setMsg({ kind: "ok", text: "Gespeichert." });
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), full_name: name.trim(), role }),
    });
    const json = await res.json();
    if (!res.ok) return setMsg({ kind: "err", text: json.error });
    setMsg({ kind: "ok", text: `Einladung an ${email} versendet.` });
    setEmail("");
    setName("");
    const { data } = await supabaseBrowser().from("profiles").select("*").order("full_name");
    if (data) setUsers(data as Profile[]);
  }

  return (
    <>
      <form className="card" onSubmit={invite}>
        <h2 style={{ marginTop: 0 }}>Benutzer einladen</h2>
        <div className="grid3">
          <label className="field">E-Mail-Adresse<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="field">Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field">
            Rolle
            <select value={role} onChange={(e) => setRole(e.target.value as AppRole)}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </label>
        </div>
        <p className="muted small">Die Person erhält eine E-Mail und legt ihr Passwort selbst fest. Eine Selbstregistrierung ohne Einladung erhält keinen Zugriff.</p>
        <button className="btn primary">Einladen</button>
      </form>
      {msg && <div className={`alert ${msg.kind}`} role="status">{msg.text}</div>}
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table className="list">
          <thead><tr><th>Name</th><th>E-Mail</th><th>Rolle</th><th>Zugang</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <input
                    defaultValue={u.full_name}
                    aria-label={`Name ${u.email}`}
                    onBlur={(e) => e.target.value !== u.full_name && void patch(u.id, { full_name: e.target.value })}
                  />
                </td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    disabled={u.id === selfId}
                    aria-label={`Rolle ${u.email}`}
                    onChange={(e) => void patch(u.id, { role: e.target.value as AppRole })}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </td>
                <td>
                  <label className="check">
                    <input type="checkbox" checked={u.active} disabled={u.id === selfId} onChange={(e) => void patch(u.id, { active: e.target.checked })} />
                    {u.active ? "aktiv" : "gesperrt"}
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
