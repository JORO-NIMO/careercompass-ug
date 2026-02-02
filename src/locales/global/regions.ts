export type GlobalRegion = "Africa" | "Americas" | "Asia" | "Europe" | "Oceania" | "Middle East" | "Global";

export const GLOBAL_REGIONS: GlobalRegion[] = [
  "Africa",
  "Americas",
  "Asia",
  "Europe",
  "Oceania",
  "Middle East",
  "Global",
];

export function normalizeRegion(input: string): GlobalRegion | "Unknown" {
  const match = GLOBAL_REGIONS.find((r) => r.toLowerCase() === input.trim().toLowerCase());
  return match ?? "Unknown";
}
