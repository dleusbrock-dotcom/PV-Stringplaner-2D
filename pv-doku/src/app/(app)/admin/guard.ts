import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/supabase/server";

export async function requireAdmin() {
  const ctx = await requireProfile();
  if (ctx.profile.role !== "admin") redirect("/");
  return ctx;
}
