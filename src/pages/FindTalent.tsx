import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Briefcase, GraduationCap, Mail, Phone, Globe, Award, Clock3, Sparkles, ArrowUpRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

import { fetchCandidates, type Candidate } from "@/services/profilesService";

const BASE_FIELD_OPTIONS = [
  "Technology",
  "Business & Finance",
  "Engineering",
  "Healthcare",
  "Agriculture",
  "Creative Arts",
  "Education",
  "Hospitality",
];

const BASE_LOCATION_OPTIONS = ["Remote", "New York", "London", "Nairobi", "Lagos", "Bangalore", "São Paulo", "Berlin"];

const BASE_EXPERIENCE_OPTIONS = [
  "Emerging Talent",
  "1-2 years",
  "3-5 years",
  "5+ years",
  "Career Switcher",
];

const FindTalent = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedField, setSelectedField] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedExperience, setSelectedExperience] = useState("all");
  const [selectedUniversity, setSelectedUniversity] = useState("all");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    let isMounted = true;

    const loadCandidates = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const candidates = await fetchCandidates();
        if (!isMounted) return;
        setCandidates(candidates);
      } catch (error) {
        console.error("Failed to load candidates", error);
        if (isMounted) {
          setLoadError("We could not refresh the candidate directory. Please retry in a moment.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCandidates();

    return () => {
      isMounted = false;
    };
  }, []);

  const fieldOptions = useMemo(() => {
    const unique = new Set<string>(BASE_FIELD_OPTIONS);
    candidates.forEach((candidate) => {
      if (candidate.field && candidate.field !== "Open to opportunities") {
        unique.add(candidate.field);
      }
    });
    return Array.from(unique).sort();
  }, [candidates]);

  const locationOptions = useMemo(() => {
    const unique = new Set<string>(BASE_LOCATION_OPTIONS);
    candidates.forEach((candidate) => {
      if (candidate.location && candidate.location !== "Location not specified") {
        unique.add(candidate.location);
      }
    });
    return Array.from(unique).sort();
  }, [candidates]);

  const experienceOptions = useMemo(() => {
    const unique = new Set<string>(BASE_EXPERIENCE_OPTIONS);
    candidates.forEach((candidate) => {
      if (candidate.experience && candidate.experience !== "Experience not specified") {
        unique.add(candidate.experience);
      }
    });
    return Array.from(unique).sort();
  }, [candidates]);

  const universityOptions = useMemo(() => {
    const unique = new Set<string>();
    candidates.forEach((candidate) => {
      if (candidate.education && candidate.education !== "Background details not provided" && candidate.education.length < 50) {
        unique.add(candidate.education);
      }
    });
    return Array.from(unique).sort();
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return candidates.filter((candidate) => {
      const searchableValues = [
        candidate.name,
        candidate.title,
        candidate.field,
        candidate.location,
        candidate.skills.join(" "),
      ];

      const matchesTerm =
        term.length === 0 || searchableValues.some((value) => value?.toLowerCase().includes(term));
      const matchesField = selectedField === "all" || candidate.field === selectedField;
      const matchesLocation = selectedLocation === "all" || candidate.location === selectedLocation;
      const matchesExperience = selectedExperience === "all" || candidate.experience === selectedExperience;
      const matchesUniversity = selectedUniversity === "all" || candidate.education === selectedUniversity;

      return matchesTerm && matchesField && matchesLocation && matchesExperience && matchesUniversity;
    });
  }, [candidates, searchTerm, selectedField, selectedLocation, selectedExperience, selectedUniversity]);

  const showComingSoon = !loading && candidates.length === 0;
  const showNoResults = !loading && candidates.length > 0 && filteredCandidates.length === 0;

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedField("all");
    setSelectedLocation("all");
    setSelectedExperience("all");
    setSelectedUniversity("all");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="mb-4" variant="secondary">For Organizations</Badge>
          <h1 className="text-4xl font-bold mb-4">Find Talent</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Search for qualified candidates around the world. Connect with skilled professionals ready for their next opportunity.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Button variant="outline" asChild>
              <a href="/find-placements">View Opportunities</a>
            </Button>
            <Button asChild>
              <a href="/for-companies">Post an Opportunity</a>
            </Button>
          </div>
        </div>

        {loadError && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {loadError}
          </div>
        )}

        <Card id="feature-faq" className="mb-10 border-primary/20 bg-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-5 w-5 text-primary" />
              How Featuring Works
            </CardTitle>
            <CardDescription>
              Featured opportunities get a spotlight badge, float to the top of search results, and appear in employer highlight emails.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-primary/20 bg-white/80 p-4">
                <p className="font-semibold mb-1">7 Day Feature</p>
                <p className="text-sm text-muted-foreground">Perfect for short campaigns. Expect a 1.5x visibility lift.</p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-white/90 p-4">
                <p className="font-semibold mb-1">14 Day Feature</p>
                <p className="text-sm text-muted-foreground">Stay top-of-mind throughout your interview window with a 2x bump.</p>
              </div>
              <div className="rounded-lg border border-primary bg-white p-4 shadow-sm">
                <p className="font-semibold mb-1">30 Day Feature</p>
                <p className="text-sm text-muted-foreground">Dominate searches for the entire month with premium badge visibility.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <Button asChild>
                <a href="/for-companies">
                  Activate a feature
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="#feature-faq">Read feature FAQs</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, title, or skills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedField} onValueChange={setSelectedField}>
                <SelectTrigger>
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fields</SelectItem>
                  {fieldOptions.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Town / City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locationOptions.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedExperience} onValueChange={setSelectedExperience}>
                <SelectTrigger>
                  <SelectValue placeholder="Experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Experience</SelectItem>
                  {experienceOptions.map((experience) => (
                    <SelectItem key={experience} value={experience}>
                      {experience}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* University Filter */}
              <Select value={selectedUniversity} onValueChange={setSelectedUniversity}>
                <SelectTrigger>
                  <SelectValue placeholder="University / Institute" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Universities</SelectItem>
                  {universityOptions.map((uni) => (
                    <SelectItem key={uni} value={uni}>
                      {uni}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-muted-foreground">
            Found <span className="font-semibold text-foreground">{filteredCandidates.length}</span> candidates
          </p>
          <Button variant="outline" size="sm">
            Save Search
          </Button>
        </div>

        {/* Candidates Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {loading &&
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-8 w-full" />
              </Card>
            ))}
          {!loading &&
            filteredCandidates.map((candidate) => (
              <Card key={candidate.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate.name}`} />
                      <AvatarFallback>{candidate.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl mb-1">{candidate.name}</CardTitle>
                          <CardDescription className="text-base">{candidate.title}</CardDescription>
                        </div>
                        {candidate.verified && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            <Award className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Location & Field */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{candidate.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      <span>{candidate.experience}</span>
                    </div>
                  </div>

                  {/* Education */}
                  <div className="flex items-start gap-2 text-sm">
                    <GraduationCap className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{candidate.education}</span>
                  </div>

                  {/* Skills */}
                  <div>
                    <p className="text-sm font-medium mb-2">Skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.slice(0, 5).map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {candidate.skills.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{candidate.skills.length - 5} more
                        </Badge>
                      )}
                      {candidate.skills.length === 0 && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Interests coming soon
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="pt-4 border-t space-y-2">
                    {candidate.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${candidate.email}`} className="text-blue-600 hover:underline">
                          {candidate.email}
                        </a>
                      </div>
                    )}
                    {candidate.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${candidate.phone}`} className="text-blue-600 hover:underline">
                          {candidate.phone}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Available: {candidate.availability}</span>
                    </div>
                    {candidate.updatedAt && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock3 className="h-3 w-3" />
                        <span>Updated {new Date(candidate.updatedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button className="flex-1" asChild>
                      <a href={`mailto:${candidate.email}`}>Contact Candidate</a>
                    </Button>
                    <Button variant="outline">Save</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>

        {showComingSoon && (
          <Card className="py-12 mt-8">
            <CardContent className="text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Be the first to be featured</h3>
              <p className="text-muted-foreground mb-4">
                We&apos;re onboarding verified candidates. Contact us to showcase your profile to employers.
              </p>
              <a href="mailto:joronimoamanya@gmail.com">
                <Button>Contact Us</Button>
              </a>
            </CardContent>
          </Card>
        )}

        {showNoResults && (
          <Card className="py-12 mt-8">
            <CardContent className="text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No candidates match your filters</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search criteria or reset the filters.</p>
              <Button onClick={handleClearFilters}>Clear Filters</Button>
            </CardContent>
          </Card>
        )}

        {/* CTA Section */}
        <Card className="mt-12 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardHeader>
            <CardTitle>Need Help Finding the Right Talent?</CardTitle>
            <CardDescription>
              Our team can help you find candidates that match your specific requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <a href="mailto:joronimoamanya@gmail.com" className="flex-1">
              <Button size="lg" className="w-full">Request Recruitment Support</Button>
            </a>
            <Button size="lg" variant="outline" asChild>
              <Link to="/for-companies#post-opportunity">Post a Job Opening</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FindTalent;
