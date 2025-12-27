import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, MapPin, Building, GraduationCap, Calendar } from "lucide-react";
import { useState } from "react";
import type { PlacementFilters, PlacementSector, PlacementType } from "@/types/placements";

const regionOptions = [
  "Central Region",
  "Eastern Region",
  "Northern Region",
  "Western Region",
  "Kampala",
  "Wakiso",
  "Mukono",
  "Jinja",
  "Mbale",
  "Gulu",
  "Lira",
  "Mbarara",
  "Fort Portal",
] as const;

const industries: readonly PlacementSector[] = [
  "Agribusiness & Forestry",
  "Healthcare & Medical",
  "Media & ICT",
  "Finance & Commerce",
  "Tourism & Hospitality",
  "Engineering & Technical",
  "Legal & Professional Services",
] as const;

const placementTypes: readonly PlacementType[] = [
  "Internship or Attachment",
  "Apprenticeship",
  "Fellowship",
  "Training Program",
  "Full-time Role",
  "Consulting Project",
] as const;

const fieldOptions = [
  "Computer Science",
  "Business Administration",
  "Engineering",
  "Medicine",
  "Education",
  "Agriculture",
  "Law",
  "Journalism",
  "Economics",
  "Social Work",
] as const;

const yearOptions = [
  "Learner / Emerging Talent",
  "Recent Graduate",
  "Early Professional",
  "Experienced Professional",
  "Career Switcher",
] as const;

const isPlacementSector = (value: string): value is PlacementSector =>
  (industries as readonly string[]).includes(value);

const isPlacementType = (value: string): value is PlacementType =>
  (placementTypes as readonly string[]).includes(value);

interface SearchFiltersProps {
  onSearch?: (filters: PlacementFilters) => void;
  className?: string;
}

const SearchFilters = ({ onSearch, className }: SearchFiltersProps) => {
  const [keywords, setKeywords] = useState("");
  const [region, setRegion] = useState<string | undefined>();
  const [sector, setSector] = useState<PlacementSector | undefined>();
  const [field, setField] = useState<string | undefined>();
  const [year, setYear] = useState<string | undefined>();
  const [placementType, setPlacementType] = useState<PlacementType | undefined>();

  const triggerSearch = () => {
    const filters: PlacementFilters = {
      keywords,
      region,
      sector,
      field,
      year,
      placementType,
    };
    onSearch?.(filters);
  };

  const handleSectorChange = (value: string) => {
    if (isPlacementSector(value)) {
      setSector(value);
    }
  };

  const handlePlacementTypeChange = (value: string) => {
    if (isPlacementType(value)) {
      setPlacementType(value);
    }
  };

  return (
    <Card className={`p-6 bg-secondary/30 border-primary/10 ${className ?? ""}`}>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="search" className="text-sm font-medium">Search opportunities</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 transform text-muted-foreground w-4 h-4" />
            <Input
              id="search"
              placeholder="Search internships, training, roles, or programs by title, organization, or keyword"
              className="pl-10 bg-background"
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  triggerSearch();
                }
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Region
            </Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Any region" />
              </SelectTrigger>
              <SelectContent>
                {regionOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Building className="w-4 h-4 text-primary" />
              Industry
            </Label>
            <Select value={sector} onValueChange={handleSectorChange}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Any industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Opportunity Type
            </Label>
            <Select value={placementType} onValueChange={handlePlacementTypeChange}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Any type" />
              </SelectTrigger>
              <SelectContent>
                {placementTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              Focus Area
            </Label>
            <Select value={field} onValueChange={setField}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Any field" />
              </SelectTrigger>
              <SelectContent>
                {fieldOptions.map((fieldOption) => (
                  <SelectItem key={fieldOption} value={fieldOption}>
                    {fieldOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Experience Level
            </Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Any level" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((yearOption) => (
                  <SelectItem key={yearOption} value={yearOption}>
                    {yearOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button size="lg" className="w-full min-w-[200px] md:w-auto" onClick={triggerSearch}>
            Search Opportunities
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default SearchFilters;
