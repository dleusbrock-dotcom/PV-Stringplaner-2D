"use client";

import { supabaseBrowser } from "@/lib/supabase/client";

export const sb = () => supabaseBrowser();

/** Wandelt technische Fehlermeldungen in verständliche Hinweise um (NF-001). */
export function friendlyError(message: string): string {
  if (/row-level security|permission denied|42501/i.test(message)) {
    if (/gesperrt|abgeschlossen/i.test(message)) return message;
    return "Keine Berechtigung für diese Aktion.";
  }
  if (/duplicate key.*project_number/i.test(message)) return "Diese Projektnummer ist bereits vergeben.";
  if (/duplicate key.*strings/i.test(message)) return "Ein String mit diesem Namen existiert bereits.";
  if (/violates check constraint/i.test(message)) return "Ungültige Eingabe – bitte Werte prüfen.";
  if (/Failed to fetch|NetworkError/i.test(message)) return "Keine Verbindung zum Server. Bitte später erneut versuchen.";
  return message;
}

export async function must<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(friendlyError(error.message));
  return data as T;
}

/** Führt eine Aktion aus und zeigt Fehler per alert an (einfach, robust, auch auf Mobilgeräten). */
export async function attempt(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (e) {
    window.alert(e instanceof Error ? e.message : String(e));
    return false;
  }
}
