import { useState, useEffect } from "react";
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
    languages: []
  });

  const [currentSkill, setCurrentSkill] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("");
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
        languages: []
      });
      localStorage.removeItem('cvBuilderData');
      toast.success("CV data cleared");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month] = dateString.split('-');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

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
                      placeholder="John Doe"
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
                      placeholder="john@example.com"
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
                      placeholder="+256 700000000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={cvData.personalInfo.location}
                      onChange={(e) => setCvData({
                        ...cvData,
                        personalInfo: { ...cvData.personalInfo, location: e.target.value }
                      })}
                      placeholder="Kampala, Uganda"
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
                      placeholder="linkedin.com/in/yourprofile"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website/Portfolio</Label>
                    <Input
                      id="website"
                      value={cvData.personalInfo.website}
                      onChange={(e) => setCvData({
                        ...cvData,
                        personalInfo: { ...cvData.personalInfo, website: e.target.value }
                      })}
                      placeholder="yourwebsite.com"
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
                  placeholder="Passionate software developer with 3+ years of experience in building web applications..."
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
                <CardContent className="bg-white p-8 max-h-[800px] overflow-y-auto print:max-h-none" id="cv-preview">
                  {/* CV Preview Content */}
                  {!cvData.personalInfo.fullName && !cvData.personalInfo.email ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="mb-2">Your CV will appear here</p>
                      <p className="text-sm">Start by filling in your personal information</p>
                    </div>
                  ) : (
                    <div className="space-y-6 text-sm">
                      {/* Personal Info */}
                    {cvData.personalInfo.fullName && (
                      <div className="text-center border-b pb-4">
                        <h2 className="text-2xl font-bold">{cvData.personalInfo.fullName}</h2>
                        <div className="mt-2 text-muted-foreground space-y-1">
                          {cvData.personalInfo.email && <p>{cvData.personalInfo.email}</p>}
                          {cvData.personalInfo.phone && <p>{cvData.personalInfo.phone}</p>}
                          {cvData.personalInfo.location && <p>{cvData.personalInfo.location}</p>}
                          {cvData.personalInfo.linkedIn && <p>{cvData.personalInfo.linkedIn}</p>}
                          {cvData.personalInfo.website && <p>{cvData.personalInfo.website}</p>}
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {cvData.summary && (
                      <div>
                        <h3 className="text-lg font-bold mb-2">PROFESSIONAL SUMMARY</h3>
                        <p className="text-muted-foreground">{cvData.summary}</p>
                      </div>
                    )}

                    {/* Experience */}
                    {cvData.experience.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold mb-3">WORK EXPERIENCE</h3>
                        <div className="space-y-4">
                          {cvData.experience.map((exp) => (
                            <div key={exp.id}>
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <h4 className="font-semibold">{exp.title}</h4>
                                  <p className="text-muted-foreground">{exp.company}</p>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {exp.startDate} - {exp.endDate}
                                </p>
                              </div>
                              {exp.location && (
                                <p className="text-sm text-muted-foreground mb-1">{exp.location}</p>
                              )}
                              {exp.description && (
                                <p className="text-muted-foreground">{exp.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {cvData.education.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold mb-3">EDUCATION</h3>
                        <div className="space-y-3">
                          {cvData.education.map((edu) => (
                            <div key={edu.id}>
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <h4 className="font-semibold">{edu.degree}</h4>
                                  <p className="text-muted-foreground">{edu.institution}</p>
                                </div>
                                <p className="text-sm text-muted-foreground">{edu.graduationDate}</p>
                              </div>
                              {edu.location && (
                                <p className="text-sm text-muted-foreground">{edu.location}</p>
                              )}
                              {edu.gpa && <p className="text-sm">GPA: {edu.gpa}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {cvData.skills.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold mb-2">SKILLS</h3>
                        <p className="text-muted-foreground">{cvData.skills.join(" • ")}</p>
                      </div>
                    )}

                    {/* Languages */}
                    {cvData.languages.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold mb-2">LANGUAGES</h3>
                        <p className="text-muted-foreground">{cvData.languages.join(" • ")}</p>
                      </div>
                    )}
                  </div>
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
            }
            #cv-preview {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default CVBuilder;
