import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuickNavigation from "@/components/QuickNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { instituteCategories, getInstitutesByCategory, publicUniversities, privateUniversities, Institution } from "@/lib/institutions";

const StudentProfile = () => {
  const [interests, setInterests] = useState(["Technology", "Finance"]);
  const [newInterest, setNewInterest] = useState("");
  const [institutionType, setInstitutionType] = useState<"University" | "Institute">("University");
  const [institutionId, setInstitutionId] = useState<string | undefined>(undefined);

  const handleInstitutionTypeChange = (value: string) => {
    if (value === "University" || value === "Institute") {
      setInstitutionType(value);
      setInstitutionId(undefined);
    }
  };

  const addInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest("");
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold">Talent Profile</h1>
              <p className="text-muted-foreground">Complete your profile to unlock tailored learning and career matches</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstname">First Name</Label>
                    <Input id="firstname" placeholder="Stephen" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastname">Last Name</Label>
                    <Input id="lastname" placeholder="Aine" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="aine.othername@company.com" />
                  <p className="text-xs text-muted-foreground">
                    Examples: aine.othername@company.com, aine.othername@gmail.com, aine.othername@school.ac.ug
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+256 756128513" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Learning & Experience</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Institution Type</Label>
                    <Select value={institutionType} onValueChange={handleInstitutionTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="University">University</SelectItem>
                        <SelectItem value="Institute">Institute</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{institutionType === "University" ? "University" : "Institute"}</Label>
                    <Select value={institutionId} onValueChange={(v) => setInstitutionId(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={institutionType === "University" ? "Select your university" : "Select your institute"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {institutionType === "University" ? (
                          <>
                            <SelectGroup>
                              <SelectLabel>Public Universities</SelectLabel>
                              {publicUniversities.map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                              ))}
                            </SelectGroup>
                            <SelectGroup>
                              <SelectLabel>Private Universities</SelectLabel>
                              {privateUniversities.map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                              ))}
                            </SelectGroup>
                          </>
                        ) : (
                          <>
                            {instituteCategories.map(cat => (
                              <SelectGroup key={cat}>
                                <SelectLabel>{cat}</SelectLabel>
                                {getInstitutesByCategory(cat).map((i: Institution) => (
                                  <SelectItem key={i.id} value={i.id}>{i.name} {i.ownership ? `(${i.ownership})` : ""}</SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stage</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">Learner / Emerging Talent</SelectItem>
                        <SelectItem value="graduate">Recent Graduate</SelectItem>
                        <SelectItem value="professional">Experienced Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Focus Area</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select focus" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="computer-science">Computer Science</SelectItem>
                        <SelectItem value="business">Business Administration</SelectItem>
                        <SelectItem value="engineering">Engineering</SelectItem>
                        <SelectItem value="medicine">Medicine</SelectItem>
                        <SelectItem value="agriculture">Agriculture</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                  <CardTitle>Areas of Interest</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="flex items-center gap-1">
                      {interest}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeInterest(interest)}
                      />
                    </Badge>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Add area of interest"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                  />
                  <Button onClick={addInterest} size="icon" variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Add your areas of interest to receive relevant opportunity recommendations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cv">CV/Resume Link</Label>
                  <Input id="cv" placeholder="https://drive.google.com/file/d/..." />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea 
                    id="bio" 
                    placeholder="Tell us about yourself, your goals, and the opportunities you're aiming for..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <QuickNavigation />

            <div className="flex gap-4">
              <Button className="flex-1">Save Profile</Button>
              <Button variant="outline" className="flex-1">Preview Profile</Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StudentProfile;