import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles, Clock, ShieldCheck, CircleAlert, Globe, MapPin } from 'lucide-react';
import { fetchMyCompany, registerCompany, type Company, type VerificationMeta } from '@/services/companiesService';
import { createPlacement } from '@/services/placementsService';
import { companyRegistrationSchema } from '@/lib/validations';
import { resolveApiUrl } from '@/lib/api-client';
import { LocationPicker } from '@/components/ui/LocationPicker';

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
  const location = useLocation();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement | null>(null);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://placementbridge.org';

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
  const [customRegion, setCustomRegion] = useState('');
  const [industry, setIndustry] = useState('');
  const [stipend, setStipend] = useState('');
  const [availableSlots, setAvailableSlots] = useState('');
  const [opportunityType, setOpportunityType] = useState('job');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [applicationMethod, setApplicationMethod] = useState('website');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [applicationEmail, setApplicationEmail] = useState('');
  const [applicationUrl, setApplicationUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [activeBoosts, setActiveBoosts] = useState<ActiveBoost[]>([]);
  const [loadingBoosts, setLoadingBoosts] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [listingLogoUrl, setListingLogoUrl] = useState('');

  const [geolocationCapturedAt, setGeolocationCapturedAt] = useState<string | null>(null);
  const featureMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('mode') === 'feature';
  }, [location.search]);

  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to post opportunities",
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
      } catch (error: unknown) {
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
            title: row.position_title ?? 'Untitled opportunity',
            company: row.company_name ?? 'Your organization',
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
            placementTitle: placement?.title ?? 'Opportunity',
            companyName: placement?.company ?? 'Your organization',
            startsAt: row.starts_at,
            endsAt: row.ends_at,
            createdAt: row.created_at ?? row.starts_at,
          } as ActiveBoost;
        });

        setActiveBoosts(mapped);
      } catch (error: unknown) {
        console.error('Failed to load boosts', error);
        if (isMounted) {
          setActiveBoosts([]);
        }
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
      website_url: companyForm.website_url.trim() || undefined,
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

      const missingWebsite = !savedCompany.website_url;
      if (missingWebsite) {
        void notifyMissingWebsite({
          id: savedCompany.id,
          name: savedCompany.name,
          contactEmail: savedCompany.contact_email ?? parsed.data.contact_email,
        });
      }

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
        if (missingWebsite) {
          pendingReasons.push('share a website or let us build one for you');
        }
        toast({
          title: 'Verification pending',
          description: pendingReasons.length
            ? `Pending manual review — ${pendingReasons.join(' and ')}.`
            : 'We will review your company shortly. You will receive an email once approved.',
        });
        if (missingWebsite) {
          toast({
            title: 'Website assistance queued',
            description: 'Our team will contact you with a simple landing page brief so we can verify your organisation.',
          });
        }
      }
    } catch (error: unknown) {
      console.error('Company registration error', error);
      const message = error instanceof Error ? error.message : 'Please try again shortly.';
      toast({
        title: 'Unable to save company',
        description: message,
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

    if (!positionTitle.trim() || !companyName.trim() || !description.trim() || !region || !industry || (region === 'other' && !customRegion.trim())) {
      toast({
        title: "Missing information",
        description: "Please complete all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Use the new listings system instead of legacy placements
      const { createListing } = await import('@/services/listingsService');

      await createListing({
        title: positionTitle.trim(),
        description: description.trim(),
        companyId: company?.id,
        opportunity_type: opportunityType,
        application_deadline: applicationDeadline || undefined,
        application_method: applicationMethod,
        whatsapp_number: applicationMethod === 'whatsapp' ? whatsappNumber.trim() : undefined,
        application_email: applicationMethod === 'email' ? applicationEmail.trim() : undefined,
        application_url: (applicationMethod === 'url' || applicationMethod === 'website') ? applicationUrl.trim() : undefined,
        application_url: (applicationMethod === 'url' || applicationMethod === 'website') ? applicationUrl.trim() : undefined,
        region: region === 'other' ? customRegion.trim() : region,
        industry: industry,
        logo_url: listingLogoUrl || undefined,
      });

      setSubmissionSuccess(true);

      toast({
        title: "Published",
        description: "Opportunity posted and is live. You can manage it from the dashboard.",
      });

      // Reset form
      setPositionTitle('');
      setDescription('');
      setRegion('');
      setCustomRegion('');
      setIndustry('');
      setStipend('');
      setAvailableSlots('');
      setApplicationDeadline('');
      setWhatsappNumber('');
      setApplicationEmail('');
      setApplicationUrl('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to post opportunity";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const notifyMissingWebsite = useCallback(async (payload: { id: string; name: string; contactEmail?: string | null }) => {
    try {
      const response = await fetch(resolveApiUrl('/api/notifications'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'company_missing_website',
          title: 'Company requested website support',
          body: `${payload.name} registered without a website. Reach out to help them publish a landing page.`,
          metadata: {
            company_id: payload.id,
            contact_email: payload.contactEmail ?? null,
          },
          channel: ['in_app', 'email'],
        }),
      });

      if (!response.ok) {
        throw new Error('Notification request failed');
      }
    } catch (error) {
      console.error('Failed to queue website assistance notification', error);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'feature') {
      scrollToForm();
    }
  }, [location.search]);

  useEffect(() => {
    const locationValue = companyForm.location;
    if (!locationValue) {
      setCoordinates(null);
      return;
    }
    const normalized = locationValue.toLowerCase();
    if (!normalized.includes('coordinate')) {
      return;
    }
    const matches = locationValue.match(/-?\d+\.\d+/g);
    if (matches && matches.length >= 2) {
      const [latRaw, lngRaw] = matches;
      const lat = Number.parseFloat(latRaw);
      const lng = Number.parseFloat(lngRaw);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        setCoordinates({ lat, lng });
      }
    }
  }, [companyForm.location]);

  // Geolocation logic is now handled by LocationPicker component

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
      <SEO
        title="Hire Interns and Early Talent in Uganda | PlacementBridge for Companies"
        description="Publish internships and early-career roles across Uganda with instant moderation, verified companies, and built-in talent sourcing tools."
        keywords={[
          'post internships Uganda',
          'hire graduates Kampala',
          'Uganda early talent marketplace',
          'student placements employers',
        ]}
        canonical="/for-companies"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'PlacementBridge Employer Portal',
          url: `${baseUrl}/for-companies`,
          areaServed: {
            '@type': 'Country',
            name: 'Uganda',
          },
          provider: {
            '@type': 'Organization',
            name: 'PlacementBridge',
            url: baseUrl,
          },
          serviceType: 'Internship and early-career recruitment',
        }}
      />
      {/* Header and Footer are now global in App.tsx */}
      <main className="py-16">
        <div className="container mx-auto px-4 space-y-16">
          <section className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold">Post an Opportunity</h1>
            <p className="text-lg text-muted-foreground">
              Share your internships, fellowships, apprenticeships, and roles with thousands of motivated learners and professionals across Uganda. Provide the details below and your opportunity will go live instantly while our team monitors for anything suspicious.
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
                            : 'Register your company to unlock opportunity publishing.'}
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
                        <Label htmlFor="company-location">Company location</Label>
                        <div className="flex flex-col gap-2">
                          <LocationPicker
                            initialLat={coordinates?.lat}
                            initialLng={coordinates?.lng}
                            onLocationSelect={(lat, lng) => {
                              const formatted = `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                              setCompanyForm(prev => ({ ...prev, location: formatted }));
                              setCoordinates({ lat, lng });
                              setGeolocationCapturedAt(new Date().toLocaleTimeString());
                            }}
                            readOnly={registeringCompany}
                          />
                        </div>
                        <div className="hidden">
                          {/* Hidden input to keep form logic happy if needed, though we update state directly */}
                          <Input
                            id="company-location"
                            value={companyForm.location}
                            readOnly
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Use the map to pin your exact entrance. Drag the marker if needed.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company-website">Company website</Label>
                        <Input
                          id="company-website"
                          value={companyForm.website_url}
                          onChange={(event) => setCompanyForm((prev) => ({ ...prev, website_url: event.target.value }))}
                          placeholder="https://yourcompany.com (leave blank if you need help)"
                          disabled={registeringCompany}
                        />
                        <p className="text-xs text-muted-foreground">
                          No website yet? Leave this empty and we will reach out to set up a simple landing page for verification.
                        </p>
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
              <Card>
                <CardHeader>
                  <CardTitle>Speed up verification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Double-check these items so your opportunity goes live without delay:</p>
                  <ul className="list-disc space-y-1 pl-4">
                    <li>Use an official work email so we can confirm your organisation quickly.</li>
                    <li>Capture accurate coordinates using the device location button or paste them manually.</li>
                    <li>Share a short description for why your organisation is engaging students or graduates now.</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Need a website?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    If you register without a website, we automatically notify the PlacementBridge admin team. Expect an
                    email with a lightweight landing page brief so we can publish a trusted company profile for you.
                  </p>
                  <p>
                    You can also email <a className="underline" href="mailto:admin@placementbridge.org?subject=Website%20support%20request">admin@placementbridge.org</a> with your logo and contact details to fast-track the process.
                  </p>
                </CardContent>
              </Card>
            </section>
          ) : null}

          <section className="max-w-3xl mx-auto w-full">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Featured opportunities</CardTitle>
              </CardHeader>
              <CardContent className="pt-2 space-y-4">
                {loadingBoosts ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking your featured opportunities…</span>
                  </div>
                ) : activeBoosts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Featured opportunities go live automatically once your payment is confirmed. Active features appear here with their scheduled end date.
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
                                Featured opportunity
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

          <section className="max-w-3xl mx-auto w-full">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Frequently asked questions</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="timeline">
                    <AccordionTrigger>How long does it take for opportunities to go live?</AccordionTrigger>
                    <AccordionContent>
                      Most listings are reviewed within one to two business days. Verified partners are typically approved instantly, while new organizations may require additional checks before publishing.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="boosts">
                    <AccordionTrigger>What do boosts include?</AccordionTrigger>
                    <AccordionContent>
                      Boosted opportunities receive priority placement in search, a featured badge, and inclusion in highlight emails sent to active candidates. You can manage boosts from your company wallet at any time.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="payments">
                    <AccordionTrigger>Can we pay with mobile money or invoice?</AccordionTrigger>
                    <AccordionContent>
                      Yes. Our billing flow supports mobile money, cards, and invoicing for enterprise partners. Reach out via support if you need a tailored payment arrangement.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>

          <section id="post-opportunity" ref={formRef} className="max-w-3xl mx-auto w-full">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Opportunity details</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {company && !company.approved && (
                  <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Your organization is currently pending approval. Opportunities stay live, but our team may flag them for manual review until verification is complete.
                  </div>
                )}
                {featureMode && (
                  <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary-dark">
                    Feature mode enabled. Submit your opportunity and it will publish immediately with a spotlight badge once payment is confirmed.
                  </div>
                )}
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="opportunity-type">Opportunity type</Label>
                    <Select value={opportunityType} onValueChange={setOpportunityType}>
                      <SelectTrigger id="opportunity-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="job">Job</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                        <SelectItem value="apprenticeship">Apprenticeship</SelectItem>
                        <SelectItem value="fellowship">Fellowship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>


                  <div className="space-y-2">
                    <Label>Logo (Optional - Upload to override default)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            // We upload immediately on selection for simplicity in this flow,
                            // storing the URL in state to be submitted with createListing
                            // Note: We need a state for logoUrl. I'll add it below this edit.
                            setSubmitting(true);
                            const { uploadListingLogo } = await import("@/services/listingsService");
                            const url = await uploadListingLogo(file);
                            setListingLogoUrl(url); // We need to define this state
                            toast({ title: "Logo Uploaded", description: "Logo ready for publication." });
                          } catch (err: any) {
                            toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
                          } finally {
                            setSubmitting(false);
                          }
                        }
                      }}
                    />
                    {/* We need to use listingLogoUrl from state here if I could access it, but I haven't defined it yet.
                            I will assume I can add the state variable definition in a separate Edit.
                        */}
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
                          <SelectItem value="online">Online / Remote</SelectItem>
                          <SelectItem value="other">Other (Specify)</SelectItem>
                        </SelectContent>
                      </Select>
                      {region === 'other' && (
                        <Input
                          className="mt-2"
                          placeholder="Enter region name"
                          value={customRegion}
                          onChange={(e) => setCustomRegion(e.target.value)}
                          required
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deadline">Application deadline</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={applicationDeadline}
                        onChange={(e) => setApplicationDeadline(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/20">
                    <div className="space-y-2">
                      <Label htmlFor="app-method">How should users apply?</Label>
                      <Select value={applicationMethod} onValueChange={setApplicationMethod}>
                        <SelectTrigger id="app-method">
                          <SelectValue placeholder="Select application method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="website">Internal (via PlacementBridge)</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp Connect</SelectItem>
                          <SelectItem value="email">Email Application</SelectItem>
                          <SelectItem value="url">External Website / Form</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {applicationMethod === 'whatsapp' && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                        <Label htmlFor="whatsapp">WhatsApp Number (with country code)</Label>
                        <Input
                          id="whatsapp"
                          placeholder="e.g. +256700000000"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    {applicationMethod === 'email' && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                        <Label htmlFor="email">Application Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="jobs@company.com"
                          value={applicationEmail}
                          onChange={(e) => setApplicationEmail(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    {(applicationMethod === 'url' || applicationMethod === 'website') && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                        <Label htmlFor="url">{applicationMethod === 'url' ? 'External URL' : 'Website URL (Optional)'}</Label>
                        <Input
                          id="url"
                          type="url"
                          placeholder="https://company.com/apply"
                          value={applicationUrl}
                          onChange={(e) => setApplicationUrl(e.target.value)}
                          required={applicationMethod === 'url'}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="space-y-2">
                      <Label htmlFor="stipend">Salary / Stipend Range</Label>
                      <Input
                        id="stipend"
                        placeholder="e.g. 500,000 - 800,000 UGX/month"
                        value={stipend}
                        onChange={(e) => setStipend(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Opportunities publish immediately. If we flag a listing, it will pause until resolved, and any boosts resume once it is cleared.
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                    {submitting ? 'Publishing…' : 'Publish Opportunity'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>
      </main >

      <Dialog open={submissionSuccess} onOpenChange={setSubmissionSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Opportunity Published!
            </DialogTitle>
            <DialogDescription>
              Your listing is now live. Candidates can view and apply immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="rounded-md bg-green-50 p-4 text-sm text-green-900 border border-green-200">
              <p className="font-medium">What happens next?</p>
              <ul className="list-disc pl-4 mt-2 space-y-1">
                <li>Your opportunity appears in search results instantly.</li>
                <li>We notify matched candidates via email.</li>
                <li>You'll receive applications directly to your email.</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="secondary" onClick={() => setSubmissionSuccess(false)}>
              Post Another Opportunity
            </Button>
            <Button type="button" onClick={() => navigate('/find-talent')}>
              View Live Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div >
  );
};

export default ForCompanies;