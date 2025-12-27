import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Users, Briefcase, Flag, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AdminAdsManager } from '@/components/AdminAdsManager';
import { AdminBoostsManager } from '@/components/AdminBoostsManager';
import { AdminCompaniesManager } from '@/components/AdminCompaniesManager';
import { AdminListingsManager } from '@/components/AdminListingsManager';

interface Placement {
  id: string;
  position_title: string;
  company_name: string;
  description: string;
  region: string;
  industry: string;
  stipend: string;
  available_slots: number;
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
  const [stats, setStats] = useState({ totalPlacements: 0, totalUsers: 0 });

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
      const { data, error } = await supabase
        .from('placements')
        .select('*')
        .order('flagged', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlacements((data as Placement[]) || []);
    } catch (error: unknown) {
      toast({ title: 'Error', description: 'Failed to load placements', variant: 'destructive' });
    } finally {
      setLoadingPlacements(false);
    }
  }, [toast]);

  const loadStats = useCallback(async () => {
    try {
      const { count: placementCount } = await supabase
        .from('placements')
        .select('*', { count: 'exact', head: true });

      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalPlacements: placementCount || 0,
        totalUsers: userCount || 0,
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
          <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
          </div>

          <div className="mb-8">
            <AdminListingsManager />
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
                          <span>📍 {placement.region}</span>
                          <span>🏢 {placement.industry}</span>
                          <span>💰 {placement.stipend}</span>
                          <span>👥 {placement.available_slots} slots</span>
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