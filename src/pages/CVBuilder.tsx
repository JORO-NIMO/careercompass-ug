import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Plus, Trash2, Eye, EyeOff, Save, RotateCcw, Printer } from "lucide-react";
import { toast } from "sonner";

interface Experience {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Education {
  id: string;
  degree: string;
  institution: string;
  location: string;
  graduationDate: string;
  gpa: string;
}

interface Referee {
  id: string;
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
}

interface CVData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedIn: string;
    website: string;
  };
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  languages: string[];
  referees: Referee[];
}

const CVBuilder = () => {
  const [cvData, setCvData] = useState<CVData>({
    personalInfo: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      linkedIn: "",
      website: ""
    },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    languages: [],
    referees: []
  });

  const [currentSkill, setCurrentSkill] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("");
  const [newReferee, setNewReferee] = useState<Omit<Referee, 'id'>>({
    name: "",
    title: "",
    company: "",
    phone: "",
    email: ""
  });
  const [showPreview, setShowPreview] = useState(true);

  // Auto-save to localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('cvBuilderData');
    if (savedData) {
      try {
        setCvData(JSON.parse(savedData));
        toast.info("Previous CV data loaded");
      } catch (e) {
        console.error("Failed to load saved CV data", e);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('cvBuilderData', JSON.stringify(cvData));
    }, 1000);
    return () => clearTimeout(timer);
  }, [cvData]);

  const addExperience = () => {
    const newExp: Experience = {
      id: Date.now().toString(),
      title: "",
      company: "",
      location: "",
      startDate: "",
      endDate: "",
      description: ""
    };
    setCvData({ ...cvData, experience: [...cvData.experience, newExp] });
  };

  const updateExperience = (id: string, field: keyof Experience, value: string) => {
    setCvData({
      ...cvData,
      experience: cvData.experience.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    });
  };

  const removeExperience = (id: string) => {
    setCvData({
      ...cvData,
      experience: cvData.experience.filter(exp => exp.id !== id)
    });
  };

  const addEducation = () => {
    const newEdu: Education = {
      id: Date.now().toString(),
      degree: "",
      institution: "",
      location: "",
      graduationDate: "",
      gpa: ""
    };
    setCvData({ ...cvData, education: [...cvData.education, newEdu] });
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    setCvData({
      ...cvData,
      education: cvData.education.map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    });
  };

  const removeEducation = (id: string) => {
    setCvData({
      ...cvData,
      education: cvData.education.filter(edu => edu.id !== id)
    });
  };

  const addSkill = () => {
    if (currentSkill.trim()) {
      setCvData({ ...cvData, skills: [...cvData.skills, currentSkill.trim()] });
      setCurrentSkill("");
    }
  };

  const removeSkill = (index: number) => {
    setCvData({
      ...cvData,
      skills: cvData.skills.filter((_, i) => i !== index)
    });
  };

  const addLanguage = () => {
    if (currentLanguage.trim()) {
      setCvData({ ...cvData, languages: [...cvData.languages, currentLanguage.trim()] });
      setCurrentLanguage("");
    }
  };

  const removeLanguage = (index: number) => {
    setCvData({
      ...cvData,
      languages: cvData.languages.filter((_, i) => i !== index)
    });
  };
  const addReferee = () => {
    if (newReferee.name.trim()) {
      setCvData({
        ...cvData,
        referees: [...cvData.referees, { ...newReferee, id: Date.now().toString() }]
      });
      setNewReferee({ name: "", title: "", company: "", phone: "", email: "" });
      toast.success("Referee added");
    } else {
      toast.error("Referee name is required");
    }
  };

  const removeReferee = (index: number) => {
    setCvData({
      ...cvData,
      referees: cvData.referees.filter((_, i) => i !== index)
    });
  };

  const handleDownload = () => {
    if (!cvData.personalInfo.fullName || !cvData.personalInfo.email) {
      toast.error("Please fill in your name and email first");
      return;
    }
    window.print();
    toast.success("Use your browser's print dialog to save as PDF");
  };

  const handleSave = () => {
    localStorage.setItem('cvBuilderData', JSON.stringify(cvData));
    toast.success("CV saved successfully!");
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to clear all CV data? This cannot be undone.")) {
      setCvData({
        personalInfo: {
          fullName: "",
          email: "",
          phone: "",
          location: "",
          linkedIn: "",
          website: ""
        },
        summary: "",
        experience: [],
        education: [],
        skills: [],
        languages: [],
        referees: []
      });
      localStorage.removeItem('cvBuilderData');
      toast.success("CV data cleared");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month] = dateString.split('-');
    if (!year || !month) return dateString;
    const monthIndex = Number.parseInt(month, 10) - 1;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (monthIndex < 0 || monthIndex >= monthNames.length) return year;
    return `${monthNames[monthIndex]} ${year}`;
  };

  const deriveProfessionalTitle = (data: CVData): string => {
    if (data.experience.length === 0) return "";
    const sorted = [...data.experience].sort((a, b) => (b.startDate || "") > (a.startDate || "") ? 1 : -1);
    const title = sorted[0]?.title?.trim();
    return title || "";
  };

  const splitDescription = (text: string): string[] => {
    if (!text) return [];
    return text
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-•\d.\s]+/, "").trim())
      .filter(Boolean);
  };

  const categorizeSkills = (skills: string[]) => {
    const buckets: Record<string, string[]> = {
      "Technical Skills": [],
      "Tools & Platforms": [],
      "Professional Strengths": [],
    };

    const technicalKeywords = ["engineer", "developer", "program", "code", "data", "analysis", "sql", "cloud", "api", "python", "javascript", "typescript", "java", "c++", "aws", "azure", "design", "research", "marketing", "finance", "product", "ui", "ux"];
    const toolsKeywords = ["git", "github", "jira", "figma", "notion", "excel", "powerpoint", "canva", "slack", "trello", "zapier", "powerbi", "tableau"];

    skills.forEach((skillRaw) => {
      const skill = skillRaw.trim();
      if (!skill) return;
      const lowered = skill.toLowerCase();
      if (technicalKeywords.some((keyword) => lowered.includes(keyword))) {
        buckets["Technical Skills"].push(skill);
      } else if (toolsKeywords.some((keyword) => lowered.includes(keyword))) {
        buckets["Tools & Platforms"].push(skill);
      } else {
        buckets["Professional Strengths"].push(skill);
      }
    });

    return Object.entries(buckets)
      .map(([category, items]) => ({ category, items }))
      .filter(({ items }) => items.length > 0);
  };

  const buildResumePreview = useMemo(() => {
    const lines: string[] = [];
    const { personalInfo, summary, experience, education, skills, languages } = cvData;
    const professionalTitle = deriveProfessionalTitle(cvData);

    // HEADER
    if (personalInfo.fullName) {
      lines.push(personalInfo.fullName.toUpperCase());
      if (professionalTitle) {
        lines.push(professionalTitle);
      }
      if (personalInfo.location) {
        lines.push(personalInfo.location);
      }
      const contacts = [
        personalInfo.phone,
        personalInfo.email,
        personalInfo.linkedIn,
        personalInfo.website,
      ].filter(Boolean);
      if (contacts.length > 0) {
        lines.push(contacts.join(" | "));
      }
      lines.push("");
    }

    // PROFESSIONAL SUMMARY
    if (summary.trim()) {
      lines.push("PROFESSIONAL SUMMARY");
      lines.push(summary.trim());
      lines.push("");
    }

    // CORE SKILLS
    const categorizedSkills = categorizeSkills(skills);
    if (categorizedSkills.length > 0) {
      lines.push("CORE SKILLS");
      categorizedSkills.forEach(({ category, items }) => {
        lines.push(`${category}: ${items.join(", ")}`);
      });
      lines.push("");
    }

    // PROFESSIONAL EXPERIENCE
    if (experience.length > 0) {
      lines.push("PROFESSIONAL EXPERIENCE");
      const sortedExperience = [...experience].sort((a, b) => {
        const dateA = a.startDate || "";
        const dateB = b.startDate || "";
        return dateA < dateB ? 1 : -1;
      });

      sortedExperience.forEach((role) => {
        const title = role.title || "Role";
        const company = role.company || "";
        const location = role.location ? `, ${role.location}` : "";
        const header = company ? `${title} — ${company}${location}` : `${title}${location}`;
        lines.push(header.trim());

        const start = formatDate(role.startDate);
        const end = formatDate(role.endDate) || "Present";
        const dateLine = [start, end].filter(Boolean).join(" – ");
        if (dateLine) {
          lines.push(dateLine);
        }

        const bullets = splitDescription(role.description);
        bullets.forEach((bullet) => {
          lines.push(`• ${bullet}`);
        });

        lines.push("");
      });
    }

    // EDUCATION
    if (education.length > 0) {
      lines.push("EDUCATION");
      const sortedEducation = [...education].sort((a, b) => (b.graduationDate || "") > (a.graduationDate || "") ? 1 : -1);

      sortedEducation.forEach((edu) => {
        const degree = edu.degree || "";
        const institution = edu.institution ? ` — ${edu.institution}` : "";
        const location = edu.location ? `, ${edu.location}` : "";
        lines.push(`${degree}${institution}${location}`.trim());
        if (edu.graduationDate) {
          lines.push(formatDate(edu.graduationDate));
        }
        if (edu.gpa) {
          lines.push(`GPA: ${edu.gpa}`);
        }
        lines.push("");
      });
    }

    // REFEREES
    if (cvData.referees && cvData.referees.length > 0) {
      lines.push("REFEREES");
      cvData.referees.forEach((ref) => {
        lines.push(ref.name);
        if (ref.title || ref.company) {
          lines.push([ref.title, ref.company].filter(Boolean).join(", "));
        }
        const contacts = [ref.phone, ref.email].filter(Boolean);
        if (contacts.length > 0) {
          lines.push(contacts.join(" | "));
        }
        lines.push("");
      });
    }

    // ADDITIONAL SECTIONS
    if (languages.length > 0) {
      lines.push("LANGUAGES");
      lines.push(languages.join(", "));
      lines.push("");
    }

    return lines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }, [cvData]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="mb-4" variant="secondary">Free Tool</Badge>
          <h1 className="text-4xl font-bold mb-4">CV Builder</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create a professional CV in minutes. Your data is auto-saved and never leaves your device.
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Now
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Your contact details and basic information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={cvData.personalInfo.fullName}
                      onChange={(e) => setCvData({
                        ...cvData,
                        personalInfo: { ...cvData.personalInfo, fullName: e.target.value }
                      })}
                      placeholder="Alex Johnson"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={cvData.personalInfo.email}
                      onChange={(e) => setCvData({
                        ...cvData,
                        personalInfo: { ...cvData.personalInfo, email: e.target.value }
                      })}
                      placeholder="alex@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={cvData.personalInfo.phone}
                      onChange={(e) => setCvData({
                        ...cvData,
                        personalInfo: { ...cvData.personalInfo, phone: e.target.value }
                      })}
                      placeholder="+1 555 123 4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Town / City</Label>
                    <Input
                      id="location"
                      value={cvData.personalInfo.location}
                      onChange={(e) => setCvData({
                        ...cvData,
                        personalInfo: { ...cvData.personalInfo, location: e.target.value }
                      })}
                      placeholder="e.g. Kampala, UG"
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedIn">LinkedIn</Label>
                    <Input
                      id="linkedIn"
                      value={cvData.personalInfo.linkedIn}
                      onChange={(e) => setCvData({
                        ...cvData,
                        personalInfo: { ...cvData.personalInfo, linkedIn: e.target.value }
                      })}
                      placeholder="linkedin.com/in/yourprofilename"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website/Portfolio site</Label>
                    <Input
                      id="website"
                      value={cvData.personalInfo.website}
                      onChange={(e) => setCvData({
                        ...cvData,
                        personalInfo: { ...cvData.personalInfo, website: e.target.value }
                      })}
                      placeholder="yourportfolio.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Professional Summary</CardTitle>
                <CardDescription>A brief overview of your career and goals</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={cvData.summary}
                  onChange={(e) => setCvData({ ...cvData, summary: e.target.value })}
                  placeholder="Provide a detailed overview of your career and goals..."
                  rows={4}
                />
              </CardContent>
            </Card>
            {/* Experience */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Work Experience</CardTitle>
                    <CardDescription>Your professional work history</CardDescription>
                  </div>
                  <Button onClick={addExperience} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {cvData.experience.map((exp, index) => (
                  <div key={exp.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">Experience {index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExperience(exp.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <Input
                        placeholder="Job Title"
                        value={exp.title}
                        onChange={(e) => updateExperience(exp.id, "title", e.target.value)}
                      />
                      <Input
                        placeholder="Company Name"
                        value={exp.company}
                        onChange={(e) => updateExperience(exp.id, "company", e.target.value)}
                      />
                      <Input
                        placeholder="Location"
                        value={exp.location}
                        onChange={(e) => updateExperience(exp.id, "location", e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="month"
                          placeholder="Start Date"
                          value={exp.startDate}
                          onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)}
                        />
                        <Input
                          type="month"
                          placeholder="End Date"
                          value={exp.endDate}
                          onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)}
                        />
                      </div>
                    </div>
                    <Textarea
                      placeholder="Job description and achievements..."
                      value={exp.description}
                      onChange={(e) => updateExperience(exp.id, "description", e.target.value)}
                      rows={3}
                    />
                  </div>
                ))}
                {cvData.experience.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No experience added yet. Click "Add" to get started.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Education */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Education</CardTitle>
                    <CardDescription>Your academic qualifications</CardDescription>
                  </div>
                  <Button onClick={addEducation} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {cvData.education.map((edu, index) => (
                  <div key={edu.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">Education {index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEducation(edu.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <Input
                        placeholder="Degree/Certificate"
                        value={edu.degree}
                        onChange={(e) => updateEducation(edu.id, "degree", e.target.value)}
                      />
                      <Input
                        placeholder="Institution Name"
                        value={edu.institution}
                        onChange={(e) => updateEducation(edu.id, "institution", e.target.value)}
                      />
                      <Input
                        placeholder="Location"
                        value={edu.location}
                        onChange={(e) => updateEducation(edu.id, "location", e.target.value)}
                      />
                      <Input
                        type="month"
                        placeholder="Graduation Date"
                        value={edu.graduationDate}
                        onChange={(e) => updateEducation(edu.id, "graduationDate", e.target.value)}
                      />
                      <Input
                        placeholder="GPA (optional)"
                        value={edu.gpa}
                        onChange={(e) => updateEducation(edu.id, "gpa", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                {cvData.education.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No education added yet. Click "Add" to get started.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Skills & Languages */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Skills</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill"
                      value={currentSkill}
                      onChange={(e) => setCurrentSkill(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addSkill()}
                    />
                    <Button onClick={addSkill} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cvData.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer">
                        {skill}
                        <button
                          onClick={() => removeSkill(index)}
                          className="ml-2 hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Languages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a language"
                      value={currentLanguage}
                      onChange={(e) => setCurrentLanguage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addLanguage()}
                    />
                    <Button onClick={addLanguage} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cvData.languages.map((lang, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer">
                        {lang}
                        <button
                          onClick={() => removeLanguage(index)}
                          className="ml-2 hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              {/* Referees */}
              <Card>
                <CardHeader>
                  <CardTitle>Referees</CardTitle>
                  <CardDescription>Professional references for your CV</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        placeholder="Jane Doe"
                        value={newReferee.name}
                        onChange={(e) => setNewReferee({ ...newReferee, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Job Title</Label>
                      <Input
                        placeholder="Senior Manager"
                        value={newReferee.title}
                        onChange={(e) => setNewReferee({ ...newReferee, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Input
                        placeholder="Organization Ltd"
                        value={newReferee.company}
                        onChange={(e) => setNewReferee({ ...newReferee, company: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        placeholder="e.g., +1 555 000 0000"
                        value={newReferee.phone}
                        onChange={(e) => setNewReferee({ ...newReferee, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        placeholder="jane@example.com"
                        value={newReferee.email}
                        onChange={(e) => setNewReferee({ ...newReferee, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={addReferee} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Referee
                  </Button>

                  <div className="space-y-2 mt-4">
                    {cvData.referees.map((ref, index) => (
                      <div key={ref.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">{ref.name}</p>
                          <p className="text-xs text-muted-foreground">{ref.title} at {ref.company}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeReferee(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Preview Section */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>CV Preview</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      {showPreview ? "Hide" : "Show"}
                    </Button>
                    <Button size="sm" onClick={handleDownload} disabled={!cvData.personalInfo.fullName}>
                      <Printer className="h-4 w-4 mr-2" />
                      Print/PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {showPreview && (
                <CardContent className="bg-white p-6 max-h-[800px] overflow-y-auto print:max-h-none print:p-8" id="cv-preview">
                  {(!cvData.personalInfo.fullName && !cvData.personalInfo.email) ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="mb-2">Your ATS-ready CV will appear here</p>
                      <p className="text-sm">Complete the form to generate an optimized layout</p>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground">
                      {buildResumePreview}
                    </pre>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #cv-preview, #cv-preview * {
              visibility: visible;
              color: black !important;
            }
            #cv-preview {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: auto;
              overflow: visible !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            /* print-max-h-none helper removed to avoid escape issues */
            pre {
              white-space: pre-wrap !important;
              word-wrap: break-word !important;
              font-family: serif !important;
              font-size: 11pt !important;
            }
          }
          @page {
            size: auto;
            margin: 20mm;
          }
        `}</style>
      </div>
    </div>
  );
};

export default CVBuilder;
