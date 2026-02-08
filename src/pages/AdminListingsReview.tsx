import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { fetchDraftListings, bulkPublishListingsViaApi, updateListing } from '@/services/listingsService';
import { listCompanies } from '@/services/companiesService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { AdminListing } from '@/types/admin';

export default function AdminListingsReview() {
  const { isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<AdminListing[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [autoFeature, setAutoFeature] = useState(true);
  const [featureTypes, setFeatureTypes] = useState<string>('scholarship,fellowship');
  const [busy, setBusy] = useState(false);
  const [minConfidence, setMinConfidence] = useState(0);
  const [sortOrder, setSortOrder] = useState<'high' | 'low'>('high');
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [assignedCompanies, setAssignedCompanies] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!isAdmin || loading) return;
    (async () => {
      try {
        const drafts = await fetchDraftListings();
        setItems(drafts);
        const cos = await listCompanies();
        setCompanies(cos.map((c) => ({ id: c.id, name: c.name })));
      } catch (e) {
        toast({ title: 'Error', description: 'Failed to load draft listings', variant: 'destructive' });
      }
    })();
  }, [isAdmin, loading, toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items.filter((it) => {
      const matchesText = !q || it.title.toLowerCase().includes(q) ||
        (it.opportunity_type || '').toLowerCase().includes(q) ||
        (it.region || '').toLowerCase().includes(q);
      const conf = computeConfidence(it);
      const passesConf = conf >= (minConfidence || 0);
      return matchesText && passesConf;
    });
    list = list.sort((a, b) => {
      const ca = computeConfidence(a);
      const cb = computeConfidence(b);
      return sortOrder === 'high' ? cb - ca : ca - cb;
    });
    return list;
  }, [items, query, minConfidence, sortOrder]);

  function computeConfidence(it: AdminListing): number {
    let score = 0;
    if (it.application_deadline) score += 0.5;
    if (it.region && it.region.length >= 2) score += 0.3;
    if (it.opportunity_type) score += 0.2;
    return Math.min(1, score);
  }

  const allChecked = useMemo(() => filtered.length > 0 && filtered.every((i) => selected[i.id]), [filtered, selected]);

  const toggleAll = (check: boolean) => {
    const next: Record<string, boolean> = { ...selected };
    filtered.forEach((i) => { next[i.id] = check; });
    setSelected(next);
  };

  const publishSelected = async () => {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (ids.length === 0) {
      toast({ title: 'No selection', description: 'Select at least one draft to publish.' });
      return;
    }
    try {
      setBusy(true);
      const types = featureTypes.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      const companyAssignments = Object.fromEntries(
        ids.map((id) => [id, assignedCompanies[id] ?? null])
      );
      await bulkPublishListingsViaApi(ids, { autoFeatureByType: autoFeature, featureTypes: types, companyAssignments });
      toast({ title: 'Published', description: `Published ${ids.length} draft${ids.length > 1 ? 's' : ''}.` });
      const drafts = await fetchDraftListings();
      setItems(drafts);
      setSelected({});
    } catch (e: any) {
      toast({ title: 'Publish failed', description: e?.message || 'Could not publish selected drafts', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const publishAndFeatureOne = async (id: string) => {
    try {
      setBusy(true);
      await updateListing(id, { status: 'published', isFeatured: true });
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast({ title: 'Published', description: 'Listing published and featured.' });
    } catch (e: any) {
      toast({ title: 'Action failed', description: e?.message || 'Could not publish & feature', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const featureOne = async (id: string, value: boolean) => {
    try {
      await updateListing(id, { isFeatured: value });
      setItems((prev) => prev.map((it) => it.id === id ? { ...it, is_featured: value } as AdminListing : it));
    } catch (e) {
      toast({ title: 'Update failed', description: 'Could not update feature state', variant: 'destructive' });
    }
  };

  if (loading) return null;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Draft Listings Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <Input placeholder="Search title, type, region…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full md:w-80" />
                <div className="flex gap-2 items-center">
                  <label className="text-sm flex items-center gap-2">
                    <input type="checkbox" checked={autoFeature} onChange={(e) => setAutoFeature(e.target.checked)} /> Auto-feature types:
                  </label>
                  <Input className="w-64" value={featureTypes} onChange={(e) => setFeatureTypes(e.target.value)} />
                  <Button onClick={publishSelected} disabled={busy}>Publish Selected</Button>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Min confidence:</span>
                  <div className="w-64">
                    <Slider value={[Math.round(minConfidence * 100)]} onValueChange={(v) => setMinConfidence((v[0] || 0) / 100)} step={5} min={0} max={100} />
                  </div>
                  <span className="text-xs text-muted-foreground">{Math.round(minConfidence * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort by confidence:</span>
                  <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'high' | 'low')}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="High → Low" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High → Low</SelectItem>
                      <SelectItem value="low">Low → High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allChecked} onCheckedChange={(v) => toggleAll(Boolean(v))} />
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <Checkbox checked={!!selected[it.id]} onCheckedChange={(v) => setSelected((s) => ({ ...s, [it.id]: Boolean(v) }))} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{it.title}</span>
                        <span className="text-xs text-muted-foreground">{new Date(it.created_at).toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{it.opportunity_type || 'General'}</Badge>
                    </TableCell>
                    <TableCell>{it.region || '—'}</TableCell>
                    <TableCell>{it.application_deadline ? new Date(it.application_deadline).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      {it.application_url ? (
                        <a href={it.application_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Open</a>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Select value={assignedCompanies[it.id] ?? it.company_id ?? ''} onValueChange={async (val) => {
                        const value = val || null;
                        setAssignedCompanies((prev) => ({ ...prev, [it.id]: value }));
                        try {
                          await updateListing(it.id, { companyId: value });
                          toast({ title: 'Company assigned', description: 'Assignment saved.' });
                          setItems((prev) => prev.map((row) => row.id === it.id ? { ...row, company_id: value } as AdminListing : row));
                        } catch (e: any) {
                          toast({ title: 'Assign failed', description: e?.message || 'Could not assign company', variant: 'destructive' });
                        }
                      }}>
                        <SelectTrigger className="w-56">
                          <SelectValue placeholder={it.companies?.name || 'Select company'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {companies.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded">
                          <div className="h-2 bg-primary rounded" style={{ width: `${Math.round(computeConfidence(it) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{Math.round(computeConfidence(it) * 100)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => publishAndFeatureOne(it.id)} disabled={busy}>
                        Publish + Feature
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-2 text-xs text-muted-foreground">
              Confidence is based on presence of deadline, region, and type.
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
