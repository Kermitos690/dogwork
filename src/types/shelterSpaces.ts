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

export interface SpaceEquipment {
  id: string;
  space_id: string;
  shelter_user_id: string;
  name: string;
  equipment_type: string | null;
  quantity: number;
  status: string;
  last_checked_at: string | null;
  next_check_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpaceAssignment {
  id: string;
  space_id: string;
  shelter_user_id: string;
  animal_id: string | null;
  assigned_to_user_id: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SpaceCleaningLog {
  id: string;
  space_id: string;
  shelter_user_id: string;
  cleaned_by: string | null;
  cleaned_at: string;
  cleaning_level: string | null;
  checklist: Record<string, boolean>;
  notes: string | null;
  next_cleaning_at: string | null;
  created_at: string;
}

export interface SpaceMaintenanceLog {
  id: string;
  space_id: string;
  shelter_user_id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  reported_by: string | null;
  assigned_to: string | null;
  due_at: string | null;
  resolved_at: string | null;
  estimated_cost: number | null;
  photos: unknown[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpaceIncident {
  id: string;
  space_id: string;
  shelter_user_id: string;
  incident_type: string | null;
  severity: string;
  occurred_at: string;
  dogs_involved: unknown[];
  users_involved: unknown[];
  description: string | null;
  action_taken: string | null;
  follow_up_required: boolean;
  space_closed: boolean;
  created_by: string | null;
  created_at: string;
}

export interface SpaceNote {
  id: string;
  space_id: string;
  shelter_user_id: string;
  author_id: string | null;
  note: string;
  visibility: string;
  pinned: boolean;
  created_at: string;
}

export interface SpaceDocument {
  id: string;
  space_id: string;
  shelter_user_id: string;
  title: string | null;
  file_url: string | null;
  file_type: string | null;
  document_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}
