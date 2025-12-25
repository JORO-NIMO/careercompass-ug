import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCcw, Rocket } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  fetchBulletSummary,
  spendBullets,
  type BulletBalance,
  type BulletTransaction,
} from '@/services/bulletService';

interface BulletWalletCardProps {
  ownerId: string;
  title: string;
  description: string;
  enableBoostActions?: boolean;
}

const DEFAULT_GENERAL_REASON = 'Manual bullet spend';

export function BulletWalletCard({ ownerId, title, description, enableBoostActions = false }: BulletWalletCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{ balance: BulletBalance; transactions: BulletTransaction[] } | null>(null);
  const [generalAmount, setGeneralAmount] = useState('1');
  const [generalReason, setGeneralReason] = useState(DEFAULT_GENERAL_REASON);
  const [boostListingId, setBoostListingId] = useState('');
  const [boostDuration, setBoostDuration] = useState('7');
  const [refreshing, setRefreshing] = useState(false);
  const [spending, setSpending] = useState(false);
  const summaryRequestOwner = useRef<string | null>(null);

  useEffect(() => {
    setSummary(null);
    setLoading(true);
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  const loadSummary = async () => {
    const requestOwner = ownerId;
    if (refreshing && summaryRequestOwner.current === requestOwner) {
      return;
    }
    summaryRequestOwner.current = requestOwner;
    try {
      setRefreshing(true);
      const data = await fetchBulletSummary(requestOwner);
      if (summaryRequestOwner.current !== requestOwner) {
        return;
      }
      setSummary(data);
    } catch (error) {
      if (summaryRequestOwner.current === requestOwner) {
        console.error('Failed to load bullet summary', error);
        toast({ title: 'Error', description: 'Unable to load bullet balance', variant: 'destructive' });
      }
    } finally {
      if (summaryRequestOwner.current === requestOwner) {
        setLoading(false);
        setRefreshing(false);
        summaryRequestOwner.current = null;
      }
    }
  };

  const handleGeneralSpend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (spending) {
      return;
    }
    const amount = Number.parseInt(generalAmount, 10);
    const reason = generalReason.trim();

    if (Number.isNaN(amount) || amount <= 0 || !reason) {
      toast({ title: 'Invalid input', description: 'Provide a positive amount and reason.', variant: 'destructive' });
      return;
    }

    try {
      setSpending(true);
      await spendBullets({ ownerId, amount, reason });
      toast({ title: 'Bullets spent', description: `Spent ${amount} bullet${amount === 1 ? '' : 's'}.` });
      setGeneralAmount('1');
      setGeneralReason(DEFAULT_GENERAL_REASON);
      await loadSummary();
    } catch (error: any) {
      console.error('Bullet spend failed', error);
      toast({ title: 'Spend failed', description: error?.message ?? 'Unable to spend bullets', variant: 'destructive' });
    } finally {
      setSpending(false);
    }
  };

  const handleBoostSpend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (spending) {
      return;
    }
    const listingId = boostListingId.trim();
    const duration = Number.parseInt(boostDuration, 10);

    if (!listingId || Number.isNaN(duration) || duration <= 0) {
      toast({ title: 'Invalid boost request', description: 'Provide a listing ID and positive duration.', variant: 'destructive' });
      return;
    }

    try {
      setSpending(true);
      await spendBullets({
        ownerId,
        amount: duration,
        reason: `Boost listing ${listingId} for ${duration} day${duration === 1 ? '' : 's'}`,
        boost: { listingId, durationDays: duration },
      });
      toast({ title: 'Boost activated', description: `Listing boosted for ${duration} day${duration === 1 ? '' : 's'}.` });
      setBoostListingId('');
      setBoostDuration('7');
      await loadSummary();
    } catch (error: any) {
      console.error('Boost purchase failed', error);
      toast({ title: 'Boost failed', description: error?.message ?? 'Unable to boost listing', variant: 'destructive' });
    } finally {
      setSpending(false);
    }
  };

  const balance = summary?.balance.balance ?? 0;
  const transactions = summary?.transactions ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSummary} disabled={refreshing}>
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading balance…
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-4">
              <div className="rounded-md border border-border p-4">
                <p className="text-sm text-muted-foreground">Available bullets</p>
                <p className="text-3xl font-semibold">{balance}</p>
                <p className="text-xs text-muted-foreground">
                  {summary?.balance.updated_at
                    ? `Updated ${new Date(summary.balance.updated_at).toLocaleString()}`
                    : 'No activity yet'}
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleGeneralSpend}>
                <div className="space-y-2">
                  <Label htmlFor={`general-amount-${ownerId}`}>Spend amount</Label>
                  <Input
                    id={`general-amount-${ownerId}`}
                    type="number"
                    min={1}
                    value={generalAmount}
                    onChange={(event) => setGeneralAmount(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`general-reason-${ownerId}`}>Reason</Label>
                  <Textarea
                    id={`general-reason-${ownerId}`}
                    rows={3}
                    value={generalReason}
                    onChange={(event) => setGeneralReason(event.target.value)}
                  />
                </div>
                <Button type="submit" disabled={spending} className="w-full">
                  {spending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Spend bullets
                </Button>
              </form>

              {enableBoostActions ? (
                <form className="space-y-4 border-t border-border pt-4" onSubmit={handleBoostSpend}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Boost a listing</h3>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Rocket className="h-3 w-3" />
                      1 bullet / day
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`boost-listing-${ownerId}`}>Listing ID</Label>
                    <Input
                      id={`boost-listing-${ownerId}`}
                      value={boostListingId}
                      onChange={(event) => setBoostListingId(event.target.value)}
                      placeholder="Placement UUID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`boost-duration-${ownerId}`}>Duration (days)</Label>
                    <Input
                      id={`boost-duration-${ownerId}`}
                      type="number"
                      min={1}
                      max={30}
                      value={boostDuration}
                      onChange={(event) => setBoostDuration(event.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={spending} className="w-full">
                    {spending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                    Boost listing
                  </Button>
                </form>
              ) : null}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Recent transactions</h3>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Change</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 10).map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <Badge variant={tx.delta > 0 ? 'default' : 'secondary'}>
                            {tx.delta > 0 ? `+${tx.delta}` : tx.delta}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[260px] text-sm">
                          <p className="line-clamp-2 break-words">{tx.reason}</p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
