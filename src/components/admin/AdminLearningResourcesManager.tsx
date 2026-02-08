import { useCallback, useEffect, useState } from 'react';
import {
    fetchAdminLearningResources,
    createLearningResource,
    updateLearningResource,
    deleteLearningResource,
    type LearningResource,
} from '@/services/learningResourcesService';
import { useToast } from '@/hooks/use-toast';
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
import { Loader2, Pencil, Plus, RefreshCcw, Save, Trash2, Link as LinkIcon, Image as ImageIcon, FileText, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ResourceFormState {
    title: string;
    description: string;
    type: string;
    url: string;
    image_url: string;
    display_order: string;
    is_active: boolean;
}

const DEFAULT_FORM_STATE: ResourceFormState = {
    title: '',
    description: '',
    type: 'text',
    url: '',
    image_url: '',
    display_order: '0',
    is_active: true,
};

export function AdminLearningResourcesManager() {
    const { toast } = useToast();
    const [resources, setResources] = useState<LearningResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [formState, setFormState] = useState<ResourceFormState>(DEFAULT_FORM_STATE);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [currentResourceId, setCurrentResourceId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<LearningResource | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const isEditing = currentResourceId !== null;

    const loadResources = useCallback(async (options?: { silent?: boolean }) => {
        const silent = options?.silent ?? false;
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        try {
            const items = await fetchAdminLearningResources();
            setResources(items);
        } catch (error: unknown) {
            console.error('Failed to load resources', error);
            toast({ title: 'Error', description: 'Unable to load learning resources', variant: 'destructive' });
        } finally {
            if (silent) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    }, [toast]);

    useEffect(() => {
        void loadResources();
    }, [loadResources]);

    const resetForm = () => {
        setFormState(DEFAULT_FORM_STATE);
        setCurrentResourceId(null);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        resetForm();
    };

    const handleCreateClick = () => {
        resetForm();
        setDialogOpen(true);
    };

    const handleEdit = (resource: LearningResource) => {
        setCurrentResourceId(resource.id);
        setFormState({
            title: resource.title,
            description: resource.description || '',
            type: resource.type,
            url: resource.url || '',
            image_url: resource.image_url || '',
            display_order: String(resource.display_order ?? 0),
            is_active: resource.is_active,
        });
        setDialogOpen(true);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!formState.title.trim()) {
            toast({ title: 'Missing details', description: 'Title is required.', variant: 'destructive' });
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                title: formState.title.trim(),
                description: formState.description.trim() || null,
                type: formState.type,
                url: formState.url.trim() || null,
                image_url: formState.image_url.trim() || null,
                display_order: parseInt(formState.display_order) || 0,
                is_active: formState.is_active,
            };

            if (isEditing && currentResourceId) {
                await updateLearningResource(currentResourceId, payload);
                toast({ title: 'Resource updated', description: 'Changes saved successfully.' });
            } else {
                await createLearningResource(payload);
                toast({ title: 'Resource created', description: 'Learning resource added successfully.' });
            }
            closeDialog();
            await loadResources({ silent: true });
        } catch (error: unknown) {
            console.error('Failed to save resource', error);
            toast({
                title: 'Save failed',
                description: error instanceof Error ? error.message : 'Unable to save learning resource.',
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setDeletingId(deleteTarget.id);
            await deleteLearningResource(deleteTarget.id);
            toast({ title: 'Resource deleted', description: `${deleteTarget.title} has been removed.` });
            setDeleteTarget(null);
            await loadResources({ silent: true });
        } catch (error: unknown) {
            console.error('Failed to delete resource', error);
            toast({ title: 'Error', description: 'Failed to delete resource', variant: 'destructive' });
        } finally {
            setDeletingId(null);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'photo': return <ImageIcon className="h-4 w-4" />;
            case 'link': return <LinkIcon className="h-4 w-4" />;
            case 'video': return <Video className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle>Learning Hub Resources</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Manage resources that appear on the Learning & Growth Hub.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadResources({ silent: true })}
                        disabled={refreshing}
                    >
                        {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                        Refresh
                    </Button>
                    <Button size="sm" onClick={handleCreateClick}>
                        <Plus className="mr-2 h-4 w-4" />
                        New resource
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading resources…
                    </div>
                ) : resources.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No resources yet. Add one to get started.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Order</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {resources.map((resource) => (
                                <TableRow key={resource.id} className={!resource.is_active ? 'opacity-60 bg-muted/20' : ''}>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <p className="font-medium leading-tight">{resource.title}</p>
                                            {resource.description && <p className="text-xs text-muted-foreground line-clamp-1">{resource.description}</p>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="flex w-fit items-center gap-1">
                                            {getTypeIcon(resource.type)}
                                            {resource.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={resource.is_active ? 'default' : 'secondary'}>
                                            {resource.is_active ? 'Active' : 'Hidden'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{resource.display_order}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(resource)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => setDeleteTarget(resource)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit Resource' : 'New Resource'}</DialogTitle>
                        <DialogDescription>
                            Add a resource to the Learning Hub. Photos and videos need an image URL or link.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                value={formState.title}
                                onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formState.description}
                                onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <Select
                                    value={formState.type}
                                    onValueChange={(val) => setFormState(prev => ({ ...prev, type: val }))}
                                >
                                    <SelectTrigger id="type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">Text / Article</SelectItem>
                                        <SelectItem value="link">External Link</SelectItem>
                                        <SelectItem value="photo">Photo / Flyer</SelectItem>
                                        <SelectItem value="video">Video</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="order">Display Order</Label>
                                <Input
                                    id="order"
                                    type="number"
                                    value={formState.display_order}
                                    onChange={(e) => setFormState(prev => ({ ...prev, display_order: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="url">Action URL / Link</Label>
                            <Input
                                id="url"
                                value={formState.url}
                                onChange={(e) => setFormState(prev => ({ ...prev, url: e.target.value }))}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="image_url">Image / Cover URL</Label>
                            <Input
                                id="image_url"
                                value={formState.image_url}
                                onChange={(e) => setFormState(prev => ({ ...prev, image_url: e.target.value }))}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="flex items-center justify-between rounded-md border p-4">
                            <div className="space-y-0.5">
                                <Label>Active Status</Label>
                                <p className="text-sm text-muted-foreground">Visible on the Learning Hub</p>
                            </div>
                            <Switch
                                checked={formState.is_active}
                                onCheckedChange={(val) => setFormState(prev => ({ ...prev, is_active: val }))}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? 'Save Changes' : 'Create Resource'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the resource "{deleteTarget?.title}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleConfirmDelete}
                            disabled={Boolean(deletingId)}
                        >
                            {deletingId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
