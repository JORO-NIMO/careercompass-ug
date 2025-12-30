import { useCallback, useEffect, useMemo, useState } from 'react';
import CompanyMediaManager from '@/components/CompanyMediaManager';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ShieldCheck, Clock, Globe, MapPin, CircleAlert, Users, ExternalLink, FileText } from 'lucide-react';
import { companyRegistrationSchema } from '@/lib/validations';
import { LocationPicker } from '@/components/ui/LocationPicker';
import {
  listOwnedCompanies,
  registerCompany,
  type Company,
  type VerificationMeta,
} from '@/services/companiesService';
import { fetchRecruiterApplications } from '@/services/applicationsService';

interface CompanyFormState {
  name: string;
  location: string;
  website_url: string;
  contact_email: string;
}

const defaultFormState = (email?: string | null): CompanyFormState => ({
  name: '',
  location: '',
  website_url: '',
  contact_email: email ?? '',
});

const StatusBadge = ({ company }: { company: Company }) => {
  if (company.approved) {
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <ShieldCheck className="h-3 w-3" />
        Approved
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="flex items-center gap-1 text-amber-600 border-amber-300">
      <Clock className="h-3 w-3" />
      Pending review
    </Badge>
  );
};

interface RecruiterApplication {
  id: string;
  created_at: string;
  listings: {
    id: string;
    title: string;
    company_id: string;
  };
  profiles: {
    id: string;
    full_name: string;
    school_name: string;
    course_of_study: string;
    cv_url: string;
    portfolio_url: string;
  };
}

const UserDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [applications, setApplications] = useState<RecruiterApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingApps, setLoadingApps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verification, setVerification] = useState<VerificationMeta | null>(null);
  const [formState, setFormState] = useState<CompanyFormState>(defaultFormState(user?.email));

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }

    setFormState((prev) => defaultFormState(user.email ?? prev.contact_email));
  }, [user, navigate]);

  const loadCompanies = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      setLoading(true);
      const items = await listOwnedCompanies();
      setCompanies(items);
    } catch (error: unknown) {
      console.error('Failed to load companies', error);
      toast({
        title: 'Unable to load companies',
        description: 'Please try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    async function loadApps() {
      const approvedIds = companies.filter(c => c.approved).map(c => c.id);
      if (approvedIds.length === 0) return;

      try {
        setLoadingApps(true);
        const apps = await fetchRecruiterApplications(approvedIds);
        setApplications(apps);
      } catch (err) {
        console.error('Failed to load applications', err);
      } finally {
        setLoadingApps(false);
      }
    }
    if (companies.length > 0) {
      loadApps();
    }
  }, [companies]);

  const hasPendingCompany = useMemo(() => companies.some((company) => !company.approved), [companies]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = companyRegistrationSchema.safeParse({
      name: formState.name.trim(),
      location: formState.location.trim(),
      website_url: formState.website_url.trim(),
      contact_email: formState.contact_email.trim() || undefined,
    });

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Please review the highlighted fields.';
      toast({
        title: 'Invalid company details',
        description: firstError,
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const { company, verification: meta } = await registerCompany(parsed.data);
      setVerification(meta);
      await loadCompanies();
      setFormState(defaultFormState(company.contact_email ?? user?.email));
      if (company.approved) {
        toast({ title: 'Company approved', description: `${company.name} is now verified.` });
      } else {
        toast({
          title: 'Verification pending',
          description: 'We will review your company shortly. You will be notified once approved.',
        });
      }
    } catch (error: unknown) {
      console.error('Company registration failed', error);
      const message = error instanceof Error ? error.message : 'Please try again.';
      toast({
        title: 'Unable to register company',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-16">
        <div className="container mx-auto max-w-5xl px-4 space-y-16">
          <section className="space-y-2 text-center">
            <h1 className="text-4xl font-bold">Your Company Dashboard</h1>
            <p className="text-muted-foreground">
              Register your organisation, monitor verification progress, and manage your approved entities.
            </p>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Register a company</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Company name</Label>
                      <Input
                        id="company-name"
                        value={formState.name}
                        onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="e.g. Kampala Tech Hub"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-email">Contact email</Label>
                      <Input
                        id="company-email"
                        type="email"
                        value={formState.contact_email}
                        onChange={(event) => setFormState((prev) => ({ ...prev, contact_email: event.target.value }))}
                        placeholder="team@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-location">Google Maps location</Label>
                    <div className="flex flex-col gap-2">
                      <LocationPicker
                        onLocationSelect={(lat, lng) => {
                          const formatted = `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                          setFormState(prev => ({ ...prev, location: formatted }));
                        }}
                      />
                    </div>
                    <div className="hidden">
                      <Input
                        id="company-location"
                        value={formState.location}
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-website">Company website</Label>
                    <Input
                      id="company-website"
                      value={formState.website_url}
                      onChange={(event) => setFormState((prev) => ({ ...prev, website_url: event.target.value }))}
                      placeholder="https://yourcompany.com"
                      required
                    />
                  </div>
                  {hasPendingCompany && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
                      <CircleAlert className="h-4 w-4" />
                      <span>Your registrations stay pending until both location and website are verified.</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Duplicate submissions are merged with your existing records automatically.
                    </p>
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        'Submit for verification'
                      )}
                    </Button>
                  </div>
                </form>

                {verification && (
                  <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                    <div>
                      Google Maps: {verification.maps.verified
                        ? 'Verified'
                        : verification.maps.rawStatus ?? 'Not verified'}
                    </div>
                    <div>
                      Website: {verification.web.verified
                        ? 'Verified'
                        : verification.web.rawError
                          ? verification.web.rawError
                          : verification.web.status
                            ? `Status ${verification.web.status}`
                            : 'Not verified'}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Your companies</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex h-32 items-center justify-center text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading companies…
                  </div>
                ) : companies.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No companies registered yet.</p>
                ) : (
                  <div className="space-y-4">
                    {companies.map((company) => {
                      const locationLabel = company.formatted_address ?? company.location_raw ?? 'Location not provided';
                      return (
                        <div key={company.id} className="rounded-lg border p-4 space-y-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">{company.name}</h3>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {locationLabel}
                                </span>
                                {company.website_url && (
                                  <span className="flex items-center gap-1">
                                    <Globe className="h-4 w-4" />
                                    <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="underline">
                                      {company.website_url}
                                    </a>
                                  </span>
                                )}
                              </div>
                            </div>
                            <StatusBadge company={company} />
                          </div>
                          <Separator />
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2 text-xs">
                              <Badge variant={company.maps_verified ? 'default' : 'outline'}>
                                Maps {company.maps_verified ? 'verified' : 'pending'}
                              </Badge>
                              <Badge variant={company.web_verified ? 'default' : 'outline'}>
                                Website {company.web_verified ? 'verified' : 'pending'}
                              </Badge>
                              <Badge variant="secondary">Owner: You ({company.contact_email || user?.email || 'no email'})</Badge>
                            </div>
                            {company.verification_notes && (
                              <p className="text-xs text-muted-foreground">Notes: {company.verification_notes}</p>
                            )}
                            <CompanyMediaManager companyId={company.id} disabled={!company.approved} />
                            {!company.approved && (
                              <p className="text-xs text-muted-foreground">
                                Media uploads unlock once your company is approved. Existing files stay visible.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
          <section>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Applications Received
                </CardTitle>
                <Badge variant="secondary">{applications.length}</Badge>
              </CardHeader>
              <CardContent>
                {loadingApps ? (
                  <div className="flex h-32 items-center justify-center text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading applications…
                  </div>
                ) : applications.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    Applicants for your approved listings will appear here.
                    {companies.every(c => !c.approved) && " (Unlock this by getting your company verified)"}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left font-medium text-muted-foreground">
                          <th className="pb-3 pr-4 text-xs uppercase tracking-wider">Candidate</th>
                          <th className="pb-3 pr-4 text-xs uppercase tracking-wider">Opportunity</th>
                          <th className="pb-3 pr-4 text-xs uppercase tracking-wider">Institution</th>
                          <th className="pb-3 text-right text-xs uppercase tracking-wider">Contact & CV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {applications.map((app) => (
                          <tr key={app.id} className="group hover:bg-muted/50 transition-colors">
                            <td className="py-4 pr-4">
                              <div className="font-medium text-foreground">{app.profiles?.full_name}</div>
                              <div className="text-[10px] text-muted-foreground">Applied {new Date(app.created_at).toLocaleDateString()}</div>
                            </td>
                            <td className="py-4 pr-4">
                              <Badge variant="outline" className="font-normal bg-background">{app.listings?.title}</Badge>
                            </td>
                            <td className="py-4 pr-4 text-muted-foreground">
                              <div className="max-w-[150px] truncate" title={app.profiles?.school_name || "N/A"}>
                                {app.profiles?.school_name || "N/A"}
                              </div>
                              {app.profiles?.course_of_study && (
                                <div className="text-[10px] font-light truncate max-w-[150px]" title={app.profiles.course_of_study}>
                                  {app.profiles.course_of_study}
                                </div>
                              )}
                            </td>
                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {app.profiles?.portfolio_url && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Portfolio">
                                    <a href={app.profiles.portfolio_url} target="_blank" rel="noreferrer">
                                      <Globe className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                                {app.profiles?.cv_url && (
                                  <Button variant="outline" size="sm" className="h-8 gap-1" asChild>
                                    <a href={app.profiles.cv_url} target="_blank" rel="noreferrer">
                                      <FileText className="h-3.5 w-3.5" />
                                      View CV
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserDashboard;
