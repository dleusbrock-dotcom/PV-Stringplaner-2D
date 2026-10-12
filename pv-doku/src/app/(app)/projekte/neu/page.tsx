import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canEditRole } from "@/lib/status";
import { requireProfile } from "@/lib/supabase/server";
import NewProjectForm from "./NewProjectForm";

export const metadata: Metadata = { title: "Neues Projekt" };

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ import?: string }> }) {
  const { profile } = await requireProfile();
  if (!canEditRole(profile.role)) redirect("/");
  const { import: showImport } = await searchParams;
  return <NewProjectForm showImport={!!showImport} />;
}
