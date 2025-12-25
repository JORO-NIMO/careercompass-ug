import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Users, Briefcase } from 'lucide-react';
import { AdminAdsManager } from '@/components/AdminAdsManager';
import { AdminBoostsManager } from '@/components/AdminBoostsManager';
import { AdminBulletManager } from '@/components/AdminBulletManager';
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
}

const AdminDashboard = () => {
  const { isAdmin, loading } = useAuth();
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

  useEffect(() => {
    if (isAdmin) {
      loadPlacements();
      loadStats();
    }
  }, [isAdmin]);

  const loadPlacements = async () => {
    try {
      const { data, error } = await supabase
        .from('placements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlacements((data as Placement[]) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load placements",
        variant: "destructive",
      });
    } finally {
      setLoadingPlacements(false);
    }
  };

  const loadStats = async () => {
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
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

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
      loadPlacements();
      loadStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete placement",
        variant: "destructive",
      });
    }
  };

  const approvePlacement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('placements')
        .update({ approved: true } as Record<string, boolean>)
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Approved', description: 'Placement approved and is now visible publicly.' });
      loadPlacements();
      loadStats();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to approve placement', variant: 'destructive' });
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
                <CardTitle className="text-sm font-medium">Total Placements</CardTitle>
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
            <AdminBulletManager />
          </div>

          {/* Placements List */}
          <Card>
            <CardHeader>
              <CardTitle>All Placements</CardTitle>
            </CardHeader>
            <CardContent>
              {placements.length === 0 ? (
                <p className="text-muted-foreground">No placements yet.</p>
              ) : (
                <div className="space-y-4">
                  {placements.map((placement) => (
                    <div
                      key={placement.id}
                      className="border rounded-lg p-4 flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{placement.position_title}</h3>
                        <p className="text-sm text-muted-foreground">{placement.company_name}</p>
                        <p className="text-sm mt-2">{placement.description}</p>
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                          <span>📍 {placement.region}</span>
                          <span>🏢 {placement.industry}</span>
                          <span>💰 {placement.stipend}</span>
                          <span>👥 {placement.available_slots} slots</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {!placement.approved && (
                          <Button variant="default" size="sm" onClick={() => approvePlacement(placement.id)}>
                            Approve
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deletePlacement(placement.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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