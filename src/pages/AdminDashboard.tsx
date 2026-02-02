import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Users, Briefcase, Flag, AlertTriangle, CheckCircle2, Search as SearchIcon, Filter, ChevronLeft, ChevronRight, ArrowUpDown, Activity } from 'lucide-react';
import { AdminAdsManager } from '@/components/AdminAdsManager';
import { AdminBoostsManager } from '@/components/AdminBoostsManager';
import { AdminCompaniesManager } from '@/components/AdminCompaniesManager';
import { AdminListingsManager } from '@/components/AdminListingsManager';
import { AdminPlacementUpload } from '@/components/AdminPlacementUpload';
import { AdminPostsManager } from '@/components/AdminPostsManager';
import { GenericDataManager } from '@/components/AdminGenericData/GenericDataManager';
import { AdminLearningResourcesManager } from '@/components/AdminLearningResourcesManager';
import { trackAction } from '@/lib/analytics';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface Placement {
  id: string;
  position_title: string;
  company_name: string;
  description: string;
  region: string;
  industry: string;
  stipend: string;
  available_slots: number;
  deadline?: string;
  application_link?: string;
  created_at: string;
  approved: boolean;
  flagged: boolean;
  flag_reason: string | null;
  flagged_at: string | null;
  flagged_by: string | null;
}

