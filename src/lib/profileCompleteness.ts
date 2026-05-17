/**
 * Centralized profile-completeness helpers for DogWork.
 *
 * Purpose: avoid contradictory "fill your profile first" gates across
 * dashboards, public pages, onboarding and CTAs. Every screen MUST
 * use these helpers instead of recomputing its own logic.
 *
 * Design rules:
 * - Pure, deterministic, no I/O — caller supplies the loaded row.
 * - Tolerant to undefined/null (treats as "not complete" rather than crashing).
 * - Returns a structured result so UIs can show the *specific* missing field
 *   instead of a generic blocking modal.
 * - Never throws.
 */

export type CompletenessResult = {
  complete: boolean;
  missing: string[];
};

const nonEmpty = (v: unknown): boolean =>
  typeof v === "string" ? v.trim().length > 0 : v != null && v !== "";

// ---------------------------------------------------------------------------
// Owner / propriétaire — public-facing profile is optional; only display_name
// is required for the in-app experience. Onboarding completion is tracked
// elsewhere (dogs, evaluation) and must NOT be confused with profile completeness.
// ---------------------------------------------------------------------------
export function isOwnerProfileComplete(
  profile: { display_name?: string | null } | null | undefined,
): CompletenessResult {
  const missing: string[] = [];
  if (!profile) return { complete: false, missing: ["profile"] };
  if (!nonEmpty(profile.display_name)) missing.push("display_name");
  return { complete: missing.length === 0, missing };
}

// ---------------------------------------------------------------------------
// Coach / educator — required for a credible public listing.
// ---------------------------------------------------------------------------
export function isCoachProfileComplete(
  profile:
    | {
        display_name?: string | null;
        specialty?: string | null;
        bio?: string | null;
      }
    | null
    | undefined,
): CompletenessResult {
  const missing: string[] = [];
  if (!profile) return { complete: false, missing: ["profile"] };
  if (!nonEmpty(profile.display_name)) missing.push("display_name");
  if (!nonEmpty(profile.specialty)) missing.push("specialty");
  if (!nonEmpty(profile.bio)) missing.push("bio");
  return { complete: missing.length === 0, missing };
}

// ---------------------------------------------------------------------------
// Shelter / refuge — required for a credible public listing and adoptions.
// ---------------------------------------------------------------------------
export function isShelterProfileComplete(
  profile:
    | {
        name?: string | null;
        description?: string | null;
        address?: string | null;
        phone?: string | null;
      }
    | null
    | undefined,
): CompletenessResult {
  const missing: string[] = [];
  if (!profile) return { complete: false, missing: ["profile"] };
  if (!nonEmpty(profile.name)) missing.push("name");
  if (!nonEmpty(profile.description)) missing.push("description");
  if (!nonEmpty(profile.address)) missing.push("address");
  if (!nonEmpty(profile.phone)) missing.push("phone");
  return { complete: missing.length === 0, missing };
}

// ---------------------------------------------------------------------------
// Shelter employee — bare-minimum: a display name. PIN/role are managed
// elsewhere; this helper is purely cosmetic for the dashboard greeting.
// ---------------------------------------------------------------------------
export function isEmployeeProfileComplete(
  profile: { display_name?: string | null } | null | undefined,
): CompletenessResult {
  const missing: string[] = [];
  if (!profile) return { complete: false, missing: ["profile"] };
  if (!nonEmpty(profile.display_name)) missing.push("display_name");
  return { complete: missing.length === 0, missing };
}

/**
 * Translate a missing-field code into a human-readable French label.
 * Use this when surfacing what the user still needs to fill — avoids
 * exposing raw column names in the UI.
 */
export function labelForMissingField(field: string): string {
  switch (field) {
    case "profile":
      return "Créer votre fiche";
    case "display_name":
      return "Nom affiché";
    case "name":
      return "Nom du refuge";
    case "specialty":
      return "Spécialité";
    case "bio":
      return "Présentation";
    case "description":
      return "Description";
    case "address":
      return "Adresse";
    case "phone":
      return "Téléphone";
    default:
      return field;
  }
}
