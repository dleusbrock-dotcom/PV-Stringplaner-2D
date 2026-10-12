import { ProjectProvider } from "@/components/project/ProjectContext";
import ProjectHeader from "@/components/project/ProjectHeader";
import { requireProfile } from "@/lib/supabase/server";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await requireProfile();
  return (
    <ProjectProvider projectId={id} role={profile.role} userId={profile.id}>
      <ProjectHeader />
      {children}
    </ProjectProvider>
  );
}
