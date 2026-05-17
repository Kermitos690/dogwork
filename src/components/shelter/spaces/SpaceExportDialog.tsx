import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Printer, X } from "lucide-react";
import {
  useSpaceEquipment,
  useSpaceCleaningLogs,
  useSpaceMaintenanceLogs,
  useSpaceIncidents,
} from "@/hooks/useShelterSpaceDetail";
import {
  getSpaceTypeLabel,
  getStatusMeta,
  getRiskMeta,
  calculateOccupancyRate,
  SPACE_FEATURE_KEYS,
  COMPATIBILITY_KEYS,
  RESTRICTION_KEYS,
  INDOOR_OUTDOOR,
} from "@/lib/shelterSpaces";
import type { ShelterSpace } from "@/types/shelterSpaces";

interface Props {
  space: ShelterSpace;
  currentOccupancy?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}
function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}
function escapeHtml(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function pickKeys(obj: Record<string, boolean> | null | undefined, dict: readonly { key: string; label: string }[]): string[] {
  if (!obj) return [];
  return dict.filter((d) => obj[d.key]).map((d) => d.label);
}

export function SpaceExportDialog({ space, currentOccupancy = 0, open, onOpenChange }: Props) {
  const { data: equipment = [] } = useSpaceEquipment(open ? space.id : undefined);
  const { data: cleaning = [] } = useSpaceCleaningLogs(open ? space.id : undefined);
  const { data: maintenance = [] } = useSpaceMaintenanceLogs(open ? space.id : undefined);
  const { data: incidents = [] } = useSpaceIncidents(open ? space.id : undefined);

  const url = `${window.location.origin}/shelter/spaces/${space.id}`;
  const statusMeta = getStatusMeta(space.status);
  const riskMeta = getRiskMeta(space.risk_level);
  const indoorLabel = INDOOR_OUTDOOR.find((i) => i.value === space.indoor_outdoor)?.label ?? "—";
  const features = pickKeys(space.features, SPACE_FEATURE_KEYS);
  const compatibility = pickKeys(space.compatibility_rules, COMPATIBILITY_KEYS);
  const restrictions = pickKeys(space.restrictions, RESTRICTION_KEYS);
  const protocols = useMemo(() => Object.entries(space.protocols ?? {}).filter(([, v]) => v && String(v).trim()), [space.protocols]);
  const lastCleaning = cleaning[0];
  const openMaintenance = maintenance.filter((m) => m.status !== "resolved" && m.status !== "closed").slice(0, 6);
  const recentIncidents = incidents.slice(0, 5);
  const max = space.capacity ?? 0;
  const reco = space.capacity_recommended ?? max;
  const rate = calculateOccupancyRate(currentOccupancy, max);
  const generatedAt = fmtDateTime(new Date().toISOString());

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié");
    } catch {
      toast.error("Copie impossible");
    }
  };

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) {
      toast.error("Popup bloquée par le navigateur");
      return;
    }
    w.document.write(buildPrintHtml({
      space, url, statusMeta, riskMeta, indoorLabel, features, compatibility, restrictions,
      protocols, equipment, lastCleaning, openMaintenance, recentIncidents,
      currentOccupancy, max, reco, rate, generatedAt,
    }));
    w.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60 shrink-0">
          <DialogTitle>Aperçu fiche export · {space.name}</DialogTitle>
          <DialogDescription className="text-xs">
            Fiche imprimable A4 pour usage terrain. Utilisez "Imprimer" pour exporter en PDF.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-5 bg-muted/30">
            {/* PREVIEW (mirrors print) */}
            <article className="mx-auto bg-white text-slate-900 shadow-sm rounded-md p-6 sm:p-8 max-w-[800px] text-sm leading-relaxed">
              <header className="flex items-start justify-between gap-4 border-b-2 border-slate-200 pb-3 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">DogWork · Fiche espace</p>
                  <h1 className="text-2xl font-bold mt-1">{space.name}</h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {getSpaceTypeLabel(space.space_type)}
                    {space.building ? ` · ${space.building}` : ""}
                    {space.floor ? ` · Étage ${space.floor}` : ""}
                    {space.zone_label ? ` · ${space.zone_label}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="outline" className="border-slate-300 text-slate-700">Statut : {statusMeta.label}</Badge>
                  <Badge variant="outline" className="border-slate-300 text-slate-700">Risque : {riskMeta.label}</Badge>
                  <p className="text-[10px] text-slate-500 mt-1">Généré le {generatedAt}</p>
                </div>
              </header>

              <Section title="Identité & localisation">
                <Grid>
                  <Item label="Type">{getSpaceTypeLabel(space.space_type)}</Item>
                  <Item label="Bâtiment">{space.building || "—"}</Item>
                  <Item label="Étage">{space.floor || "—"}</Item>
                  <Item label="Zone">{space.zone_label || "—"}</Item>
                  <Item label="Environnement">{indoorLabel}</Item>
                  <Item label="Surface">{space.surface_m2 ? `${space.surface_m2} m²` : "—"}</Item>
                </Grid>
              </Section>

              <Section title="Capacité & occupation">
                <Grid>
                  <Item label="Capacité max">{max || "—"}</Item>
                  <Item label="Capacité recommandée">{reco || "—"}</Item>
                  <Item label="Occupation actuelle">{currentOccupancy}{max ? ` / ${max} (${rate}%)` : ""}</Item>
                </Grid>
              </Section>

              <Section title="Description">
                <p className="text-sm">{space.description || <Empty>Aucune description renseignée.</Empty>}</p>
              </Section>

              <Section title="Notes principales">
                <p className="text-sm">{space.notes || <Empty>Aucune note principale.</Empty>}</p>
              </Section>

              <Section title="Caractéristiques">
                {features.length ? <Chips items={features} /> : <Empty>Aucune caractéristique renseignée.</Empty>}
              </Section>

              <Section title="Compatibilité chiens">
                {compatibility.length ? <Chips items={compatibility} /> : <Empty>Aucune règle de compatibilité renseignée.</Empty>}
              </Section>

              <Section title="Restrictions">
                {restrictions.length ? <Chips items={restrictions} /> : <Empty>Aucune restriction renseignée.</Empty>}
              </Section>

              <Section title="Protocoles">
                {protocols.length ? (
                  <ul className="space-y-1 list-disc pl-5">
                    {protocols.map(([k, v]) => <li key={k}><span className="font-medium">{k} :</span> {String(v)}</li>)}
                  </ul>
                ) : <Empty>Aucun protocole renseigné.</Empty>}
              </Section>

              <Section title="Équipements">
                {equipment.length ? (
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-300 text-left text-slate-600">
                        <th className="py-1.5 pr-2 font-semibold">Nom</th>
                        <th className="py-1.5 px-2 font-semibold">Type</th>
                        <th className="py-1.5 px-2 font-semibold">Qté</th>
                        <th className="py-1.5 px-2 font-semibold">Statut</th>
                        <th className="py-1.5 pl-2 font-semibold">Dernier contrôle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipment.map((e) => (
                        <tr key={e.id} className="border-b border-slate-100">
                          <td className="py-1.5 pr-2">{e.name}</td>
                          <td className="py-1.5 px-2">{e.equipment_type || "—"}</td>
                          <td className="py-1.5 px-2">{e.quantity ?? 1}</td>
                          <td className="py-1.5 px-2">{e.status || "—"}</td>
                          <td className="py-1.5 pl-2">{fmtDate(e.last_checked_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <Empty>Aucun équipement enregistré.</Empty>}
              </Section>

              <Section title="Dernier nettoyage">
                {lastCleaning ? (
                  <p className="text-sm">
                    <strong>{fmtDateTime(lastCleaning.cleaned_at)}</strong>
                    {lastCleaning.cleaning_level ? ` · niveau ${lastCleaning.cleaning_level}` : ""}
                    {lastCleaning.notes ? ` — ${lastCleaning.notes}` : ""}
                  </p>
                ) : <Empty>Aucun nettoyage enregistré.</Empty>}
              </Section>

              <Section title="Maintenance ouverte">
                {openMaintenance.length ? (
                  <ul className="space-y-1.5">
                    {openMaintenance.map((m) => (
                      <li key={m.id} className="text-sm">
                        <span className="font-medium">{m.title}</span>
                        <span className="text-slate-500"> · {m.priority} · {m.status}</span>
                        {m.due_at ? <span className="text-slate-500"> · échéance {fmtDate(m.due_at)}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : <Empty>Aucune maintenance ouverte.</Empty>}
              </Section>

              <Section title="Incidents récents">
                {recentIncidents.length ? (
                  <ul className="space-y-1.5">
                    {recentIncidents.map((i) => (
                      <li key={i.id} className="text-sm">
                        <span className="font-medium">{fmtDate(i.occurred_at)}</span>
                        <span className="text-slate-500"> · {i.incident_type || "incident"} · sévérité {i.severity}</span>
                        {i.description ? <div className="text-slate-600 text-xs mt-0.5">{i.description}</div> : null}
                      </li>
                    ))}
                  </ul>
                ) : <Empty>Aucun incident récent.</Empty>}
              </Section>

              <footer className="mt-6 pt-3 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between">
                <span>Fiche générée par DogWork — usage interne refuge</span>
                <span className="font-mono break-all max-w-[60%] text-right">{url}</span>
              </footer>
            </article>
          </div>
        </ScrollArea>

        <div className="flex flex-wrap gap-2 p-4 border-t border-border/60 shrink-0">
          <Button variant="default" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-3.5 w-3.5" /> Imprimer / Enregistrer en PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Copier le lien
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="gap-1.5 ml-auto">
            <X className="h-3.5 w-3.5" /> Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 print-keep">
      <h2 className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold border-b border-slate-200 pb-1 mb-2">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-sm">{children}</div>;
}
function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-medium">{children}</div>
    </div>
  );
}
function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span key={it} className="text-xs border border-slate-300 rounded-md px-2 py-0.5 bg-slate-50">{it}</span>
      ))}
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-500 italic">{children}</p>;
}

/* ----------------------- Print HTML (new window) ----------------------- */
function buildPrintHtml(p: {
  space: ShelterSpace; url: string;
  statusMeta: { label: string }; riskMeta: { label: string };
  indoorLabel: string; features: string[]; compatibility: string[]; restrictions: string[];
  protocols: [string, unknown][];
  equipment: any[]; lastCleaning: any; openMaintenance: any[]; recentIncidents: any[];
  currentOccupancy: number; max: number; reco: number; rate: number; generatedAt: string;
}): string {
  const chips = (items: string[]) => items.length
    ? `<div class="chips">${items.map((i) => `<span>${escapeHtml(i)}</span>`).join("")}</div>`
    : `<p class="empty">Aucun élément renseigné.</p>`;

  const section = (title: string, body: string) => `<section><h2>${escapeHtml(title)}</h2>${body}</section>`;
  const empty = (txt: string) => `<p class="empty">${escapeHtml(txt)}</p>`;

  const equipmentHtml = p.equipment.length
    ? `<table><thead><tr><th>Nom</th><th>Type</th><th>Qté</th><th>Statut</th><th>Dernier contrôle</th></tr></thead><tbody>${
        p.equipment.map((e) => `<tr><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.equipment_type || "—")}</td><td>${escapeHtml(e.quantity ?? 1)}</td><td>${escapeHtml(e.status || "—")}</td><td>${escapeHtml(fmtDate(e.last_checked_at))}</td></tr>`).join("")
      }</tbody></table>`
    : empty("Aucun équipement enregistré.");

  const cleaningHtml = p.lastCleaning
    ? `<p><strong>${escapeHtml(fmtDateTime(p.lastCleaning.cleaned_at))}</strong>${p.lastCleaning.cleaning_level ? ` · niveau ${escapeHtml(p.lastCleaning.cleaning_level)}` : ""}${p.lastCleaning.notes ? ` — ${escapeHtml(p.lastCleaning.notes)}` : ""}</p>`
    : empty("Aucun nettoyage enregistré.");

  const maintenanceHtml = p.openMaintenance.length
    ? `<ul>${p.openMaintenance.map((m) => `<li><strong>${escapeHtml(m.title)}</strong> · ${escapeHtml(m.priority)} · ${escapeHtml(m.status)}${m.due_at ? ` · échéance ${escapeHtml(fmtDate(m.due_at))}` : ""}</li>`).join("")}</ul>`
    : empty("Aucune maintenance ouverte.");

  const incidentsHtml = p.recentIncidents.length
    ? `<ul>${p.recentIncidents.map((i) => `<li><strong>${escapeHtml(fmtDate(i.occurred_at))}</strong> · ${escapeHtml(i.incident_type || "incident")} · sévérité ${escapeHtml(i.severity)}${i.description ? `<div class="muted">${escapeHtml(i.description)}</div>` : ""}</li>`).join("")}</ul>`
    : empty("Aucun incident récent.");

  const protocolsHtml = p.protocols.length
    ? `<ul>${p.protocols.map(([k, v]) => `<li><strong>${escapeHtml(k)} :</strong> ${escapeHtml(v)}</li>`).join("")}</ul>`
    : empty("Aucun protocole renseigné.");

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/>
<title>Fiche espace · ${escapeHtml(p.space.name)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; color: #0f172a; margin: 0; padding: 24px; font-size: 12px; line-height: 1.55; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 14px; }
  header .label { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #64748b; font-weight: 600; }
  header h1 { font-size: 22px; margin: 4px 0 2px; }
  header .meta { font-size: 11px; color: #475569; }
  header .right { text-align: right; }
  header .badge { display: inline-block; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 4px; }
  header .gen { font-size: 9px; color: #64748b; margin-top: 6px; }
  section { margin-top: 12px; page-break-inside: avoid; }
  h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin: 0 0 6px; font-weight: 700; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 16px; }
  .grid .k { font-size: 9px; text-transform: uppercase; color: #64748b; }
  .grid .v { font-weight: 600; font-size: 12px; }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .chips span { border: 1px solid #cbd5e1; background: #f8fafc; padding: 1px 8px; border-radius: 4px; font-size: 10px; }
  ul { margin: 4px 0; padding-left: 18px; }
  ul li { margin-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #e2e8f0; }
  th { color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #94a3b8; }
  .empty { color: #94a3b8; font-style: italic; font-size: 11px; }
  .muted { color: #475569; font-size: 11px; margin-top: 2px; }
  footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9px; color: #64748b; }
  footer .url { font-family: ui-monospace, monospace; max-width: 60%; text-align: right; word-break: break-all; }
  @media print { body { padding: 0; } }
</style></head><body>
<header>
  <div>
    <div class="label">DogWork · Fiche espace</div>
    <h1>${escapeHtml(p.space.name)}</h1>
    <div class="meta">${escapeHtml(getSpaceTypeLabel(p.space.space_type))}${p.space.building ? " · " + escapeHtml(p.space.building) : ""}${p.space.floor ? " · Étage " + escapeHtml(p.space.floor) : ""}${p.space.zone_label ? " · " + escapeHtml(p.space.zone_label) : ""}</div>
  </div>
  <div class="right">
    <div><span class="badge">Statut : ${escapeHtml(p.statusMeta.label)}</span></div>
    <div><span class="badge">Risque : ${escapeHtml(p.riskMeta.label)}</span></div>
    <div class="gen">Généré le ${escapeHtml(p.generatedAt)}</div>
  </div>
</header>

${section("Identité & localisation", `<div class="grid">
  <div><div class="k">Type</div><div class="v">${escapeHtml(getSpaceTypeLabel(p.space.space_type))}</div></div>
  <div><div class="k">Bâtiment</div><div class="v">${escapeHtml(p.space.building || "—")}</div></div>
  <div><div class="k">Étage</div><div class="v">${escapeHtml(p.space.floor || "—")}</div></div>
  <div><div class="k">Zone</div><div class="v">${escapeHtml(p.space.zone_label || "—")}</div></div>
  <div><div class="k">Environnement</div><div class="v">${escapeHtml(p.indoorLabel)}</div></div>
  <div><div class="k">Surface</div><div class="v">${p.space.surface_m2 ? escapeHtml(p.space.surface_m2) + " m²" : "—"}</div></div>
</div>`)}

${section("Capacité & occupation", `<div class="grid">
  <div><div class="k">Capacité max</div><div class="v">${p.max || "—"}</div></div>
  <div><div class="k">Capacité recommandée</div><div class="v">${p.reco || "—"}</div></div>
  <div><div class="k">Occupation actuelle</div><div class="v">${p.currentOccupancy}${p.max ? ` / ${p.max} (${p.rate}%)` : ""}</div></div>
</div>`)}

${section("Description", `<p>${escapeHtml(p.space.description) || `<span class="empty">Aucune description renseignée.</span>`}</p>`)}
${section("Notes principales", `<p>${escapeHtml(p.space.notes) || `<span class="empty">Aucune note principale.</span>`}</p>`)}
${section("Caractéristiques", chips(p.features))}
${section("Compatibilité chiens", chips(p.compatibility))}
${section("Restrictions", chips(p.restrictions))}
${section("Protocoles", protocolsHtml)}
${section("Équipements", equipmentHtml)}
${section("Dernier nettoyage", cleaningHtml)}
${section("Maintenance ouverte", maintenanceHtml)}
${section("Incidents récents", incidentsHtml)}

<footer>
  <span>Fiche générée par DogWork — usage interne refuge</span>
  <span class="url">${escapeHtml(p.url)}</span>
</footer>

<script>window.onload = () => { setTimeout(() => window.print(), 250); };</script>
</body></html>`;
}
