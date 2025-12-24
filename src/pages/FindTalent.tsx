import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Briefcase, GraduationCap, Mail, Phone, Globe, Award } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Candidate {
  id: string;
  name: string;
  title: string;
  location: string;
  field: string;
  education: string;
  skills: string[];
  experience: string;
  email: string;
  phone: string;
  availability: string;
  verified: boolean;
}

const FindTalent = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedField, setSelectedField] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedExperience, setSelectedExperience] = useState("all");

  // TODO: Fetch candidates from Supabase
  const filteredCandidates: Candidate[] = [];

  const locations = ["All Locations", "Kampala", "Entebbe", "Mbarara", "Jinja", "Gulu", "Mbale"];
  const experienceLevels = ["All Experience", "Fresh Graduate", "1-2 years", "3-5 years", "5+ years"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="mb-4" variant="secondary">For Employers</Badge>
          <h1 className="text-4xl font-bold mb-4">Find Talent</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Search for qualified candidates across Uganda. Connect with skilled professionals ready for their next opportunity.
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-4 gap-4">
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
                  {fields.slice(1).map(field => (
                    <SelectItem key={field} value={field}>{field}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.slice(1).map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
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
          {filteredCandidates.length === 0 && (
            <Card className="md:col-span-2 py-12">
              <CardContent className="text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
                <p className="text-muted-foreground mb-4">
                  The talent search feature is currently being populated with verified candidates. Contact us to be featured.
                </p>
                <a href="mailto:joronimoamanya@gmail.com">
                  <Button>Contact Us</Button>
                </a>
              </CardContent>
            </Card>
          )}
          {filteredCandidates.map((candidate) => (
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
                  </div>
                </div>

                {/* Contact Info */}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${candidate.email}`} className="text-blue-600 hover:underline">
                      {candidate.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${candidate.phone}`} className="text-blue-600 hover:underline">
                      {candidate.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Available: {candidate.availability}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1">Contact Candidate</Button>
                  <Button variant="outline">Save</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredCandidates.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No candidates found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria or filters
              </p>
              <Button onClick={() => {
                setSearchTerm("");
                setSelectedField("all");
                setSelectedLocation("all");
              }}>
                Clear Filters
              </Button>
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
            <Button size="lg" variant="outline">Post a Job Opening</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FindTalent;
