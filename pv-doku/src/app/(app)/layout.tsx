import Link from "next/link";
import { ROLE_LABELS } from "@/lib/constants";
import { requireProfile } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();
  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand">PV-Doku</Link>
        <Link href="/">Projekte</Link>
        {profile.role === "admin" && <Link href="/admin">Verwaltung</Link>}
        <span className="spacer" />
        <span className="who" title={ROLE_LABELS[profile.role]}>
          {profile.full_name || profile.email}
        </span>
        <form action="/auth/logout" method="post">
          <button className="btn small" style={{ background: "transparent", color: "#fff", borderColor: "#41505e" }}>
            Abmelden
          </button>
        </form>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
