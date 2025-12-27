import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, RefreshCcw, ShieldOff } from 'lucide-react';
import { fetchAdminBoosts, createBoost, updateBoost, revokeBoost } from '@/services/boostsService';
import type { AdminBoost } from '@/types/admin';

interface FormState {
  entity_id: string;
  entity_type: 'listing' | 'company';
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInputValue(value: string) {
  const date = new Date(value);
  const utc = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  return utc.toISOString();
}

const defaultForm = (): FormState => {
  const now = new Date();
  const inSevenDays = addDays(now, 7);
  return {
    entity_id: '',
    entity_type: 'listing',
    starts_at: toLocalInputValue(now.toISOString()),
    ends_at: toLocalInputValue(inSevenDays.toISOString()),
    is_active: true,
  };
};

export function AdminBoostsManager() {
  const { toast } = useToast();
  const [boosts, setBoosts] = useState<AdminBoost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>(defaultForm);
  const [editingBoost, setEditingBoost] = useState<AdminBoost | null>(null);

  const modalTitle = useMemo(() => (editingBoost ? 'Edit boost' : 'Create manual boost'), [editingBoost]);

  const loadBoosts = useCallback(async () => {
    try {
      setLoading(true);
      const items = await fetchAdminBoosts();
      setBoosts(items);
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unable to load boosts';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadBoosts();
  }, [loadBoosts]);

  const resetForm = () => {
    setFormState(defaultForm());
    setEditingBoost(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (boost: AdminBoost) => {
    setEditingBoost(boost);
    setFormState({
      entity_id: boost.entity_id,
      entity_type: boost.entity_type,
      starts_at: toLocalInputValue(boost.starts_at),
      ends_at: toLocalInputValue(boost.ends_at),
      is_active: boost.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.entity_id) {
      toast({ title: 'Missing data', description: 'Entity ID is required', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      if (editingBoost) {
        const updated = await updateBoost(editingBoost.id, {
          starts_at: fromLocalInputValue(formState.starts_at),
          ends_at: fromLocalInputValue(formState.ends_at),
          is_active: formState.is_active,
        });
        setBoosts((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        toast({ title: 'Boost updated', description: 'Changes saved successfully.' });
      } else {
        const created = await createBoost({
          entity_id: formState.entity_id,
          entity_type: formState.entity_type,
          starts_at: fromLocalInputValue(formState.starts_at),
          ends_at: fromLocalInputValue(formState.ends_at),
          is_active: formState.is_active,
        });
        setBoosts((prev) => [created, ...prev]);
        toast({ title: 'Boost created', description: 'Manual boost activated.' });
      }
      setModalOpen(false);
      resetForm();
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unable to save boost';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const extendBoost = async (boost: AdminBoost, days: number) => {
    try {
      const endsAt = new Date(boost.ends_at);
      endsAt.setDate(endsAt.getDate() + days);
      const updated = await updateBoost(boost.id, { ends_at: endsAt.toISOString() });
      setBoosts((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      toast({ title: 'Boost extended', description: `Boost extended by ${days} day${days > 1 ? 's' : ''}.` });
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unable to extend boost';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const deactivateBoost = async (boost: AdminBoost) => {
    try {
      const updated = await revokeBoost(boost.id);
      setBoosts((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      toast({ title: 'Boost deactivated', description: 'Boost marked inactive.' });
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unable to deactivate boost';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const formatStatus = (boost: AdminBoost) => {
    const now = Date.now();
    const activeWindow = boost.is_active && new Date(boost.starts_at).getTime() <= now && new Date(boost.ends_at).getTime() > now;
    return activeWindow ? 'Active' : 'Inactive';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Boost automation</CardTitle>
          <p className="text-sm text-muted-foreground">Review boosts generated from payments and override when needed.</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={(open) => {
          if (!open) {
            setModalOpen(false);
            resetForm();
          } else {
            setModalOpen(true);
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={openCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Manual boost
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{modalTitle}</DialogTitle>
              <DialogDescription>Provide the entity identifier and schedule. Times use your local timezone.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="boost-entity-id">Entity ID</Label>
                <Input
                  id="boost-entity-id"
                  value={formState.entity_id}
                  onChange={(event) => setFormState((prev) => ({ ...prev, entity_id: event.target.value }))}
                  placeholder="Listing or company UUID"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Entity type</Label>
                <Select
                  value={formState.entity_type}
                  onValueChange={(value: 'listing' | 'company') =>
                    setFormState((prev) => ({ ...prev, entity_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="listing">Listing</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="boost-starts-at">Starts at</Label>
                  <Input
                    id="boost-starts-at"
                    type="datetime-local"
                    value={formState.starts_at}
                    onChange={(event) => setFormState((prev) => ({ ...prev, starts_at: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boost-ends-at">Ends at</Label>
                  <Input
                    id="boost-ends-at"
                    type="datetime-local"
                    value={formState.ends_at}
                    onChange={(event) => setFormState((prev) => ({ ...prev, ends_at: event.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="boost-active"
                  type="checkbox"
                  checked={formState.is_active}
                  onChange={(event) => setFormState((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                <Label htmlFor="boost-active">Active</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" disabled={saving} onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading boosts…
          </div>
        ) : boosts.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
            <p className="mb-2">No boosts recorded yet.</p>
            <Button variant="outline" onClick={openCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Create manual boost
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boosts.map((boost) => {
                const status = formatStatus(boost);
                const starts = new Date(boost.starts_at).toLocaleString();
                const ends = new Date(boost.ends_at).toLocaleString();
                return (
                  <TableRow key={boost.id}>
                    <TableCell>
                      <div className="font-medium flex items-center gap-2">
                        <span>{boost.entity_type}</span>
                        <Badge variant="secondary" className="font-mono text-xs">{boost.entity_id}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Starts {starts}</div>
                        <div>Ends {ends}</div>
                        <div className="text-xs">{`Ends ${formatDistanceToNow(new Date(boost.ends_at), { addSuffix: true })}`}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status === 'Active' ? 'default' : 'secondary'}>{status}</Badge>
                    </TableCell>
                    <TableCell>
                      {boost.payment_id ? (
                        <Badge variant="outline">Payment linked</Badge>
                      ) : (
                        <Badge variant="secondary">Manual</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(boost)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => extendBoost(boost, 7)}>
                        <RefreshCcw className="mr-1 h-4 w-4" />
                        +7d
                      </Button>
                      {boost.is_active && (
                        <Button variant="destructive" size="icon" onClick={() => deactivateBoost(boost)}>
                          <ShieldOff className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
