import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchAdminListings,
  createListing,
  updateListing,
  deleteListing,
  toggleListingFeature,
  updateListingOrder,
} from '@/services/listingsService';
import { listCompanies, type Company } from '@/services/companiesService';
import { useToast } from '@/hooks/use-toast';
import type { AdminListing } from '@/types/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Pencil, Plus, RefreshCcw, Save, Trash2 } from 'lucide-react';

interface ListingFormState {
  title: string;
  description: string;
  companyId: string | null;
  isFeatured: boolean;
  displayOrder: string;
  opportunityType: string;
  applicationDeadline: string;
  applicationMethod: string;
  whatsappNumber: string;
  applicationEmail: string;
  applicationUrl: string;
  region: string;
}

const DEFAULT_FORM_STATE: ListingFormState = {
  title: '',
  description: '',
  companyId: null,
  isFeatured: false,
  displayOrder: '',
  opportunityType: 'job',
  applicationDeadline: '',
  applicationMethod: 'website',
  whatsappNumber: '',
  applicationEmail: '',
  applicationUrl: '',
  region: '',
};

export function AdminListingsManager() {
  const { toast } = useToast();
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formState, setFormState] = useState<ListingFormState>(DEFAULT_FORM_STATE);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentListingId, setCurrentListingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminListing | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [orderDrafts, setOrderDrafts] = useState<Record<string, string>>({});

  const isEditing = currentListingId !== null;

  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => a.name.localeCompare(b.name));
  }, [companies]);

  const loadListings = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const items = await fetchAdminListings();
      setListings(items);
      setOrderDrafts(
        items.reduce<Record<string, string>>((acc, item) => {
          acc[item.id] = String(item.display_order ?? '');
          return acc;
        }, {}),
      );
    } catch (error: unknown) {
      console.error('Failed to load listings', error);
      toast({ title: 'Error', description: 'Unable to load listings', variant: 'destructive' });
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [toast]);

  const loadCompanies = useCallback(async () => {
    try {
      setCompaniesLoading(true);
      const records = await listCompanies();
      setCompanies(records);
    } catch (error: unknown) {
      console.error('Failed to load companies', error);
      toast({ title: 'Error', description: 'Unable to load companies', variant: 'destructive' });
    } finally {
      setCompaniesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadListings();
    void loadCompanies();
  }, [loadListings, loadCompanies]);

  const resetForm = () => {
    setFormState(DEFAULT_FORM_STATE);
    setCurrentListingId(null);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleCreateClick = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (listing: AdminListing) => {
    setCurrentListingId(listing.id);
    setFormState({
      title: listing.title,
      description: listing.description,
      companyId: listing.company_id,
      isFeatured: listing.is_featured,
      displayOrder: String(listing.display_order ?? ''),
      opportunityType: listing.opportunity_type ?? 'job',
      applicationDeadline: listing.application_deadline ? new Date(listing.application_deadline).toISOString().slice(0, 16) : '',
      applicationMethod: listing.application_method ?? 'website',
      whatsappNumber: listing.whatsapp_number ?? '',
      applicationEmail: listing.application_email ?? '',
      applicationUrl: listing.application_url ?? '',
      region: listing.region ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = formState.title.trim();
    const description = formState.description.trim();

    if (!title || !description) {
      toast({ title: 'Missing details', description: 'Title and description are required.', variant: 'destructive' });
      return;
    }

    const orderValue = formState.displayOrder.trim();
    let parsedOrder: number | undefined;
    if (orderValue !== '') {
      parsedOrder = Number(orderValue);
      if (!Number.isFinite(parsedOrder)) {
        toast({ title: 'Invalid order', description: 'Display order must be a number.', variant: 'destructive' });
        return;
      }
    }

    try {
      setSubmitting(true);
      if (isEditing && currentListingId) {
        await updateListing(currentListingId, {
          title,
          description,
          companyId: formState.companyId ?? null,
          isFeatured: formState.isFeatured,
          displayOrder: parsedOrder,
          opportunity_type: formState.opportunityType,
          application_deadline: formState.applicationDeadline || undefined,
          application_method: formState.applicationMethod,
          whatsapp_number: formState.whatsappNumber,
          application_email: formState.applicationEmail,
          application_url: formState.applicationUrl,
          region: formState.region,
        });
        toast({ title: 'Listing updated', description: 'Changes saved successfully.' });
      } else {
        await createListing({
          title,
          description,
          companyId: formState.companyId ?? undefined,
          isFeatured: formState.isFeatured,
          displayOrder: parsedOrder,
          opportunity_type: formState.opportunityType,
          application_deadline: formState.applicationDeadline || undefined,
          application_method: formState.applicationMethod,
          whatsapp_number: formState.whatsappNumber,
          application_email: formState.applicationEmail,
          application_url: formState.applicationUrl,
          region: formState.region,
        });
        toast({ title: 'Listing created', description: 'Listing added to the curated feed.' });
      }
      closeDialog();
      await loadListings({ silent: true });
    } catch (error: unknown) {
      console.error('Failed to save listing', error);
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save listing.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeatureToggle = async (listing: AdminListing, value: boolean) => {
    try {
      setTogglingId(listing.id);
      await toggleListingFeature(listing.id, value);
      setListings((prev) => prev.map((item) => (item.id === listing.id ? { ...item, is_featured: value } : item)));
      toast({
        title: value ? 'Listing featured' : 'Listing updated',
        description: value
          ? `${listing.title} will appear in the featured carousel.`
          : `${listing.title} removed from featured opportunities.`,
      });
    } catch (error: unknown) {
      console.error('Failed to toggle feature state', error);
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Unable to update feature status.',
        variant: 'destructive',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleOrderInputChange = (id: string, value: string) => {
    setOrderDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const handleOrderSave = async (listing: AdminListing) => {
    const rawValue = orderDrafts[listing.id]?.trim() ?? '';
    if (rawValue === '') {
      toast({ title: 'Missing order', description: 'Enter a numeric display order before saving.', variant: 'destructive' });
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      toast({ title: 'Invalid order', description: 'Display order must be a valid number.', variant: 'destructive' });
      return;
    }

    try {
      setSavingOrderId(listing.id);
      await updateListingOrder(listing.id, parsed);
      toast({ title: 'Order updated', description: `${listing.title} will render with the new order.` });
      await loadListings({ silent: true });
    } catch (error: unknown) {
      console.error('Failed to update display order', error);
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Unable to update display order.',
        variant: 'destructive',
      });
    } finally {
      setSavingOrderId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    try {
      setDeletingId(target.id);
      await deleteListing(target.id);
      toast({ title: 'Listing deleted', description: `${target.title} has been removed.` });
      setDeleteTarget(null);
      await loadListings({ silent: true });
    } catch (error: unknown) {
      console.error('Failed to delete listing', error);
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete listing.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Homepage listings</CardTitle>
            <p className="text-sm text-muted-foreground">
              Curate featured opportunities and control their order across the opportunity portal.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadListings({ silent: true })}
              disabled={refreshing}
            >
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            <Button size="sm" onClick={handleCreateClick}>
              <Plus className="mr-2 h-4 w-4" />
              New listing
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading listings…
            </div>
          ) : listings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No listings yet. Create a listing to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Display order</TableHead>
                  <TableHead>Last updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((listing) => {
                  const orderDraft = orderDrafts[listing.id] ?? '';
                  const orderChanged = orderDraft.trim() !== String(listing.display_order ?? '');
                  return (
                    <TableRow key={listing.id}>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <p className="font-medium leading-tight">{listing.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {listing.companies?.name ? (
                          <span>{listing.companies.name}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={listing.is_featured}
                            onCheckedChange={(checked) => handleFeatureToggle(listing, checked)}
                            disabled={togglingId === listing.id}
                          />
                          {togglingId === listing.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            className="w-24"
                            value={orderDraft}
                            onChange={(event) => handleOrderInputChange(listing.id, event.target.value)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOrderSave(listing)}
                            disabled={savingOrderId === listing.id || !orderChanged}
                          >
                            {savingOrderId === listing.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Save
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(listing.updated_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(listing)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(listing)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          } else {
            setDialogOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit listing' : 'New listing'}</DialogTitle>
            <DialogDescription>
              Provide the headline, supporting copy, and optional company for the curated opportunity.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="listing-title">Title</Label>
              <Input
                id="listing-title"
                value={formState.title}
                onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="listing-description">Description</Label>
              <Textarea
                id="listing-description"
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                rows={5}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Assign company</Label>
              <Select
                value={formState.companyId ?? 'none'}
                onValueChange={(value) =>
                  setFormState((prev) => ({ ...prev, companyId: value === 'none' ? null : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={companiesLoading ? 'Loading companies…' : 'Select company (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No company</SelectItem>
                  {sortedCompanies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                      {company.approved ? '' : ' (pending verification)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="listing-type">Opportunity type</Label>
                <Select
                  value={formState.opportunityType}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, opportunityType: value }))}
                >
                  <SelectTrigger id="listing-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="job">Job</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="graduate_trainee">Graduate Trainee</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                    <SelectItem value="course">Course</SelectItem>
                    <SelectItem value="scholarship">Scholarship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="listing-region">Region</Label>
                <Input
                  id="listing-region"
                  value={formState.region}
                  onChange={(event) => setFormState((prev) => ({ ...prev, region: event.target.value }))}
                  placeholder="e.g. Kampala, Mbarara, Online"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="listing-deadline">Application deadline</Label>
                <Input
                  id="listing-deadline"
                  type="datetime-local"
                  value={formState.applicationDeadline}
                  onChange={(event) => setFormState((prev) => ({ ...prev, applicationDeadline: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="listing-method">Application method</Label>
                <Select
                  value={formState.applicationMethod}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, applicationMethod: value }))}
                >
                  <SelectTrigger id="listing-method">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="website">External website</SelectItem>
                    <SelectItem value="url">External form / URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formState.applicationMethod === 'whatsapp' && (
              <div className="space-y-2">
                <Label htmlFor="listing-whatsapp">WhatsApp number</Label>
                <Input
                  id="listing-whatsapp"
                  value={formState.whatsappNumber}
                  onChange={(event) => setFormState((prev) => ({ ...prev, whatsappNumber: event.target.value }))}
                  placeholder="e.g. +256700000000"
                />
              </div>
            )}

            {formState.applicationMethod === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="listing-email">Application email</Label>
                <Input
                  id="listing-email"
                  type="email"
                  value={formState.applicationEmail}
                  onChange={(event) => setFormState((prev) => ({ ...prev, applicationEmail: event.target.value }))}
                  placeholder="e.g. hr@company.com"
                />
              </div>
            )}

            {(formState.applicationMethod === 'website' || formState.applicationMethod === 'url') && (
              <div className="space-y-2">
                <Label htmlFor="listing-url">Application URL</Label>
                <Input
                  id="listing-url"
                  type="url"
                  value={formState.applicationUrl}
                  onChange={(event) => setFormState((prev) => ({ ...prev, applicationUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="listing-order">Display order</Label>
              <Input
                id="listing-order"
                type="number"
                placeholder="Leave blank to append automatically"
                value={formState.displayOrder}
                onChange={(event) => setFormState((prev) => ({ ...prev, displayOrder: event.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first. If left blank, the listing is placed after existing items.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Feature this listing</p>
                <p className="text-xs text-muted-foreground">
                  Featured listings surface prominently on the opportunities page.
                </p>
              </div>
              <Switch
                checked={formState.isFeatured}
                onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, isFeatured: checked }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isEditing ? 'Save changes' : 'Create listing'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deletingId) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete listing</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `This will remove ${deleteTarget.title} from the curated listings.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleConfirmDelete();
              }}
              disabled={Boolean(deletingId)}
            >
              {deletingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
