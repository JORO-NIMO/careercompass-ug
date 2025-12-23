export type PlacementSector =
  | "Agribusiness & Forestry"
  | "Healthcare & Medical"
  | "Media & ICT"
  | "Finance & Commerce"
  | "Tourism & Hospitality"
  | "Engineering & Technical"
  | "Legal & Professional Services";

export type PlacementType = "Industrial Training" | "Undergraduate Internship" | "Graduate Trainee";

export interface PlacementFilters {
  keywords?: string;
  sector?: PlacementSector;
  region?: string;
  placementType?: PlacementType;
  field?: string;
  year?: string;
}

const baseUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36";

const sectorSynonyms: Record<PlacementSector, string[]> = {
  "Agribusiness & Forestry": ["agriculture", "forestry", "fisheries", "timber"],
  "Healthcare & Medical": ["hospital", "clinic", "medical", "healthcare"],
  "Media & ICT": ["media", "journalism", "ict", "software", "telecom"],
  "Finance & Commerce": ["banking", "finance", "insurance", "audit", "commerce"],
  "Tourism & Hospitality": ["tourism", "hotel", "hospitality", "travel", "lodge"],
  "Engineering & Technical": ["engineering", "construction", "manufacturing", "automotive"],
  "Legal & Professional Services": ["law", "legal", "consultancy", "hr", "advisory"],
};

const exclusionFragments = [".ac.ug", ".edu", "wikipedia.org", "curriculum", "syllabus", "admissions", "tuition"];
const staleYears = ["2023", "2022", "2021", "2020", "2019"];

function encodeQuery(q: string) {
  return encodeURIComponent(q.trim());
}

function buildDork(filters: PlacementFilters) {
  const parts: string[] = [];
  if (filters.keywords) parts.push(filters.keywords);
  if (filters.sector) parts.push(filters.sector);
  if (filters.placementType) parts.push(filters.placementType);
  parts.push("industrial training");
  // Geo bias if provided
  if (filters.region) parts.push(filters.region);
  // Only current/future
  parts.push("2025");
  return parts.filter(Boolean).join(" ");
}

export interface BotQuery {
  label: string;
  url: string;
  notes: string;
}

export function buildPlacementQueries(filters: PlacementFilters): BotQuery[] {
  const dork = buildDork(filters);
  const sector = filters.sector ?? "";

  const google = `https://www.google.com/search?q=${encodeQuery(dork)}+site:.ug`;
  const googleOrgGov = `https://www.google.com/search?q=${encodeQuery(`${dork} internship (site:org.ug OR site:go.ug)`)}`;
  const googleGraduate = `https://www.google.com/search?q=${encodeQuery(`${sector} graduate trainee Uganda 2025 -job-boards`)}`;
  const googleCities = `https://www.google.com/search?q=${encodeQuery(`${dork} (Kampala OR Entebbe OR Mbarara OR Jinja)`)}`;

  return [
    { label: "Industrial training in Uganda (.ug)", url: google, notes: "Targets local domains and industrial training phrasing." },
    { label: "NGO & Govt internships", url: googleOrgGov, notes: "Focuses on org.ug / go.ug for public/NGO placements." },
    { label: "Graduate trainee tracks", url: googleGraduate, notes: "Looks for graduate trainee pages, excludes job boards." },
    { label: "City-focused internships", url: googleCities, notes: "Bias toward key cities for field attachment sites." },
  ];
}

export function filterOutNoise(urls: string[]): string[] {
  return urls.filter((u) => {
    const lower = u.toLowerCase();
    if (exclusionFragments.some((frag) => lower.includes(frag))) return false;
    if (staleYears.some((y) => lower.includes(y))) return false;
    return true;
  });
}

export const placementBotConfig = {
  userAgent: baseUserAgent,
  sectorSynonyms,
  exclusionFragments,
  staleYears,
};
