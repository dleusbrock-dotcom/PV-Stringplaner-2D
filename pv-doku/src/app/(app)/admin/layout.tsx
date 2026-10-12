import Link from "next/link";
import { requireAdmin } from "./guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <h1>Verwaltung</h1>
      <nav className="tabs" aria-label="Verwaltung">
        <Link className="btn small" href="/admin">Benutzer</Link>
        <Link className="btn small" href="/admin/einstellungen">Firma &amp; Bericht</Link>
        <Link className="btn small" href="/admin/vorlagen">Checklisten- &amp; Prüfvorlagen</Link>
      </nav>
      {children}
    </>
  );
}
