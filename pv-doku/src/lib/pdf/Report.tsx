/* eslint-disable jsx-a11y/alt-text -- react-pdf-Image ist kein HTML-Bild */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  CHECK_STATUS_LABELS,
  COMPONENT_LABELS,
  DEFECT_PRIORITY_LABELS,
  DEFECT_STATUS_LABELS,
  ORIENTATION_LABELS,
  PHOTO_LABELS,
  STATUS_LABELS,
  TEST_STATUS_LABELS,
} from "../constants";
import { addressLines, clientName, fmtDate, fmtDateTime, fmtKwp, fmtNumber, siteAddress } from "../format";
import { cellKey, countModules, displayDims, displayToLogical, powerKwp, rowLabel, stringStats, toCellMap, type Rotation } from "../grid";
import type { ProjectSnapshot, RoofWithCells } from "../types";
import { pdfText as t } from "./text";

// PDF-Projektdokumentation (F-019) – versionierte Berichtsvorlage
export const REPORT_TEMPLATE_VERSION = "1.0";

export interface ReportImages {
  logo?: { data: Buffer; format: "png" | "jpg" };
  photos: Record<string, { data: Buffer; format: "png" | "jpg" }>;
}

const C = { ink: "#14202b", soft: "#5b6b7a", line: "#cfd8e1", brand: "#0f5ea8", err: "#b91c1c", errBg: "#fde8e8", module: "#1d4ed8" };

const s = StyleSheet.create({
  page: { paddingTop: 64, paddingBottom: 56, paddingHorizontal: 40, fontSize: 9.5, fontFamily: "Helvetica", color: C.ink, lineHeight: 1.35 },
  header: { position: "absolute", top: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 0.7, borderBottomColor: C.line, paddingBottom: 6 },
  headerText: { fontSize: 8, color: C.soft },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.soft, borderTopWidth: 0.7, borderTopColor: C.line, paddingTop: 5 },
  h1: { fontSize: 22, fontFamily: "Helvetica-Bold", marginBottom: 10, lineHeight: 1.25 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.brand, marginTop: 14, marginBottom: 6 },
  h3: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4 },
  muted: { color: C.soft },
  kv: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 2.5 },
  k: { width: "34%", color: C.soft },
  v: { width: "66%" },
  table: { borderTopWidth: 0.7, borderTopColor: C.line },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 3 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8, color: C.soft },
  kpis: { flexDirection: "row", gap: 8, marginVertical: 6 },
  kpi: { flexGrow: 1, backgroundColor: "#eef3f8", borderRadius: 4, padding: 8 },
  kpiVal: { fontSize: 14, fontFamily: "Helvetica-Bold", lineHeight: 1.3, marginBottom: 2 },
  draft: { position: "absolute", top: 330, left: 60, fontSize: 90, color: "#e11d48", opacity: 0.12, transform: "rotate(-30deg)", fontFamily: "Helvetica-Bold" },
  alert: { backgroundColor: C.errBg, borderLeftWidth: 3, borderLeftColor: C.err, padding: 6, marginVertical: 4 },
});

function KV({ k, v }: { k: string; v: unknown }) {
  return (
    <View style={s.kv} wrap={false}>
      <Text style={s.k}>{t(k)}</Text>
      <Text style={s.v}>{t(v == null || v === "" ? "–" : v)}</Text>
    </View>
  );
}

