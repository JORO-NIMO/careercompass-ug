import { useEffect, useState } from 'react';
import { listCompanies, approveCompany, type Company } from '@/services/companiesService';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCcw, ShieldCheck, CircleAlert } from 'lucide-react';

function formatStatus(company: Company) {
  if (company.approved) {
    return { label: 'Approved', variant: 'default' as const, icon: ShieldCheck };
  }
  return { label: 'Pending approval', variant: 'outline' as const, icon: CircleAlert };
}

function sortCompanies(items: Company[]) {
  return [...items].sort((a, b) => {
    if (a.approved === b.approved) {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
    return a.approved ? -1 : 1;
  });
}

export function AdminCompaniesManager() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const records = await listCompanies();
      setCompanies(sortCompanies(records));
    } catch (error: unknown) {
      console.error('Failed to load companies', error);
      toast({ title: 'Error', description: 'Unable to load companies', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (company: Company, desired: boolean) => {
    try {
      setUpdatingId(company.id);
      const updated = await approveCompany(company.id, { approved: desired });
      setCompanies((prev) => sortCompanies(prev.map((item) => (item.id === updated.id ? updated : item))));
      toast({
        title: desired ? 'Company approved' : 'Approval revoked',
        description: desired
          ? `${company.name} is now published as a trusted employer.`
          : `${company.name} will require fresh verification before posting.`,
      });
    } catch (error: unknown) {
      console.error('Failed to update company approval', error);
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Unable to update approval status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Company approvals</CardTitle>
        <Button variant="ghost" size="sm" onClick={loadCompanies} disabled={loading}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading companies…
          </div>
        ) : companies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No companies have registered yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => {
                const status = formatStatus(company);
                const StatusIcon = status.icon;
                return (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{company.name}</p>
                        {company.formatted_address && (
                          <p className="text-xs text-muted-foreground">{company.formatted_address}</p>
                        )}
                        {!company.formatted_address && company.location_raw && (
                          <p className="text-xs text-muted-foreground">{company.location_raw}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {company.website_url && (
                          <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="underline">
                            {company.website_url}
                          </a>
                        )}
                        {company.contact_email && <p className="text-muted-foreground">{company.contact_email}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant={company.maps_verified ? 'default' : 'outline'}>
                          Maps {company.maps_verified ? 'verified' : 'pending'}
                        </Badge>
                        <Badge variant={company.web_verified ? 'default' : 'outline'}>
                          Web {company.web_verified ? 'verified' : 'pending'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {company.approved ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApproval(company, false)}
                          disabled={updatingId === company.id}
                        >
                          {updatingId === company.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Revoke'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleApproval(company, true)}
                          disabled={updatingId === company.id}
                        >
                          {updatingId === company.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Approve
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
