// Formatierung für Anzeige und Bericht (de-DE)

export function fmtDate(v: string | null | undefined): string {
  if (!v) return "–";
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  return Number.isNaN(d.getTime()) ? "–" : d.toLocaleDateString("de-DE");
}

export function fmtDateTime(v: string | null | undefined): string {
  if (!v) return "–";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "–"
    : d.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export function fmtNumber(v: number | null | undefined, digits = 2): string {
  if (v == null || Number.isNaN(v)) return "–";
  return v.toLocaleString("de-DE", { maximumFractionDigits: digits });
}

export function fmtKwp(v: number): string {
  return `${fmtNumber(v, 3)} kWp`;
}

export function clientName(p: {
  client_type: "person" | "firma";
  client_first_name: string;
  client_last_name: string;
  client_company: string;
}): string {
  return p.client_type === "firma"
    ? p.client_company
    : [p.client_first_name, p.client_last_name].filter(Boolean).join(" ");
}

export function addressLines(street: string, houseNo: string, zip: string, city: string, country: string): string[] {
  const l1 = [street, houseNo].filter(Boolean).join(" ");
  const l2 = [zip, city].filter(Boolean).join(" ");
  return [l1, l2, country && country !== "Deutschland" ? country : ""].filter(Boolean);
}

export function siteAddress(p: {
  site_differs: boolean;
  site_street: string;
  site_house_no: string;
  site_zip: string;
  site_city: string;
  site_country: string;
  client_street: string;
  client_house_no: string;
  client_zip: string;
  client_city: string;
  client_country: string;
}): string[] {
  return p.site_differs
    ? addressLines(p.site_street, p.site_house_no, p.site_zip, p.site_city, p.site_country)
    : addressLines(p.client_street, p.client_house_no, p.client_zip, p.client_city, p.client_country);
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Sicherer Dateiname für Speicherpfade und Downloads. */
export function safeFileName(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "datei"
  );
}