function Table({ cols, rows }: { cols: { label: string; w: string }[]; rows: unknown[][] }) {
  return (
    <View style={s.table}>
      <View style={s.tr} fixed>
        {cols.map((c) => (
          <Text key={c.label} style={[s.th, { width: c.w, paddingRight: 4 }]}>{t(c.label)}</Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={s.tr} wrap={false}>
          {r.map((cell, j) => (
            <Text key={j} style={{ width: cols[j].w, paddingRight: 4 }}>{t(cell == null || cell === "" ? "–" : cell)}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function RoofGrid({ roof, snap }: { roof: RoofWithCells; snap: ProjectSnapshot }) {
  const rotation = roof.view_rotation as Rotation;
  const dims = displayDims(roof.grid_rows, roof.grid_cols, rotation);
  const swapped = rotation === 90 || rotation === 270;
  const landscape = (roof.module_orientation === "quer") !== swapped;
  const ratio = landscape ? 0.62 : 1.6; // Höhe/Breite einer Zelle
  const maxW = 500;
  const maxH = 330;
  const axis = 14;
  const cw = Math.min(30, (maxW - axis) / dims.cols, (maxH - axis) / dims.rows / ratio);
  const ch = cw * ratio;
  const map = toCellMap(roof.cells);
  const strings = new Map(snap.strings.map((x) => [x.id, x]));
  const fs = Math.max(4, Math.min(7, cw / 3.2));

  return (
    <View wrap={false} style={{ marginVertical: 6 }}>
      <View style={{ flexDirection: "row", marginLeft: axis }}>
        {Array.from({ length: dims.cols }, (_, j) => {
          const [r, c] = displayToLogical(0, j, roof.grid_rows, roof.grid_cols, rotation);
          return <Text key={j} style={{ width: cw, fontSize: 5.5, textAlign: "center", color: C.soft }}>{swapped ? rowLabel(r) : c + 1}</Text>;
        })}
      </View>
      {Array.from({ length: dims.rows }, (_, i) => {
        const [r0, c0] = displayToLogical(i, 0, roof.grid_rows, roof.grid_cols, rotation);
        return (
          <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ width: axis, fontSize: 5.5, color: C.soft }}>{swapped ? c0 + 1 : rowLabel(r0)}</Text>
            {Array.from({ length: dims.cols }, (_, j) => {
              const [r, c] = displayToLogical(i, j, roof.grid_rows, roof.grid_cols, rotation);
              const cell = map.get(cellKey(r, c));
              const str = cell?.string_id ? strings.get(cell.string_id) : undefined;
              const style =
                cell?.state === "modul"
                  ? { backgroundColor: str?.color ?? C.module, borderColor: "#0b2f73", borderStyle: "solid" as const }
                  : cell?.state === "hindernis"
                    ? { backgroundColor: "#d1d5db", borderColor: "#6b7280", borderStyle: "solid" as const }
                    : cell?.state === "gesperrt"
                      ? { backgroundColor: "#fee2e2", borderColor: "#ef4444", borderStyle: "solid" as const }
                      : { backgroundColor: "#ffffff", borderColor: "#b6c2ce", borderStyle: "dashed" as const };
              const label = cell?.state === "modul" ? str?.name ?? "" : cell?.label || (cell?.state === "gesperrt" ? "x" : "");
              return (
                <View key={j} style={{ width: cw - 1.2, height: ch - 1.2, margin: 0.6, borderWidth: 0.6, justifyContent: "center", alignItems: "center", ...style }}>
                  {label ? (
                    <Text style={{ fontSize: fs, color: cell?.state === "modul" ? "#fff" : "#111", textAlign: "center" }}>{t(label.slice(0, 8))}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      })}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
        <Legend color={C.module} label="Modul (ohne String)" />
        <Legend color="#d1d5db" label="Hindernis/Freifläche" />
        <Legend color="#fee2e2" label="gesperrt" />
        {snap.strings
          .filter((x) => roof.cells.some((c) => c.string_id === x.id))
          .map((x) => <Legend key={x.id} color={x.color} label={`String ${x.name}`} />)}
        <Text style={{ fontSize: 7, color: C.soft }}>Ansicht {rotation}° · Module {roof.module_orientation === "quer" ? "quer" : "hochkant"}</Text>
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <View style={{ width: 8, height: 8, backgroundColor: color, borderWidth: 0.5, borderColor: "#555" }} />
      <Text style={{ fontSize: 7 }}>{t(label)}</Text>
    </View>
  );
}

function Frame({
  snap,
  draft,
  generatedAt,
  children,
}: {
  snap: ProjectSnapshot;
  draft: boolean;
  generatedAt: Date;
  children: React.ReactNode;
}) {
  const company = snap.company;
  return (
    <>
      <View style={s.header} fixed>
        <Text style={s.headerText}>{t(company?.report_header || company?.name || "")}</Text>
        <Text style={s.headerText}>{t(`Anlagendokumentation ${snap.project.project_number}`)}</Text>
      </View>
      {draft && <Text style={s.draft} fixed>ENTWURF</Text>}
      {children}
      <View style={s.footer} fixed>
        <Text>{t(company?.report_footer || "")}</Text>
        <Text
          render={({ pageNumber, totalPages }) =>
            t(`Version ${snap.project.version} · erstellt ${fmtDateTime(generatedAt.toISOString())} · Seite ${pageNumber}/${totalPages}`)
          }
        />
      </View>
    </>
  );
}

export function Report({
  snap,
  images,
  draft,
  generatedAt,
  generatedBy,
}: {
  snap: ProjectSnapshot;
  images: ReportImages;
  draft: boolean;
  generatedAt: Date;
  generatedBy: string;
}) {
  const p = snap.project;
  const mt = new Map(snap.module_types.map((m) => [m.id, m]));
  const roofKwp = (r: RoofWithCells) => powerKwp(countModules(r.cells), r.module_type_id ? mt.get(r.module_type_id)?.power_wp : 0);
  const totalModules = snap.roofs.reduce((a, r) => a + countModules(r.cells), 0);
  const totalKwp = snap.roofs.reduce((a, r) => a + roofKwp(r), 0);
  const comps = new Map(snap.components.map((c) => [c.id, c]));
  const stats = stringStats(snap.roofs.flatMap((r) => r.cells), snap.strings);
  const openDefects = snap.defects.filter((d) => d.status !== "erledigt");
  const photos = snap.files.filter((f) => images.photos[f.id]);
  const company = snap.company;

  return (
    <Document title={t(`Anlagendokumentation ${p.project_number}`)} author={t(company?.name ?? "")} subject="Photovoltaik-Anlagendokumentation" creator="PV-Doku" language="de">
      {/* Deckblatt */}
      <Page size="A4" style={s.page}>
        <Frame snap={snap} draft={draft} generatedAt={generatedAt}>
          <View style={{ marginTop: 40 }}>
            {images.logo && <Image src={images.logo} style={{ height: 60, objectFit: "contain", alignSelf: "flex-start", marginBottom: 30 }} />}
            {!images.logo && company?.name && <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 30 }}>{t(company.name)}</Text>}
            <Text style={s.h1}>Anlagendokumentation Photovoltaik</Text>
            <Text style={{ fontSize: 14, marginBottom: 24 }}>{t(`${p.project_number} – ${p.name}`)}</Text>
            <View style={s.kpis}>
              <View style={s.kpi}><Text style={s.kpiVal}>{t(fmtKwp(totalKwp))}</Text><Text style={s.muted}>installierte Leistung</Text></View>
              <View style={s.kpi}><Text style={s.kpiVal}>{totalModules}</Text><Text style={s.muted}>Module</Text></View>
              <View style={s.kpi}><Text style={s.kpiVal}>{snap.roofs.length}</Text><Text style={s.muted}>Dachflächen</Text></View>
            </View>
            <View style={{ marginTop: 18 }}>
              <KV k="Bauherr" v={clientName(p)} />
              <KV k="Anlagenstandort" v={siteAddress(p).join(", ")} />
              <KV k="Installationsdatum" v={fmtDate(p.installation_date)} />
              <KV k="Ausführendes Unternehmen" v={p.contractor} />
              <KV k="Verantwortlicher Monteur" v={p.installer_name} />
              <KV k="Status / Version" v={`${STATUS_LABELS[p.status]} / Version ${p.version}`} />
              <KV k="Bericht erstellt" v={`${fmtDateTime(generatedAt.toISOString())} von ${generatedBy}`} />
            </View>
            {draft && (
              <View style={[s.alert, { marginTop: 18 }]}>
                <Text>Entwurf – das Projekt ist noch nicht abgeschlossen und freigegeben.</Text>
              </View>
            )}
          </View>
        </Frame>
      </Page>

      <Page size="A4" style={s.page}>
        <Frame snap={snap} draft={draft} generatedAt={generatedAt}>
          <Text style={s.h2}>1. Projekt- und Bauherrendaten</Text>
          <KV k="Projektnummer" v={p.project_number} />
          <KV k="Projektname" v={p.name} />
          <KV k="Installationsdatum" v={fmtDate(p.installation_date)} />
          <KV k="Ausführendes Unternehmen" v={p.contractor} />
          <KV k="Verantwortlicher Monteur" v={p.installer_name} />
          <KV k="Bauherr" v={clientName(p) + (p.client_type === "firma" && p.client_last_name ? ` (Ansprechpartner: ${p.client_last_name})` : "")} />
          <KV k="Anschrift Bauherr" v={addressLines(p.client_street, p.client_house_no, p.client_zip, p.client_city, p.client_country).join(", ")} />
          <KV k="Telefon / E-Mail" v={[p.client_phone, p.client_email].filter(Boolean).join(" / ")} />
          <KV k="Anlagenanschrift" v={p.site_differs ? siteAddress(p).join(", ") : "wie Anschrift Bauherr"} />
          {p.site_lat != null && p.site_lng != null && <KV k="Geokoordinaten" v={`${p.site_lat}, ${p.site_lng}`} />}
          {p.notes ? <KV k="Notizen" v={p.notes} /> : null}

          <Text style={s.h2}>2. Anlagenübersicht</Text>
          <View style={s.kpis}>
            <View style={s.kpi}><Text style={s.kpiVal}>{t(fmtKwp(totalKwp))}</Text><Text style={s.muted}>Gesamtleistung</Text></View>
            <View style={s.kpi}><Text style={s.kpiVal}>{totalModules}</Text><Text style={s.muted}>Module</Text></View>
            <View style={s.kpi}><Text style={s.kpiVal}>{snap.components.filter((c) => c.category === "wechselrichter").length}</Text><Text style={s.muted}>Wechselrichter</Text></View>
          </View>
          <Table
            cols={[{ label: "Dachfläche", w: "22%" }, { label: "Richtung", w: "13%" }, { label: "Neigung", w: "10%" }, { label: "Modultyp", w: "27%" }, { label: "Module", w: "10%" }, { label: "Leistung", w: "18%" }]}
            rows={snap.roofs.map((r) => {
              const m = r.module_type_id ? mt.get(r.module_type_id) : undefined;
              return [r.name, r.orientation ? ORIENTATION_LABELS[r.orientation] : "", r.tilt_deg != null ? `${fmtNumber(r.tilt_deg, 1)}°` : "",
                m ? `${m.manufacturer} ${m.model} (${m.power_wp} Wp)` : "", countModules(r.cells), fmtKwp(roofKwp(r))];
            })}
          />
          {snap.strings.length > 0 && (
            <>
              <Text style={s.h3}>Strings und Wechselrichter-Zuordnung</Text>
              <Table
                cols={[{ label: "String", w: "15%" }, { label: "Wechselrichter", w: "45%" }, { label: "MPP-Tracker", w: "20%" }, { label: "Module", w: "20%" }]}
                rows={stats.perString.map(({ string: x, modules }) => {
                  const inv = x.inverter_id ? comps.get(x.inverter_id) : undefined;
                  return [x.name, inv ? `${inv.manufacturer} ${inv.model} ${inv.serial_no ? `(SN ${inv.serial_no})` : ""}` : "", x.mpp_tracker, modules];
                })}
              />
              <Text style={[s.muted, { marginTop: 3 }]}>{t(`Zugeordnet: ${stats.total - stats.unassigned} von ${stats.total} Modulen.`)}</Text>
            </>
          )}
        </Frame>
      </Page>

      <Page size="A4" style={s.page}>
        <Frame snap={snap} draft={draft} generatedAt={generatedAt}>
          <Text style={s.h2}>3. Dachflächen und Modulbelegung</Text>
          {snap.roofs.map((r, idx) => {
            const m = r.module_type_id ? mt.get(r.module_type_id) : undefined;
            const serials = r.cells.filter((c) => c.serial_no);
            // Jede Dachfläche beginnt auf einer eigenen Seite, damit Daten und Raster zusammenbleiben
            return (
              <View key={r.id} style={{ marginBottom: 14 }} break={idx > 0}>
                <Text style={s.h3}>{t(`${r.name}${r.orientation ? ` – ${ORIENTATION_LABELS[r.orientation]}` : ""}`)}</Text>
                <View style={{ flexDirection: "row", gap: 16 }}>
                  <View style={{ width: "50%" }}>
                    <KV k="Dachform" v={r.roof_type} />
                    <KV k="Neigung" v={r.tilt_deg != null ? `${fmtNumber(r.tilt_deg, 1)}°` : ""} />
                    <KV k="Eindeckung" v={r.covering} />
                    <KV k="Montageart" v={r.mounting} />
                  </View>
                  <View style={{ width: "50%" }}>
                    <KV k="Maße" v={r.width_m || r.length_m ? `${fmtNumber(r.width_m)} m × ${fmtNumber(r.length_m)} m` : ""} />
                    <KV k="Modul" v={m ? `${m.manufacturer} ${m.model}, ${m.power_wp} Wp` : ""} />
                    <KV k="Anzahl / Leistung" v={`${countModules(r.cells)} Module / ${fmtKwp(roofKwp(r))}`} />
                    <KV k="Raster" v={`${r.grid_rows} Reihen × ${r.grid_cols} Spalten`} />
                  </View>
                </View>
                {r.remark ? <Text style={{ marginTop: 3 }}>{t(`Bemerkung: ${r.remark}`)}</Text> : null}
                <RoofGrid roof={r} snap={snap} />
                {serials.length > 0 && (
                  <Text style={{ fontSize: 7.5 }}>{t(`Modul-Seriennummern: ${serials.map((c) => `${rowLabel(c.row)}${c.col + 1}: ${c.serial_no}`).join("; ")}`)}</Text>
                )}
              </View>
            );
          })}
        </Frame>
      </Page>

      <Page size="A4" style={s.page}>
        <Frame snap={snap} draft={draft} generatedAt={generatedAt}>
          <Text style={s.h2}>4. Komponenten</Text>
          <Table
            cols={[{ label: "Kategorie", w: "16%" }, { label: "Hersteller / Modell", w: "28%" }, { label: "Seriennummer", w: "20%" }, { label: "Einbauort", w: "16%" }, { label: "Inbetriebn.", w: "10%" }, { label: "Daten", w: "10%" }]}
            rows={snap.components.map((c) => [COMPONENT_LABELS[c.category], `${c.manufacturer} ${c.model}`, c.serial_no, c.location, fmtDate(c.commissioning_date),
              c.capacity_kwh != null ? `${fmtNumber(c.capacity_kwh)} kWh` : c.rated_power_kw != null ? `${fmtNumber(c.rated_power_kw)} kW` : ""])}
          />

          <Text style={s.h2}>5. Prüf- und Inbetriebnahmewerte</Text>
          <Table
            cols={[{ label: "Prüfpunkt", w: "42%" }, { label: "Wert", w: "16%" }, { label: "Status", w: "16%" }, { label: "Kommentar", w: "26%" }]}
            rows={snap.test_values.map((x) => [`${x.label}${x.required ? " *" : ""}`, x.value ? `${x.value} ${x.unit}` : "", x.status ? TEST_STATUS_LABELS[x.status] : "offen", x.comment])}
          />
          <Text style={s.h3}>Abschlusscheckliste</Text>
          <Table
            cols={[{ label: "Punkt", w: "50%" }, { label: "Status", w: "18%" }, { label: "Kommentar / Begründung", w: "32%" }]}
            rows={snap.checklist_items.map((x) => [`${x.text}${x.required ? " *" : ""}`, x.status ? CHECK_STATUS_LABELS[x.status] : "offen", x.comment])}
          />
          <Text style={[s.muted, { marginTop: 3, fontSize: 7.5 }]}>* Pflichtpunkt</Text>

          <Text style={s.h2}>6. Mängel und Restpunkte</Text>
          {openDefects.length > 0 ? (
            <View style={s.alert}>
              <Text style={{ fontFamily: "Helvetica-Bold", color: C.err }}>{t(`${openDefects.length} offene(r) Mangel/Restpunkt(e)`)}</Text>
            </View>
          ) : (
            <Text>Keine offenen Mängel.</Text>
          )}
          {snap.defects.length > 0 && (
            <Table
              cols={[{ label: "Beschreibung", w: "36%" }, { label: "Kategorie", w: "13%" }, { label: "Priorität", w: "11%" }, { label: "Verantwortlich", w: "16%" }, { label: "Fällig", w: "11%" }, { label: "Status", w: "13%" }]}
              rows={snap.defects.map((d) => [d.description, d.category, DEFECT_PRIORITY_LABELS[d.priority], d.responsible, fmtDate(d.due_date),
                d.status === "erledigt" ? DEFECT_STATUS_LABELS[d.status] : `OFFEN (${DEFECT_STATUS_LABELS[d.status]})`])}
            />
          )}
        </Frame>
      </Page>

      {photos.length > 0 && (
        <Page size="A4" style={s.page}>
          <Frame snap={snap} draft={draft} generatedAt={generatedAt}>
            <Text style={s.h2}>7. Fotodokumentation</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
              {photos.map((f) => (
                <View key={f.id} wrap={false} style={{ width: "48.5%", marginBottom: 12 }}>
                  <Image src={images.photos[f.id]} style={{ width: "100%", height: 185, objectFit: "contain", backgroundColor: "#f1f5f9" }} />
                  <Text style={{ fontFamily: "Helvetica-Bold", marginTop: 3 }}>{t(PHOTO_LABELS[f.category])}</Text>
                  <Text>{t(f.caption || f.file_name)}</Text>
                  <Text style={s.muted}>{t(`Aufnahme: ${fmtDate(f.taken_at)}`)}</Text>
                </View>
              ))}
            </View>
          </Frame>
        </Page>
      )}

      <Page size="A4" style={s.page}>
        <Frame snap={snap} draft={draft} generatedAt={generatedAt}>
          <Text style={s.h2}>8. Übergabe und Unterschriften</Text>
          <View style={{ flexDirection: "row", gap: 20, marginTop: 10 }}>
            {(["dokumentierender", "bauherr"] as const).map((role) => {
              const sig = snap.signatures.find((x) => x.signer_role === role);
              return (
                <View key={role} style={{ width: "48%" }} wrap={false}>
                  <Text style={s.h3}>{role === "bauherr" ? "Bauherr / Empfänger" : "Dokumentierender"}</Text>
                  <View style={{ height: 80, borderBottomWidth: 0.8, borderBottomColor: C.ink, justifyContent: "flex-end" }}>
                    {sig && <Image src={sig.image_data} style={{ height: 75, objectFit: "contain" }} />}
                  </View>
                  <Text style={{ marginTop: 3 }}>{t(sig ? sig.signer_name : "Name")}</Text>
                  <Text style={s.muted}>{t(sig ? `${sig.place ? `${sig.place}, ` : ""}${fmtDateTime(sig.signed_at)}` : "Ort, Datum")}</Text>
                  {sig?.comment ? <Text style={{ marginTop: 3 }}>{t(`Kommentar: ${sig.comment}`)}</Text> : null}
                </View>
              );
            })}
          </View>
          <Text style={[s.muted, { marginTop: 30, fontSize: 7.5 }]}>
            {t(`Dieser Bericht wurde automatisch aus den Projektdaten erzeugt (Berichtsvorlage ${REPORT_TEMPLATE_VERSION}, Datenstand ${fmtDateTime(snap.exported_at)}). Er ersetzt keine normative Prüfung oder Prüfbescheinigung.`)}
          </Text>
        </Frame>
      </Page>
    </Document>
  );
}
