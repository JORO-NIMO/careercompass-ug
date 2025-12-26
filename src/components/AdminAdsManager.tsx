import { useEffect, useMemo, useState } from 'react';
import { createAd, deleteAd, fetchAdminAds, toggleAd, updateAd } from '@/services/adsService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import type { AdminAd } from '@/types/admin';

interface FormState {
  title: string;
  description: string;
  link: string;
  isActive: boolean;
  image: File | null;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const defaultForm: FormState = {
  title: '',
  description: '',
  link: '',
  isActive: true,
  image: null,
};

export function AdminAdsManager() {
  const { toast } = useToast();
  const [ads, setAds] = useState<AdminAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeAd, setActiveAd] = useState<AdminAd | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminAd | null>(null);

  const modalTitle = useMemo(() => (activeAd ? 'Edit Advertisement' : 'Create Advertisement'), [activeAd]);

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    try {
      setLoading(true);
      const items = await fetchAdminAds();
      setAds(items);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to load ads', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(defaultForm);
    setFileError(null);
    setActiveAd(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setModalOpen(false);
      resetForm();
    } else {
      setModalOpen(true);
    }
  };

  const handleCreateClick = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleEditClick = (ad: AdminAd) => {
    setActiveAd(ad);
    setForm({
      title: ad.title,
      description: ad.description ?? '',
      link: ad.link ?? '',
      isActive: ad.is_active,
      image: null,
    });
    setModalOpen(true);
  };

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setForm((prev) => ({ ...prev, image: null }));
      setFileError(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFileError('Only image files are allowed.');
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setFileError('Image must be smaller than 5MB.');
      return;
    }

    setFileError(null);
    setForm((prev) => ({ ...prev, image: file }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!activeAd && !form.image) {
      setFileError('Image is required.');
      return;
    }

    if (fileError) return;

    try {
      setIsSaving(true);
      if (activeAd) {
        const updated = await updateAd(activeAd.id, {
          title: form.title,
          description: form.description.trim() || null,
          link: form.link.trim() || null,
          isActive: form.isActive,
          image: form.image,
        });
        setAds((prev) => prev.map((ad) => (ad.id === updated.id ? updated : ad)));
        toast({ title: 'Updated', description: 'Advertisement updated successfully.' });
      } else {
        if (!form.image) {
          setFileError('Image is required.');
          return;
        }
        const created = await createAd({
          title: form.title,
          description: form.description.trim(),
          link: form.link.trim(),
          isActive: form.isActive,
          image: form.image,
        });
        setAds((prev) => [created, ...prev]);
        toast({ title: 'Created', description: 'Advertisement created successfully.' });
      }
      setModalOpen(false);
      resetForm();
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to save advertisement.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (ad: AdminAd) => {
    try {
      const updated = await toggleAd(ad.id, !ad.is_active);
      setAds((prev) => prev.map((item) => (item.id === ad.id ? updated : item)));
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to update status.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAd(deleteTarget.id);
      setAds((prev) => prev.filter((ad) => ad.id !== deleteTarget.id));
      toast({ title: 'Deleted', description: 'Advertisement deleted.' });
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to delete advertisement.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Homepage Advertisements</CardTitle>
          <p className="text-sm text-muted-foreground">Manage promotional banners shown on the homepage.</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateClick}>
              <Plus className="mr-2 h-4 w-4" />
              New Advertisement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{modalTitle}</DialogTitle>
              <DialogDescription>Fill out the details below. Images must be under 5MB.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ad-title">Title</Label>
                <Input
                  id="ad-title"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                  maxLength={150}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-description">Description</Label>
                <Textarea
                  id="ad-description"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={4}
                  maxLength={500}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-link">CTA Link (optional)</Label>
                <Input
                  id="ad-link"
                  type="url"
                  placeholder="https://example.com"
                  value={form.link}
                  onChange={(event) => setForm((prev) => ({ ...prev, link: event.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label htmlFor="ad-active" className="font-semibold">Active</Label>
                  <p className="text-xs text-muted-foreground">Deactivate to hide the ad without deleting it.</p>
                </div>
                <Switch
                  id="ad-active"
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-image">Image {activeAd ? '(leave empty to keep existing)' : ''}</Label>
                <Input
                  id="ad-image"
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
                />
                {fileError && <p className="text-sm text-destructive">{fileError}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
            Loading advertisements...
          </div>
        ) : ads.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
            <p className="mb-2">No advertisements yet.</p>
            <Button variant="outline" onClick={handleCreateClick}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first ad
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Preview</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.map((ad) => (
                <TableRow key={ad.id}>
                  <TableCell>
                    <img src={ad.image_url} alt={ad.title} className="h-12 w-20 rounded-md object-cover" />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{ad.title}</div>
                    {ad.description && <p className="text-sm text-muted-foreground line-clamp-2">{ad.description}</p>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ad.is_active ? 'default' : 'secondary'}>
                      {ad.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(ad.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleToggle(ad)}>
                      {ad.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleEditClick(ad)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setDeleteTarget(ad)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete advertisement</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The advertisement will be removed immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
