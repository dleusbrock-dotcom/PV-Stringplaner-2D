"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

// Automatisches Speichern mit lokalem Entwurf und Konflikterkennung (F-021).
// - Jede Änderung wird sofort lokal (localStorage) gesichert und verzögert gespeichert.
// - Gespeichert wird nur, wenn updated_at unverändert ist – sonst wird ein Konflikt angezeigt,
//   statt fremde Änderungen unbemerkt zu überschreiben.
// - Bei Verbindungsabbruch bleibt der Entwurf erhalten und wird bei "online" erneut gesendet.

export type SaveState = "saved" | "dirty" | "saving" | "offline" | "conflict" | "error";

interface Row {
  id: string;
  updated_at?: string;
}

const DRAFT_PREFIX = "pvdoku:draft:";

function readDraft<T>(key: string): { patch: Partial<T>; base?: string } | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAutosave<T extends Row>(
  table: string,
  row: T,
  onSaved: (row: T) => void,
  opts: { delay?: number; disabled?: boolean } = {},
) {
  const delay = opts.delay ?? 800;
  const draftKey = `${DRAFT_PREFIX}${table}:${row.id}`;
  const [values, setValues] = useState<T>(row);
  const [state, setState] = useState<SaveState>("saved");
  const [message, setMessage] = useState<string | null>(null);
  const pending = useRef<Partial<T>>({});
  const base = useRef<string | undefined>(row.updated_at);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const again = useRef(false);
  const flushRef = useRef<(force?: boolean) => Promise<void>>(async () => {});
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const flush = useCallback(
    async (force = false) => {
      if (timer.current) clearTimeout(timer.current);
      const patch = pending.current;
      if (Object.keys(patch).length === 0) return;
      if (inFlight.current) {
        again.current = true;
        return;
      }
      inFlight.current = true;
      setState("saving");
      let q = supabaseBrowser().from(table).update(patch as Record<string, unknown>).eq("id", row.id);
      if (!force && base.current) q = q.eq("updated_at", base.current);
      const { data, error } = await q.select().maybeSingle<T>();
      inFlight.current = false;
      if (again.current) {
        again.current = false;
        if (!error && data) setTimeout(() => void flushRef.current(), 0);
      }
      if (error) {
        const offline = typeof navigator !== "undefined" && !navigator.onLine;
        const network = offline || /fetch|network/i.test(error.message);
        setState(network ? "offline" : "error");
        setMessage(network ? "Keine Verbindung – Änderungen sind lokal gesichert." : error.message);
        return;
      }
      if (!data) {
        setState("conflict");
        setMessage("Der Datensatz wurde zwischenzeitlich von anderer Stelle geändert.");
        return;
      }
      // Erfolgreich: nur die gesendeten Felder als gespeichert markieren
      const sent = patch;
      const rest: Partial<T> = {};
      for (const k of Object.keys(pending.current) as (keyof T)[]) {
        if (pending.current[k] !== sent[k]) rest[k] = pending.current[k];
      }
      pending.current = rest;
      base.current = data.updated_at;
      onSavedRef.current(data);
      if (Object.keys(rest).length === 0) {
        try {
          localStorage.removeItem(draftKey);
        } catch {}
        setState("saved");
        setMessage(null);
      } else {
        setState("dirty");
      }
    },
    [table, row.id, draftKey],
  );
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  // Lokalen Entwurf nach Neuladen wiederherstellen
  useEffect(() => {
    const draft = readDraft<T>(draftKey);
    if (draft && Object.keys(draft.patch).length > 0 && !opts.disabled) {
      pending.current = draft.patch;
      base.current = draft.base ?? row.updated_at;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValues((v) => ({ ...v, ...draft.patch }));
      setState("dirty");
      setMessage("Nicht gespeicherte Änderungen wurden wiederhergestellt.");
      timer.current = setTimeout(() => void flush(), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    const retry = () => {
      if (Object.keys(pending.current).length > 0) void flush();
    };
    window.addEventListener("online", retry);
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("online", retry);
      window.removeEventListener("beforeunload", beforeUnload);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flush]);

  const set = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      if (opts.disabled) return;
      setValues((v) => ({ ...v, [key]: value }));
      pending.current = { ...pending.current, [key]: value };
      try {
        localStorage.setItem(draftKey, JSON.stringify({ patch: pending.current, base: base.current }));
      } catch {}
      setState("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delay);
    },
    [draftKey, delay, flush, opts.disabled],
  );

  /** Konfliktlösung: eigene Änderungen trotzdem übernehmen. */
  const overwrite = useCallback(() => void flush(true), [flush]);

  /** Konfliktlösung: eigene Änderungen verwerfen. */
  const discard = useCallback(() => {
    pending.current = {};
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setState("saved");
    setMessage(null);
  }, [draftKey]);

  return { values, set, state, message, flush, overwrite, discard };
}

export function SaveIndicator({
  state,
  message,
  onOverwrite,
  onDiscard,
}: {
  state: SaveState;
  message: string | null;
  onOverwrite?: () => void;
  onDiscard?: () => void;
}) {
  const text: Record<SaveState, string> = {
    saved: "✓ gespeichert",
    dirty: "… ungespeichert",
    saving: "speichert …",
    offline: "⚠ offline – lokal gesichert",
    conflict: "⚠ Konflikt",
    error: "⚠ Fehler beim Speichern",
  };
  return (
    <div aria-live="polite">
      <div className={`save-state ${state === "dirty" || state === "saving" ? "dirty" : state === "saved" ? "" : "error"}`}>
        {text[state]}
      </div>
      {message && state !== "saved" && (
        <div className={`alert ${state === "conflict" || state === "error" ? "err" : "warn"} small`}>
          {message}
          {state === "conflict" && (
            <div className="row" style={{ marginTop: "0.4rem" }}>
              <button type="button" className="btn small" onClick={onOverwrite}>Meine Änderungen übernehmen</button>
              <button type="button" className="btn small" onClick={onDiscard}>Verwerfen und neu laden</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
