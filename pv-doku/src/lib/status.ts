import type { AppRole, ProjectStatus } from "./types";

// Spiegelt public.allowed_status_transitions() und die Rollenregeln in public.set_project_status().

export const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  entwurf: ["in_bearbeitung", "zur_pruefung"],
  in_bearbeitung: ["entwurf", "zur_pruefung"],
  zur_pruefung: ["in_bearbeitung", "nacharbeit", "abgeschlossen"],
  nacharbeit: ["in_bearbeitung", "zur_pruefung"],
  abgeschlossen: ["nacharbeit", "archiviert"],
  archiviert: ["abgeschlossen"],
};

export function isLocked(status: ProjectStatus): boolean {
  return status === "abgeschlossen" || status === "archiviert";
}

export function canEditRole(role: AppRole | null | undefined): boolean {
  return role === "admin" || role === "projektleiter" || role === "monteur";
}

export function canApproveRole(role: AppRole | null | undefined): boolean {
  return role === "admin" || role === "projektleiter";
}

/** Statuswechsel, die der Benutzer mit dieser Rolle ausführen darf. */
export function allowedTransitions(from: ProjectStatus, role: AppRole | null | undefined): ProjectStatus[] {
  if (!canEditRole(role)) return [];
  return STATUS_TRANSITIONS[from].filter((to) => {
    const needsApproval =
      to === "abgeschlossen" || to === "archiviert" || to === "nacharbeit" || isLocked(from);
    if (needsApproval && !canApproveRole(role)) return false;
    if (from === "archiviert" && role !== "admin") return false;
    return true;
  });
}

/** Wiedereröffnung eines abgeschlossenen Projekts erzeugt eine neue Version und braucht eine Begründung. */
export function requiresComment(from: ProjectStatus, to: ProjectStatus): boolean {
  return from === "abgeschlossen" && to === "nacharbeit";
}
