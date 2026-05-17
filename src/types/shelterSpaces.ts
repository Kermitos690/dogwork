// Types du module Espaces refuge
import type { SpaceStatus, RiskLevel, IndoorOutdoor } from "@/lib/shelterSpaces";

export interface ShelterSpace {
  id: string;
  shelter_user_id: string;
  organization_id: string | null;
  name: string;
  slug: string | null;
  description: string | null;
  space_type: string;
  status: SpaceStatus;
  risk_level: RiskLevel;
  indoor_outdoor: IndoorOutdoor;
  building: string | null;
  floor: string | null;
  zone_label: string | null;
  capacity: number | null;
  capacity_recommended: number | null;
  surface_m2: number | null;
  current_animal_id: string | null;
  noise_level: string | null;
  stimulation_level: string | null;
  isolation_level: string | null;
  supervision_level: string | null;
  is_reservable: boolean;
  requires_staff_validation: boolean;
  is_public_for_adopters: boolean;
  is_active: boolean;
  features: Record<string, boolean>;
  compatibility_rules: Record<string, boolean>;
  restrictions: Record<string, boolean>;
  protocols: Record<string, string>;
  schedule_config: Record<string, unknown>;
  visual_config: Record<string, unknown>;
  main_photo_url: string | null;
  color: string | null;
  notes: string | null;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ShelterSpaceInsert = Partial<
  Omit<ShelterSpace, "id" | "created_at" | "updated_at">
> & {
  shelter_user_id: string;
  name: string;
  space_type: string;
};
