import type { Metadata } from "next";
import type { Profile } from "@/lib/types";
import { requireAdmin } from "./guard";
import UsersAdmin from "./UsersAdmin";

export const metadata: Metadata = { title: "Benutzer" };

export default async function UsersPage() {
  const { supabase, profile } = await requireAdmin();
  const { data } = await supabase.from("profiles").select("*").order("full_name");
  return <UsersAdmin initial={(data ?? []) as Profile[]} selfId={profile.id} />;
}
