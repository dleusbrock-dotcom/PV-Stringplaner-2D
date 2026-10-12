"use client";

import type { InputHTMLAttributes } from "react";

// Einheitliche, beschriftete Eingabefelder (NF-008: verständliche Beschriftungen)

type Base = { label: string; required?: boolean; hint?: string; className?: string };

export function TextField({
  label,
  required,
  hint,
  className,
  value,
  onValue,
  ...rest
}: Base & { value: string | number | null | undefined; onValue: (v: string) => void } & Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "required"
  >) {
  const missing = required && (value == null || String(value).trim() === "");
  return (
    <label className={`field ${className ?? ""}`}>
      <span>
        {label} {required && <span className="req" aria-hidden>*</span>}
      </span>
      <input
        {...rest}
        value={value ?? ""}
        aria-required={required}
        aria-invalid={missing ? true : undefined}
        onChange={(e) => onValue(e.target.value)}
      />
      {hint && <span className="muted small" style={{ fontWeight: 400 }}>{hint}</span>}
    </label>
  );
}

export function NumberField({
  label,
  required,
  hint,
  className,
  value,
  onValue,
  ...rest
}: Base & { value: number | null | undefined; onValue: (v: number | null) => void } & Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "required" | "type"
  >) {
  return (
    <TextField
      {...rest}
      label={label}
      required={required}
      hint={hint}
      className={className}
      type="number"
      inputMode="decimal"
      value={value ?? ""}
      onValue={(v) => {
        const n = v === "" ? null : Number(v.replace(",", "."));
        onValue(n == null || Number.isNaN(n) ? null : n);
      }}
    />
  );
}

export function SelectField<V extends string>({
  label,
  required,
  className,
  value,
  onValue,
  options,
  placeholder,
  disabled,
}: Base & {
  value: V | null | undefined;
  onValue: (v: V | null) => void;
  options: { value: V; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`field ${className ?? ""}`}>
      <span>
        {label} {required && <span className="req" aria-hidden>*</span>}
      </span>
      <select
        value={value ?? ""}
        disabled={disabled}
        aria-required={required}
        aria-invalid={required && !value ? true : undefined}
        onChange={(e) => onValue((e.target.value || null) as V | null)}
      >
        <option value="">{placeholder ?? "– bitte wählen –"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function TextArea({
  label,
  className,
  value,
  onValue,
  disabled,
  rows,
}: Base & { value: string; onValue: (v: string) => void; disabled?: boolean; rows?: number }) {
  return (
    <label className={`field ${className ?? ""}`}>
      {label}
      <textarea value={value} disabled={disabled} rows={rows} onChange={(e) => onValue(e.target.value)} />
    </label>
  );
}
