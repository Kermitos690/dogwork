// Constantes et helpers du module Espaces refuge
// Source unique de vérité pour labels, statuts, risques, niveaux, couleurs.

export const SPACE_TYPES = [
  { value: "box", label: "Box individuel" },
  { value: "box_collectif", label: "Box collectif" },
  { value: "enclos", label: "Chenil / Enclos" },
  { value: "parc_exterieur", label: "Parc extérieur" },
  { value: "parc_interieur", label: "Parc intérieur" },
  { value: "sentier", label: "Sentier" },
  { value: "promenade", label: "Zone de promenade" },
  { value: "medicale", label: "Zone médicale" },
  { value: "infirmerie", label: "Infirmerie" },
  { value: "quarantaine", label: "Quarantaine" },
  { value: "isolement", label: "Isolement" },
  { value: "adoption", label: "Zone adoption" },
  { value: "rencontre", label: "Salle de rencontre" },
  { value: "education", label: "Salle d'éducation" },
  { value: "staff", label: "Zone staff" },
  { value: "stockage", label: "Stockage" },
  { value: "nettoyage", label: "Zone nettoyage" },
  { value: "alimentation", label: "Alimentation" },
  { value: "repos", label: "Zone de repos" },
  { value: "jeu", label: "Zone de jeu" },
  { value: "observation", label: "Observation comportementale" },
  { value: "sensible", label: "Zone sensible" },
  { value: "interdite", label: "Zone interdite" },
  { value: "accueil", label: "Accueil" },
  { value: "autre", label: "Autre" },
] as const;

export const SPACE_STATUSES = [
  { value: "available", label: "Disponible", tone: "emerald" },
  { value: "occupied", label: "Occupé", tone: "blue" },
  { value: "full", label: "Complet", tone: "amber" },
  { value: "reserved", label: "Réservé", tone: "violet" },
  { value: "cleaning_required", label: "Nettoyage requis", tone: "yellow" },
  { value: "maintenance", label: "Maintenance", tone: "orange" },
  { value: "closed", label: "Fermé", tone: "slate" },
  { value: "quarantine", label: "Quarantaine", tone: "amber" },
  { value: "restricted", label: "Restreint", tone: "rose" },
  { value: "emergency", label: "Urgence", tone: "red" },
] as const;

export const RISK_LEVELS = [
  { value: "low", label: "Faible", tone: "emerald" },
  { value: "medium", label: "Moyen", tone: "amber" },
  { value: "high", label: "Élevé", tone: "orange" },
  { value: "critical", label: "Critique", tone: "red" },
] as const;

export const INDOOR_OUTDOOR = [
  { value: "indoor", label: "Intérieur" },
  { value: "outdoor", label: "Extérieur" },
  { value: "mixed", label: "Mixte" },
] as const;

export const LEVELS = [
  { value: "low", label: "Faible" },
  { value: "medium", label: "Moyen" },
  { value: "high", label: "Élevé" },
] as const;

export const SPACE_FEATURE_KEYS = [
  { key: "fenced", label: "Clôturé" },
  { key: "covered", label: "Couvert" },
  { key: "heated", label: "Chauffé" },
  { key: "ventilated", label: "Ventilé" },
  { key: "camera", label: "Caméra" },
  { key: "water_point", label: "Point d'eau" },
  { key: "food_point", label: "Point nourriture" },
  { key: "lighting", label: "Éclairage" },
  { key: "non_slip_floor", label: "Sol antidérapant" },
  { key: "shelter", label: "Abri" },
  { key: "double_door", label: "Double porte sécurité" },
  { key: "wheelchair_access", label: "Accès PMR" },
  { key: "enrichment", label: "Enrichissement sensoriel" },
  { key: "agility", label: "Équipement agility" },
] as const;

export const COMPATIBILITY_KEYS = [
  { key: "small", label: "Chiens petits" },
  { key: "medium", label: "Chiens moyens" },
  { key: "large", label: "Chiens grands" },
  { key: "puppies", label: "Chiots" },
  { key: "seniors", label: "Seniors" },
  { key: "reactive", label: "Chiens réactifs" },
  { key: "fearful", label: "Chiens craintifs" },
  { key: "social", label: "Chiens sociables" },
  { key: "quarantine", label: "En quarantaine" },
  { key: "post_op", label: "Post-opération" },
  { key: "new_arrival", label: "Nouvellement arrivés" },
  { key: "high_energy", label: "Haut besoin d'activité" },
  { key: "needs_calm", label: "Besoin de calme" },
  { key: "group_ok", label: "Compatible groupe" },
] as const;

export const RESTRICTION_KEYS = [
  { key: "no_intact_males", label: "Pas de mâles entiers" },
  { key: "no_females_in_heat", label: "Pas de femelles en chaleur" },
  { key: "no_dog_reactive", label: "Pas de chiens réactifs congénères" },
  { key: "no_human_reactive", label: "Pas de chiens réactifs humains" },
  { key: "no_escapers", label: "Pas de chiens fugueurs" },
  { key: "no_destroyers", label: "Pas de chiens destructeurs" },
  { key: "no_sick", label: "Pas de chiens malades" },
  { key: "staff_validation", label: "Validation staff obligatoire" },
] as const;

export type SpaceStatus = (typeof SPACE_STATUSES)[number]["value"];
export type RiskLevel = (typeof RISK_LEVELS)[number]["value"];
export type IndoorOutdoor = (typeof INDOOR_OUTDOOR)[number]["value"];

const TONE_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  yellow: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  orange: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  red: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  rose: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  violet: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
  slate: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30",
};

export function getStatusMeta(value?: string | null) {
  const s = SPACE_STATUSES.find((x) => x.value === value) ?? SPACE_STATUSES[0];
  return { ...s, className: TONE_CLASSES[s.tone] };
}

export function getRiskMeta(value?: string | null) {
  const r = RISK_LEVELS.find((x) => x.value === value) ?? RISK_LEVELS[0];
  return { ...r, className: TONE_CLASSES[r.tone] };
}

export function getSpaceTypeLabel(value?: string | null) {
  return SPACE_TYPES.find((t) => t.value === value)?.label ?? value ?? "—";
}

export function calculateOccupancyRate(current?: number | null, max?: number | null) {
  if (!max || max <= 0) return 0;
  return Math.min(100, Math.round(((current ?? 0) / max) * 100));
}
