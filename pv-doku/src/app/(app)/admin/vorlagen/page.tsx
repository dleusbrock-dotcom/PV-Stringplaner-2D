import type { Metadata } from "next";
import type { Template } from "@/lib/types";
import { requireAdmin } from "../guard";
import TemplatesAdmin from "./TemplatesAdmin";

export const metadata: Metadata = { title: "Vorlagen" };

export default async function TemplatesPage() {
  const { supabase, profile } = await requireAdmin();
  const { data } = await supabase.from("templates").select("*").order("kind").order("sort");
  return <TemplatesAdmin initial={(data ?? []) as Template[]} companyId={profile.company_id} />;
}
