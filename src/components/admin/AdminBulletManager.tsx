import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, RefreshCcw, Send } from 'lucide-react';
import { adminAdjustBullets, fetchAdminBulletBalances } from '@/services/bulletService';
import type { BulletBalance, BulletTransaction } from '@/types/admin';

interface FormState {
  ownerId: string;
  delta: string;
  reason: string;
}

const defaultForm: FormState = { ownerId: '', delta: '', reason: '' };

export function AdminBulletManager() {
  const { toast } = useToast();
  const [balances, setBalances] = useState<BulletBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const [selectedBalance, setSelectedBalance] = useState<BulletBalance | null>(null);
  const [transactions, setTransactions] = useState<BulletTransaction[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadingDetailsFor, setLoadingDetailsFor] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const detailRequestRef = useRef(0);

  const sortedBalances = useMemo(() => {
    return [...balances].sort((a, b) => b.balance - a.balance);
  }, [balances]);

  const loadBalances = useCallback(async () => {
    try {
      setLoadingBalances(true);
      const data = await fetchAdminBulletBalances();
      setBalances(data.items ?? []);
    } catch (error: unknown) {
      console.error('Failed to load bullet balances', error);
      const description = error instanceof Error ? error.message : 'Unable to load bullet balances';
      toast({ title: 'Error', description, variant: 'destructive' });
    } finally {
      setLoadingBalances(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadBalances();
  }, [loadBalances]);

  const loadDetails = async (ownerId: string) => {
    if (detailLoading && loadingDetailsFor === ownerId) {
      return;
    }
    const nextRequestId = detailRequestRef.current + 1;
    detailRequestRef.current = nextRequestId;
    try {
      setDetailLoading(true);
      setLoadingDetailsFor(ownerId);
      setSelectedOwner(ownerId);
      const data = await fetchAdminBulletBalances(ownerId);
      if (detailRequestRef.current !== nextRequestId) {
        return;
      }
      setSelectedBalance(data.balance ?? {
        owner_id: ownerId,
        balance: 0,
        created_at: null,
        updated_at: null,
      });
      setTransactions(data.transactions ?? []);
      setFormState((prev) => ({ ...prev, ownerId }));
    } catch (error: unknown) {
      console.error('Failed to load bullet details', error);
      const description = error instanceof Error ? error.message : 'Unable to load owner details';
      toast({ title: 'Error', description, variant: 'destructive' });
    } finally {
      if (detailRequestRef.current === nextRequestId) {
        setDetailLoading(false);
        setLoadingDetailsFor(null);
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ownerId = formState.ownerId.trim();
    const deltaNumber = Number.parseInt(formState.delta, 10);
    const reason = formState.reason.trim();

    if (!ownerId || Number.isNaN(deltaNumber) || deltaNumber === 0 || !reason) {
      toast({ title: 'Invalid input', description: 'Owner ID, non-zero delta, and reason are required.', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      await adminAdjustBullets({ ownerId, delta: deltaNumber, reason });
      toast({ title: 'Bullets updated', description: 'Balance adjusted successfully.' });
      setFormState(defaultForm);
      await loadBalances();
      if (selectedOwner) {
        await loadDetails(selectedOwner);
      }
    } catch (error: unknown) {
      console.error('Failed to adjust bullets', error);
      const description = error instanceof Error ? error.message : 'Unable to adjust bullets';
      toast({ title: 'Update failed', description, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Bullet balances</CardTitle>
          <p className="text-sm text-muted-foreground">Allocate or deduct credits for companies and users.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadBalances} disabled={loadingBalances}>
          {loadingBalances ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Balances</h3>
              <span className="text-xs text-muted-foreground">Showing top {sortedBalances.length}</span>
            </div>
            {loadingBalances ? (
              <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading balances…
              </div>
            ) : sortedBalances.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bullet balances recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBalances.map((balance) => (
                    <TableRow key={balance.owner_id} data-owner={balance.owner_id}>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="font-mono text-xs break-all">{balance.owner_id}</span>
                          <p className="text-xs text-muted-foreground">
                            Updated {balance.updated_at ? new Date(balance.updated_at).toLocaleString() : '—'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-base">{balance.balance}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => loadDetails(balance.owner_id)}
                          disabled={detailLoading && loadingDetailsFor === balance.owner_id}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="bullet-owner-id">Owner ID</Label>
              <Input
                id="bullet-owner-id"
                value={formState.ownerId}
                onChange={(event) => setFormState((prev) => ({ ...prev, ownerId: event.target.value }))}
                placeholder="User or company UUID"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bullet-delta">Delta</Label>
              <Input
                id="bullet-delta"
                type="number"
                value={formState.delta}
                onChange={(event) => setFormState((prev) => ({ ...prev, delta: event.target.value }))}
                placeholder="Positive to add, negative to deduct"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bullet-reason">Reason</Label>
              <Textarea
                id="bullet-reason"
                rows={3}
                value={formState.reason}
                onChange={(event) => setFormState((prev) => ({ ...prev, reason: event.target.value }))}
                placeholder="Describe why this adjustment is needed"
                required
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Apply adjustment
            </Button>
          </form>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">Recent transactions</h3>
            {selectedOwner ? (
              <span className="text-xs text-muted-foreground">Owner {selectedOwner}</span>
            ) : (
              <span className="text-xs text-muted-foreground">Select an owner to view history</span>
            )}
          </div>
          {detailLoading ? (
            <div className="flex h-24 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading transactions…
            </div>
          ) : !selectedOwner ? (
            <p className="text-sm text-muted-foreground">No owner selected.</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions recorded for this owner.</p>
          ) : (
            <div className="space-y-3">
              {selectedBalance ? (
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Current balance</p>
                    <p className="text-xs text-muted-foreground">Last updated {selectedBalance.updated_at ? new Date(selectedBalance.updated_at).toLocaleString() : '—'}</p>
                  </div>
                  <Badge variant="outline" className="text-base">
                    {selectedBalance.balance}
                  </Badge>
                </div>
              ) : null}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Change</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <Badge variant={tx.delta > 0 ? 'default' : 'secondary'}>{tx.delta > 0 ? `+${tx.delta}` : tx.delta}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[240px] text-sm">
                        <p className="line-clamp-2 break-words">{tx.reason}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs break-all">{tx.created_by}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
