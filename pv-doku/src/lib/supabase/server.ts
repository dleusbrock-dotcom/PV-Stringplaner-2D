import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Profile } from "../types";
import { supabaseEnv } from "./env";

/** Supabase-Client für Server Components / Route Handler mit der Sitzung des Benutzers. */
export async function supabaseServer(): Promise<SupabaseClient> {
  const { url, key } = supabaseEnv();
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // In Server Components nicht setzbar – die Sitzung wird im Proxy aktualisiert.
        }
      },
    },
  });
}

/** Administrativer Client (umgeht RLS). Nur für die Benutzerverwaltung verwenden! */
export function supabaseAdmin(): SupabaseClient {
  const { url } = supabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY ist nicht gesetzt.");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Angemeldeten, aktiven Benutzer samt Profil laden – sonst zur Anmeldung umleiten. */
export async function requireProfile(): Promise<{ supabase: SupabaseClient; profile: Profile }> {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", auth.user.id).single<Profile>();
  if (!profile || !profile.active) redirect("/login?gesperrt=1");
  return { supabase, profile };
}

/** Variante für Route Handler: liefert null statt umzuleiten. */
export async function getProfile(): Promise<{ supabase: SupabaseClient; profile: Profile } | null> {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", auth.user.id).single<Profile>();
  if (!profile || !profile.active) return null;
  return { supabase, profile };
}
