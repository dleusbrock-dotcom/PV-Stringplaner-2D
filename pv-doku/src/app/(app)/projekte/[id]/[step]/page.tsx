import { notFound } from "next/navigation";
import StepView from "@/components/project/StepView";
import { PROJECT_STEPS, type ProjectStep } from "@/lib/constants";

export default async function StepPage({ params }: { params: Promise<{ id: string; step: string }> }) {
  const { step } = await params;
  if (!PROJECT_STEPS.some((s) => s.slug === step)) notFound();
  return <StepView step={step as ProjectStep} />;
}
