import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getProfile, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Benutzerverwaltung (F-001): Einladen neuer Benutzer durch Administratoren.
// Rolle und Firma werden in app_metadata gesetzt (vom Benutzer nicht veränderbar).

const inviteSchema = z.object({
  email: z.email(),
  full_name: z.string().trim().max(200).default(""),
  role: z.enum(["admin", "projektleiter", "monteur", "betrachter"]),
});

export async function POST(request: NextRequest) {
  const auth = await getProfile();
  if (!auth) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (auth.profile.role !== "admin") return NextResponse.json({ error: "Nur für Administratoren" }, { status: 403 });

  const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingaben" }, { status: 400 });
  const { email, full_name, role } = parsed.data;

  let admin;
  try {
    admin = supabaseAdmin();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name },
    redirectTo: `${siteUrl}/auth/confirm?next=/auth/passwort`,
  });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Einladung fehlgeschlagen" }, { status: 422 });
  }
  // app_metadata nachträglich setzen und Profil angleichen (der Trigger legt es ggf. gesperrt an)
  await admin.auth.admin.updateUserById(data.user.id, { app_metadata: { role, company_id: auth.profile.company_id } });
  const { error: pErr } = await admin
    .from("profiles")
    .update({ role, active: true, full_name, company_id: auth.profile.company_id })
    .eq("id", data.user.id);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  return NextResponse.json({ id: data.user.id });
}
