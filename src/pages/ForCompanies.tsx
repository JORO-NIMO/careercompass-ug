import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles, Clock, ShieldCheck, CircleAlert, Globe, MapPin } from 'lucide-react';
import { fetchMyCompany, registerCompany, type Company, type VerificationMeta } from '@/services/companiesService';
import { companyRegistrationSchema } from '@/lib/validations';
import { BulletWalletCard } from '@/components/BulletWalletCard';

interface ActiveBoost {
  id: string;
  entityId: string;
  placementTitle: string;
  companyName: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
}

interface CompanyFormState {
  name: string;
  location: string;
  website_url: string;
  contact_email: string;
}

const ForCompanies = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement | null>(null);
  
  const [company, setCompany] = useState<Company | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companyForm, setCompanyForm] = useState<CompanyFormState>({
    name: '',
    location: '',
    website_url: '',
    contact_email: '',
  });
  const [registeringCompany, setRegisteringCompany] = useState(false);
  const [verificationMeta, setVerificationMeta] = useState<VerificationMeta | null>(null);
  
  const [positionTitle, setPositionTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('');
  const [industry, setIndustry] = useState('');
  const [stipend, setStipend] = useState('');
  const [availableSlots, setAvailableSlots] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeBoosts, setActiveBoosts] = useState<ActiveBoost[]>([]);
  const [loadingBoosts, setLoadingBoosts] = useState(false);

  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to post placements",
      });
      navigate('/signin');
    }
  }, [user, navigate, toast]);

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setCompany(null);
      setVerificationMeta(null);
      setCompanyLoading(false);
      return;
    }

    const loadCompany = async () => {
      setCompanyLoading(true);
      try {
        const record = await fetchMyCompany();
        if (!isMounted) return;
        setCompany(record);
        setVerificationMeta(null);
        if (record) {
          setCompanyForm({
            name: record.name,
            location: record.formatted_address ?? record.location_raw ?? '',
            website_url: record.website_url ?? '',
            contact_email: record.contact_email ?? user.email ?? '',
          });
          setCompanyName((prev) => prev || record.name);
        } else {
          setCompanyForm((prev) => ({
            ...prev,
            contact_email: user.email ?? prev.contact_email,
          }));
        }
      } catch (error) {
        console.error('Failed to load company', error);
        if (isMounted) {
          toast({
            title: 'Unable to load company',
            description: 'Try again shortly.',
            variant: 'destructive',
          });
        }
      } finally {
        if (isMounted) {
          setCompanyLoading(false);
        }
      }
    };

    loadCompany();

    return () => {
      isMounted = false;
    };
  }, [user, toast]);

  useEffect(() => {
    if (!user) {
      setActiveBoosts([]);
      setLoadingBoosts(false);
      return;
    }

    let isMounted = true;
    const loadBoosts = async () => {
      setLoadingBoosts(true);
      try {
        const nowIso = new Date().toISOString();
        const { data: placementRows, error: placementError } = await supabase
          .from('placements')
          .select('id, position_title, company_name')
          .eq('created_by', user.id);

        if (placementError) throw placementError;

        const placementMap = new Map<string, { title: string; company: string }>();
        (placementRows ?? []).forEach((row) => {
          placementMap.set(row.id, {
            title: row.position_title ?? 'Untitled placement',
            company: row.company_name ?? 'Your company',
          });
        });

        if (!isMounted) return;

        if (placementMap.size === 0) {
          setActiveBoosts([]);
          return;
        }

        const placementIds = Array.from(placementMap.keys());
        const { data: boostRows, error: boostError } = await supabase
          .from('boosts')
          .select('id, entity_id, entity_type, starts_at, ends_at, is_active, created_at')
          .in('entity_id', placementIds)
          .eq('entity_type', 'listing')
          .eq('is_active', true)
          .lte('starts_at', nowIso)
          .gt('ends_at', nowIso)
          .order('ends_at', { ascending: true });

        if (boostError) throw boostError;

        if (!isMounted) return;

        const mapped = (boostRows ?? []).map((row) => {
          const placement = placementMap.get(row.entity_id);
          return {
            id: row.id,
            entityId: row.entity_id,
            placementTitle: placement?.title ?? 'Placement',
            companyName: placement?.company ?? 'Your company',
            startsAt: row.starts_at,
            endsAt: row.ends_at,
            createdAt: row.created_at ?? row.starts_at,
          } as ActiveBoost;
        });

        setActiveBoosts(mapped);
      } catch (error) {
        console.error('Failed to load boosts', error);
        toast({
          title: 'Unable to load boosts',
          description: 'Refresh the page or try again shortly.',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) {
          setLoadingBoosts(false);
        }
      }
    };

    loadBoosts();

    return () => {
      isMounted = false;
    };
  }, [user, toast]);

  const handleCompanySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (registeringCompany) {
      return;
    }
    const parsed = companyRegistrationSchema.safeParse({
      name: companyForm.name.trim(),
      location: companyForm.location.trim(),
      website_url: companyForm.website_url.trim(),
      contact_email: companyForm.contact_email.trim() ? companyForm.contact_email.trim() : undefined,
    });

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Please review the form inputs.';
      toast({
        title: 'Invalid company details',
        description: firstError,
        variant: 'destructive',
      });
      return;
    }

    try {
      setRegisteringCompany(true);
      const { company: savedCompany, verification } = await registerCompany(parsed.data);
      setCompany(savedCompany);
      setVerificationMeta(verification);
      setCompanyForm({
        name: savedCompany.name,
        location: savedCompany.formatted_address ?? savedCompany.location_raw ?? parsed.data.location,
        website_url: savedCompany.website_url ?? parsed.data.website_url ?? '',
        contact_email: savedCompany.contact_email ?? parsed.data.contact_email ?? user?.email ?? '',
      });
      setCompanyName(savedCompany.name);

      if (savedCompany.approved) {
        toast({
          title: 'Company approved automatically',
          description: 'We verified your location and website successfully.',
        });
      } else {
        const pendingReasons: string[] = [];
        if (verification && !verification.maps.verified) {
          pendingReasons.push('confirm your Google Maps location');
        }
        if (verification && !verification.web.verified) {
          pendingReasons.push('ensure your website is reachable');
        }
        toast({
          title: 'Verification pending',
          description: pendingReasons.length
            ? `Pending manual review — ${pendingReasons.join(' and ')}.`
            : 'We will review your company shortly. You will receive an email once approved.',
        });
      }
    } catch (error: any) {
      console.error('Company registration error', error);
      toast({
        title: 'Unable to save company',
        description: error?.message ?? 'Please try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setRegisteringCompany(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) {
      return;
    }

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
      const { data: insertedPlacement, error } = await supabase
        .from('placements')
        .insert({
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
        })
        .select('id')
        .single();

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

          <section className="max-w-3xl mx-auto w-full">
            <Card>
              <CardHeader className="pb-2">
                  <CardTitle>Company verification</CardTitle>
              </CardHeader>
              <CardContent className="pt-2 space-y-4">
                {companyLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking your company record…</span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {company?.approved ? (
                          <ShieldCheck className="h-5 w-5 text-primary" />
                        ) : (
                          <Clock className="h-5 w-5 text-amber-500" />
                        )}
                        <span className="font-medium">
                          {company
                            ? company.approved
                              ? 'Company approved'
                              : 'Pending approval'
                            : 'Register your company to unlock placement publishing.'}
                        </span>
                      </div>
                      {company && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant={company.maps_verified ? 'default' : 'outline'}>
                            Google Maps {company.maps_verified ? 'verified' : 'not verified'}
                          </Badge>
                          <Badge variant={company.web_verified ? 'default' : 'outline'}>
                            Website {company.web_verified ? 'verified' : 'not verified'}
                          </Badge>
                          <Badge variant={company.approved ? 'default' : 'secondary'}>
                            {company.approved ? 'Approved' : 'Review pending'}
                          </Badge>
                        </div>
                      )}
                      {company?.formatted_address && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{company.formatted_address}</span>
                        </div>
                      )}
                      {company?.website_url && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Globe className="h-4 w-4" />
                          <a
                            href={company.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            {company.website_url}
                          </a>
                        </div>
                      )}
                      {!company?.approved && company?.verification_notes && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CircleAlert className="h-4 w-4" />
                          <span>{company.verification_notes}</span>
                        </div>
                      )}
                    </div>

                    <form className="space-y-4" onSubmit={handleCompanySubmit}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="company-name">Company name</Label>
                          <Input
                            id="company-name"
                            value={companyForm.name}
                            onChange={(event) => setCompanyForm((prev) => ({ ...prev, name: event.target.value }))}
                            placeholder="e.g. Kampala Tech Hub"
                            required
                            disabled={registeringCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company-email">Contact email</Label>
                          <Input
                            id="company-email"
                            type="email"
                            value={companyForm.contact_email}
                            onChange={(event) => setCompanyForm((prev) => ({ ...prev, contact_email: event.target.value }))}
                            placeholder="team@example.com"
                            disabled={registeringCompany}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company-location">Google Maps location</Label>
                        <Input
                          id="company-location"
                          value={companyForm.location}
                          onChange={(event) => setCompanyForm((prev) => ({ ...prev, location: event.target.value }))}
                          placeholder="Plot 12 Kampala Road, Kampala"
                          required
                          disabled={registeringCompany}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company-website">Company website</Label>
                        <Input
                          id="company-website"
                          value={companyForm.website_url}
                          onChange={(event) => setCompanyForm((prev) => ({ ...prev, website_url: event.target.value }))}
                          placeholder="https://yourcompany.com"
                          required
                          disabled={registeringCompany}
                        />
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                          We auto-approve once your location and website are verified.
                        </p>
                        <Button type="submit" disabled={registeringCompany}>
                          {registeringCompany ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving…
                            </>
                          ) : company ? (
                            'Update & re-verify'
                          ) : (
                            'Register company'
                          )}
                        </Button>
                      </div>
                    </form>

                    {verificationMeta && (
                      <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                        <div>
                          Google Maps: {verificationMeta.maps.verified
                            ? 'Verified'
                            : verificationMeta.maps.rawStatus ?? 'Not verified'}
                        </div>
                        <div>
                          Website: {verificationMeta.web.verified
                            ? 'Verified'
                            : verificationMeta.web.rawError
                              ? verificationMeta.web.rawError
                              : verificationMeta.web.status
                                ? `Status ${verificationMeta.web.status}`
                                : 'Not verified'}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </section>

          {user ? (
            <section className="grid gap-6 md:grid-cols-2">
              <BulletWalletCard
                ownerId={user.id}
                title="Your personal bullets"
                description="Use personal credits to experiment with boosts or share spotlighted content."
              />
              {company ? (
                <BulletWalletCard
                  ownerId={company.id}
                  title={`${company.name} credits`}
                  description="Spend company bullets to boost published placements and reach more students."
                  enableBoostActions
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Placement boosts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Register and verify your company to unlock a dedicated wallet for boosts and featured slots.
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>
          ) : null}

          <section className="max-w-3xl mx-auto w-full">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Featured placements</CardTitle>
              </CardHeader>
              <CardContent className="pt-2 space-y-4">
                {loadingBoosts ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking your featured placements…</span>
                  </div>
                ) : activeBoosts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Featured placements go live automatically once your payment is confirmed. Active features appear here with their scheduled end date.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeBoosts.map((boost) => {
                      const boostEnd = new Date(boost.endsAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });
                      const boostStart = new Date(boost.startsAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });

                      return (
                        <div key={boost.id} className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                <Sparkles className="h-4 w-4" />
                                Featured placement
                              </div>
                              <h3 className="text-lg font-semibold text-foreground">{boost.placementTitle}</h3>
                              <p className="text-sm text-muted-foreground">{boost.companyName}</p>
                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground pt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  Runs {boostStart} – {boostEnd}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section ref={formRef} className="max-w-3xl mx-auto w-full">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Placement details</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {company && !company.approved && (
                  <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Your company is currently pending approval. Placements will remain hidden until verification is complete.
                  </div>
                )}
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
                    Placements are saved as drafts until an admin approves them. Once approved, any boosts tied to confirmed payments will start automatically and appear above.
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