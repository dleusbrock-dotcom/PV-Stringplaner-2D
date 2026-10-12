import type { Metadata } from "next";
import type { Company } from "@/lib/types";
import { requireAdmin } from "../guard";
import CompanySettings from "./CompanySettings";

export const metadata: Metadata = { title: "Firma & Bericht" };

export default async function SettingsPage() {
  const { supabase, profile } = await requireAdmin();
  const { data } = await supabase.from("companies").select("*").eq("id", profile.company_id).single<Company>();
  if (!data) return <div className="alert err">Firma nicht gefunden.</div>;
  return <CompanySettings initial={data} />;
}
