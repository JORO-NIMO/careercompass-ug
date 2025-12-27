import type { PlacementFilters, PlacementQuery, PlacementSector, PlacementType } from '@/types/placements';

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
  parts.push("career opportunity");
  parts.push("professional development");
  // Geo bias if provided
  if (filters.region) parts.push(filters.region);
  // Only current/future
  parts.push("2025");
  return parts.filter(Boolean).join(" ");
}

export function buildPlacementQueries(filters: PlacementFilters): PlacementQuery[] {
  const dork = buildDork(filters);
  const sector = filters.sector ?? "";

  const google = `https://www.google.com/search?q=${encodeQuery(dork)}`;
  const googleAllDomains = `https://www.google.com/search?q=${encodeQuery(`${dork} site:(.ug OR .com OR .org OR .net OR .dev OR .co.ug OR .ac.ug)`)}`;
  const googleOrgGov = `https://www.google.com/search?q=${encodeQuery(`${dork} opportunity (site:org.ug OR site:go.ug OR site:org OR site:gov)`)}`;
  const googleProfessional = `https://www.google.com/search?q=${encodeQuery(`${sector} career development Uganda 2025 -job-boards`)}`;
  const googleCities = `https://www.google.com/search?q=${encodeQuery(`${dork} opportunity (Kampala OR Entebbe OR Mbarara OR Jinja)`)}`;

  return [
    { label: "Global search - all domains (.ug, .com, .org, .dev, etc.)", url: google, notes: "Searches across all domain extensions for Uganda-based opportunities." },
    { label: "All Uganda domains (.ug, .co.ug, .ac.ug, .com, .org, .net, .dev)", url: googleAllDomains, notes: "Explicitly targets multiple Ugandan-related domain extensions." },
    { label: "NGO & Govt opportunities", url: googleOrgGov, notes: "Focuses on org/gov domains for public and NGO opportunities worldwide." },
    { label: "Professional development tracks", url: googleProfessional, notes: "Looks for professional growth programs and excludes generic job boards." },
    { label: "City-focused opportunities", url: googleCities, notes: "Bias toward key cities (Kampala, Entebbe, Mbarara, Jinja) for on-the-ground experience." },
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
