export type PlacementSector =
  | "Agribusiness & Forestry"
  | "Healthcare & Medical"
  | "Media & ICT"
  | "Finance & Commerce"
  | "Tourism & Hospitality"
  | "Engineering & Technical"
  | "Legal & Professional Services";

export type PlacementType =
  | "Internship or Attachment"
  | "Apprenticeship"
  | "Fellowship"
  | "Training Program"
  | "Full-time Role"
  | "Consulting Project";

export interface PlacementFilters {
  keywords?: string;
  sector?: PlacementSector;
  region?: string;
  placementType?: PlacementType;
  field?: string;
  year?: string;
}

export interface PlacementQuery {
  label: string;
  url: string;
  notes: string;
}
