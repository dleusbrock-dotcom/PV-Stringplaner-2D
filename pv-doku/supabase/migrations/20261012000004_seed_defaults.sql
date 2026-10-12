-- Standardfirma und Beispielvorlagen.
-- HINWEIS (Lastenheft F-013, Kap. 14): Der Prüf- und Messwertkatalog ist ein Platzhalter und muss vor
-- Produktivsetzung durch eine elektrotechnisch befähigte Person geprüft und freigegeben werden.

with c as (
  insert into public.companies (name, report_footer)
  values ('Meine Firma', 'Dieses Dokument wurde mit dem PV-Dokumentationstool erstellt.')
  returning id
)
insert into public.templates (company_id, kind, sort, text, unit, required)
select c.id, t.kind, t.sort, t.text, t.unit, t.required
from c, (values
  ('checkliste', 10, 'Anlagenbeschriftung (DC-Leitungen, Freischaltstellen, Warnhinweise) angebracht', '', true),
  ('checkliste', 20, 'Mechanische Sichtprüfung von Unterkonstruktion und Modulen durchgeführt', '', true),
  ('checkliste', 30, 'Komponentenfotos inkl. Typenschilder erstellt', '', true),
  ('checkliste', 40, 'Zähler- und Netzbetreiberunterlagen vollständig', '', true),
  ('checkliste', 50, 'Monitoring-Zugang eingerichtet und getestet', '', true),
  ('checkliste', 60, 'Übergabe und Einweisung des Bauherrn erfolgt', '', true),
  ('checkliste', 70, 'Baustelle geräumt, Verpackung/Abfälle entsorgt', '', false),
  ('pruefung', 10, 'Leerlaufspannung je String (Beispiel – freizugeben)', 'V', true),
  ('pruefung', 20, 'Kurzschluss-/Betriebsstrom je String (Beispiel – freizugeben)', 'A', false),
  ('pruefung', 30, 'Isolationswiderstand DC (Beispiel – freizugeben)', 'MΩ', true),
  ('pruefung', 40, 'Durchgängigkeit Schutz-/Potentialausgleichsleiter (Beispiel – freizugeben)', 'Ω', false),
  ('pruefung', 50, 'Polarität der Strings geprüft (Beispiel – freizugeben)', '', true),
  ('pruefung', 60, 'Wechselrichter speist ein, keine Fehlermeldung (Beispiel – freizugeben)', '', true),
  ('pruefung', 70, 'Speicher-Erstinbetriebnahme durchgeführt (Beispiel – freizugeben)', '', false)
) as t(kind, sort, text, unit, required);