const AdminDashboard = () => {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loadingPlacements, setLoadingPlacements] = useState(true);
  const [stats, setStats] = useState({ totalPlacements: 0, totalUsers: 0, draftListings: 0 });
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [flaggedFilter, setFlaggedFilter] = useState<'all' | 'flagged' | 'unflagged'>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [regions, setRegions] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [filteredCount, setFilteredCount] = useState(0);
  const [sortField, setSortField] = useState<'created_at' | 'deadline'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [nullsFirst, setNullsFirst] = useState<boolean>(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [isAdmin, loading, navigate, toast]);

  const loadPlacements = useCallback(async () => {
    setLoadingPlacements(true);
    try {
      let query = supabase
        .from('placements')
        .select('*', { count: 'exact' })
        .order(sortField, { ascending: sortDir === 'asc', nullsFirst });

      if (flaggedFilter === 'flagged') {
        query = query.eq('flagged', true);
      } else if (flaggedFilter === 'unflagged') {
        query = query.eq('flagged', false);
      }

      if (regionFilter !== 'all') {
        query = query.eq('region', regionFilter);
      }
      if (industryFilter !== 'all') {
        query = query.eq('industry', industryFilter);
      }

      const term = qDebounced.trim();
      if (term) {
        const like = `%${term.replace(/%/g, '')}%`;
        query = query.or(`position_title.ilike.${like},company_name.ilike.${like}`);
      }

      const start = page * pageSize;
      const end = start + pageSize - 1;
      const { data, error, count } = await query.range(start, end);

      if (error) throw error;
      setPlacements((data as Placement[]) || []);
      setFilteredCount(count ?? 0);
    } catch (error: unknown) {
      toast({ title: 'Error', description: 'Failed to load placements', variant: 'destructive' });
    } finally {
      setLoadingPlacements(false);
    }
  }, [toast, flaggedFilter, regionFilter, industryFilter, qDebounced, page, sortField, sortDir, nullsFirst]);

  const loadStats = useCallback(async () => {
    try {
      const { count: placementCount } = await supabase
        .from('placements')
        .select('*', { count: 'exact', head: true });

      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: draftsCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft');

      setStats({
        totalPlacements: placementCount || 0,
        totalUsers: userCount || 0,
        draftListings: draftsCount || 0,
      });
    } catch (error: unknown) {
      console.error('Error loading stats:', error);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadPlacements();
      void loadStats();
    }
  }, [isAdmin, loadPlacements, loadStats]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setQDebounced(q);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // Load filter options once
  const loadFilterOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('admin_distinct_placement_filters');
      if (error) throw error;
      const payload = (data ?? {}) as { regions?: string[]; industries?: string[] };
      const regionsList = Array.isArray(payload.regions) ? payload.regions! : [];
      const industriesList = Array.isArray(payload.industries) ? payload.industries! : [];
      setRegions(['all', ...regionsList.sort()]);
      setIndustries(['all', ...industriesList.sort()]);
    } catch (e) {
      console.warn('Failed to load filter options', e);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadFilterOptions();
    }
  }, [isAdmin, loadFilterOptions]);

  const deletePlacement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('placements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Placement deleted successfully",
      });
      trackAction('listing.deleted', { listing_id: id });
      await loadPlacements();
      await loadStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete placement",
        variant: "destructive",
      });
    }
  };

  const flagPlacement = async (placement: Placement) => {
    const reasonInput = window.prompt('Add a note about why this opportunity is being flagged:', placement.flag_reason ?? '');
    if (reasonInput === null) {
      return;
    }

    const reason = reasonInput.trim() || 'Flagged for review';

    try {
      const { error } = await supabase
        .from('placements')
        .update({
          flagged: true,
          flag_reason: reason,
          flagged_at: new Date().toISOString(),
          flagged_by: user?.id ?? null,
          approved: false,
        } as Record<string, unknown>)
        .eq('id', placement.id);

      if (error) throw error;

      toast({ title: 'Flagged', description: 'Opportunity flagged for manual review.' });
      trackAction('listing.flagged', { listing_id: placement.id, reason });
      await loadPlacements();
      await loadStats();
    } catch (error: unknown) {
      toast({ title: 'Error', description: 'Failed to flag opportunity', variant: 'destructive' });
    }
  };

  const clearFlag = async (id: string) => {
    try {
      const { error } = await supabase
        .from('placements')
        .update({
          flagged: false,
          flag_reason: null,
          flagged_at: null,
          flagged_by: null,
          approved: true,
        } as Record<string, unknown>)
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Cleared', description: 'Flag removed and opportunity restored.' });
      trackAction('listing.cleared', { listing_id: id });
      await loadPlacements();
      await loadStats();
    } catch (error: unknown) {
      toast({ title: 'Error', description: 'Failed to clear flag', variant: 'destructive' });
    }
  };

  if (loading || loadingPlacements) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <p>Loading...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <div className="flex items-center gap-3">
              {stats.draftListings > 0 && (
                <Link to="/admin/listings-review" className="inline-flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-accent">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-900">{stats.draftListings} Drafts</Badge>
                  Review Listings
                </Link>
              )}
              <Button variant="outline" onClick={() => navigate('/admin/workflows')}>
                <Activity className="h-4 w-4 mr-2" />
                Workflow Analytics
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Opportunities</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPlacements}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Draft Listings</CardTitle>
                <Flag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{stats.draftListings}</div>
                  <Link to="/admin/listings-review" className="text-sm underline text-primary">Review</Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Search */}
          <Card className="mb-6">
            <CardContent className="py-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <SearchIcon className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search title or company…"
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(0); }}
                  className="w-full md:w-80"
                />
              </div>
              <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={flaggedFilter} onValueChange={(v) => { setFlaggedFilter(v as 'all' | 'flagged' | 'unflagged'); setPage(0); }}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Flag status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="unflagged">Unflagged</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={regionFilter} onValueChange={(v) => { setRegionFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.length === 0 ? (
                      <SelectItem value="all">All</SelectItem>
                    ) : (
                      regions.map((r) => (
                        <SelectItem key={r} value={r}>{r === 'all' ? 'All Regions' : r}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Select value={industryFilter} onValueChange={(v) => { setIndustryFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.length === 0 ? (
                      <SelectItem value="all">All</SelectItem>
                    ) : (
                      industries.map((i) => (
                        <SelectItem key={i} value={i}>{i === 'all' ? 'All Industries' : i}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select value={sortField} onValueChange={(v) => { setSortField(v as 'created_at' | 'deadline' | 'position_title' | 'company_name'); setPage(0); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Created At</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="position_title">Title</SelectItem>
                    <SelectItem value="company_name">Company</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortDir} onValueChange={(v) => { setSortDir(v as 'asc' | 'desc'); setPage(0); }}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Desc</SelectItem>
                    <SelectItem value="asc">Asc</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={nullsFirst ? 'first' : 'last'} onValueChange={(v) => { setNullsFirst(v === 'first'); }}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Nulls" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last">Nulls Last</SelectItem>
                    <SelectItem value="first">Nulls First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <span className="text-sm font-medium">Page {page + 1}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * pageSize >= filteredCount}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mb-8">
            <AdminListingsManager />
          </div>

          <div className="mb-8">
            <AdminPostsManager />
          </div>

          <div className="mb-8">
            <AdminLearningResourcesManager />
          </div>

          <div className="mb-8">
            <AdminPlacementUpload onSuccess={() => {
              void loadPlacements();
              void loadStats();
            }} />
          </div>

          <div className="mb-8">
            <GenericDataManager />
          </div>

          <div className="mb-8">
          </div>

          {/* Placements List */}
          <Card>
            <CardHeader>
              <CardTitle>All Opportunity Listings</CardTitle>
            </CardHeader>
            <CardContent>
              {placements.length === 0 ? (
                <p className="text-muted-foreground">No opportunities yet.</p>
              ) : (
                <div className="space-y-4">
                  {placements.map((placement) => (
                    <div
                      key={placement.id}
                      className={`rounded-lg p-4 md:p-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between border ${placement.flagged ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}
                    >
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-lg mr-2">{placement.position_title}</h3>
                          {placement.flagged ? (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <Flag className="h-3 w-3" /> Flagged
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Auto-approved
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{placement.company_name}</p>
                        <p className="text-sm leading-relaxed">{placement.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span><img src="/favicon.ico" alt="region" className="inline h-4 w-4 mr-1 align-text-bottom" />{placement.region}</span>
                          <span><img src="/favicon.ico" alt="industry" className="inline h-4 w-4 mr-1 align-text-bottom" />{placement.industry}</span>
                          <span><img src="/favicon.ico" alt="stipend" className="inline h-4 w-4 mr-1 align-text-bottom" />{placement.stipend}</span>
                          <span><img src="/favicon.ico" alt="slots" className="inline h-4 w-4 mr-1 align-text-bottom" />{placement.available_slots} slots</span>
                          {placement.deadline && (
                            <span className={new Date(placement.deadline) < new Date() ? "text-destructive" : ""}>
                              ⏰ {new Date(placement.deadline).toLocaleDateString()}
                            </span>
                          )}
                          {placement.application_link && (
                            <a href={placement.application_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                              🔗 Apply Link
                            </a>
                          )}
                        </div>
                        {placement.flagged && (
                          <div className="flex items-start gap-2 text-sm text-destructive">
                            <AlertTriangle className="h-4 w-4 mt-1" />
                            <div className="space-y-1">
                              <p className="font-medium">Flagged for manual review</p>
                              {placement.flag_reason && (
                                <p className="text-xs text-muted-foreground">Reason: {placement.flag_reason}</p>
                              )}
                              {placement.flagged_at && (
                                <p className="text-xs text-muted-foreground">
                                  Flagged at {new Date(placement.flagged_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 md:items-end">
                        {placement.flagged ? (
                          <Button variant="secondary" size="sm" onClick={() => clearFlag(placement.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Clear flag
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => flagPlacement(placement)}>
                            <Flag className="h-4 w-4 mr-1" /> Flag suspicious
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deletePlacement(placement.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-8">
            <AdminCompaniesManager />
          </div>

          <div className="mt-8">
            <AdminAdsManager />
          </div>

          <div className="mt-8">
            <AdminBoostsManager />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;