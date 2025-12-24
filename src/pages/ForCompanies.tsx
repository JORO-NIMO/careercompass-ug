import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ForCompanies = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement | null>(null);
  
  const [positionTitle, setPositionTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('');
  const [industry, setIndustry] = useState('');
  const [stipend, setStipend] = useState('');
  const [availableSlots, setAvailableSlots] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to post placements",
      });
      navigate('/signin');
    }
  }, [user, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!positionTitle.trim() || !companyName.trim() || !description.trim() || !region || !industry || !availableSlots.trim()) {
      toast({
        title: "Missing information",
        description: "Please complete all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    const slotsNumber = Number.parseInt(availableSlots, 10);

    if (Number.isNaN(slotsNumber) || slotsNumber <= 0) {
      toast({
        title: "Invalid slot count",
        description: "Enter how many positions you have available.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const { error } = await supabase.from('placements').insert({
        position_title: positionTitle.trim(),
        company_name: companyName.trim(),
        description: description.trim(),
        region,
        industry,
        stipend: stipend.trim(),
        available_slots: slotsNumber,
        created_by: user?.id,
        approved: false,
        contact_info: user?.email || null,
      });

      if (error) throw error;

      toast({
        title: "Submitted",
        description: "Placement submitted and is pending admin review. You will be notified once approved.",
      });

      // Reset form
      setPositionTitle('');
      setCompanyName('');
      setDescription('');
      setRegion('');
      setIndustry('');
      setStipend('');
      setAvailableSlots('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post placement",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const regionOptions = [
    { value: 'central', label: 'Central Region' },
    { value: 'eastern', label: 'Eastern Region' },
    { value: 'northern', label: 'Northern Region' },
    { value: 'western', label: 'Western Region' },
  ];

  const industryOptions = [
    { value: 'technology', label: 'Technology' },
    { value: 'finance', label: 'Finance' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'education', label: 'Education' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'creative', label: 'Creative & Media' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-16">
        <div className="container mx-auto px-4 space-y-16">
          <section className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold">Post a Placement</h1>
            <p className="text-lg text-muted-foreground">
              Share your internship or graduate opportunities with thousands of motivated students across Uganda. Provide the details below and our team will review before publishing.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" onClick={scrollToForm} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Start Posting'}
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/find-talent">Browse Candidates</a>
              </Button>
            </div>
          </section>

          <section ref={formRef} className="max-w-3xl mx-auto w-full">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Placement details</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Position title</Label>
                      <Input
                        id="title"
                        placeholder="e.g. Software Engineer Intern"
                        value={positionTitle}
                        onChange={(e) => setPositionTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company name</Label>
                      <Input
                        id="company"
                        placeholder="Your company name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Role description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the role, responsibilities, and ideal candidate…"
                      rows={6}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Region</Label>
                      <Select value={region || undefined} onValueChange={setRegion}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {regionOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Select value={industry || undefined} onValueChange={setIndustry}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {industryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stipend">Stipend (optional)</Label>
                      <Input
                        id="stipend"
                        placeholder="e.g. 500,000 UGX/month"
                        value={stipend}
                        onChange={(e) => setStipend(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slots">Available slots</Label>
                      <Input
                        id="slots"
                        type="number"
                        min={1}
                        placeholder="e.g. 5"
                        value={availableSlots}
                        onChange={(e) => setAvailableSlots(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Placements are saved as drafts until an admin approves them. You will receive an email once the listing is live.
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                    {submitting ? 'Submitting placement…' : 'Submit for review'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ForCompanies;