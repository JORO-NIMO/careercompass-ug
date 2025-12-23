import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, MapPin, Building, GraduationCap, Calendar } from "lucide-react";
import { useState } from "react";

interface SearchFiltersProps {
  onSearch?: (filters: any) => void;
  className?: string;
}

const SearchFilters = ({ onSearch, className }: SearchFiltersProps) => {
  const [keywords, setKeywords] = useState("");
  const [region, setRegion] = useState<string | undefined>(undefined);
  const [industry, setIndustry] = useState<string | undefined>(undefined);
  const [field, setField] = useState<string | undefined>(undefined);
  const [year, setYear] = useState<string | undefined>(undefined);
  const [placementType, setPlacementType] = useState<string | undefined>(undefined);

  const ugandaRegions = [
    "Central Region", "Eastern Region", "Northern Region", "Western Region", 
    "Kampala", "Wakiso", "Mukono", "Jinja", "Mbale", "Gulu", "Lira", "Mbarara", "Fort Portal"
  ];

  const industries = [
    "Agribusiness & Forestry",
    "Healthcare & Medical",
    "Media & ICT",
    "Finance & Commerce",
    "Tourism & Hospitality",
    "Engineering & Technical",
    "Legal & Professional Services"
  ];

  const placementTypes = [
    "Industrial Training",
    "Undergraduate Internship",
    "Graduate Trainee"
  ];

  const triggerSearch = () => {
    onSearch?.({ keywords, region, industry, field, year, placementType });
  };

  const fields = [
    "Computer Science", "Business Administration", "Engineering", "Medicine", "Education",
    "Agriculture", "Law", "Journalism", "Economics", "Social Work"
  ];

  const years = ["Year 1", "Year 2", "Year 3", "Year 4", "Final Year"];

  return (
    <Card className={`p-6 bg-secondary/30 border-primary/10 ${className}`}>
      <div className="space-y-6">
        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="search" className="text-sm font-medium">Search placements</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id="search"
              placeholder="Industrial training or graduate roles by title, company, or keyword"
              className="pl-10 bg-background"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); triggerSearch(); } }}
            />
          </div>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Region Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Region
            </Label>
            <Select>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Any region" />
              </SelectTrigger>
              <SelectContent>
                {ugandaRegions.map((region) => (
                  <SelectItem key={region} value={region.toLowerCase()}
                    onClick={() => setRegion(region.toLowerCase())}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Industry Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Building className="w-4 h-4 text-primary" />
              Industry
            </Label>
            <Select>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Any industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry.toLowerCase()}
                    onClick={() => setIndustry(industry)}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Placement Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Placement Type
            </Label>
            <Select>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Any type" />
              </SelectTrigger>
              <SelectContent>
                {placementTypes.map((type) => (
                  <SelectItem key={type} value={type.toLowerCase()}
                    onClick={() => setPlacementType(type)}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Field Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              Field of Study
            </Label>
            <Select>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Any field" />
              </SelectTrigger>
              <SelectContent>
                {fields.map((field) => (
                  <SelectItem key={field} value={field.toLowerCase()}
                    onClick={() => setField(field)}>
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Year Level
            </Label>
            <Select>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Any year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toLowerCase()}
                    onClick={() => setYear(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Button */}
        <div className="flex justify-center pt-2">
          <Button size="lg" className="w-full md:w-auto min-w-[200px]" onClick={triggerSearch}>
            Find Placements
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default SearchFilters;