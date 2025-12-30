import { useCallback, useEffect, useState } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import { Loader2, Megaphone, Pencil, Plus, Trash2, Calendar, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import type { AdminPost } from '@/types/admin';
import { createPost, deletePost, fetchAdminPosts, updatePost } from '@/services/postsService';

interface FormState {
    title: string;
    content: string;
    category: 'Placements' | 'Announcements' | 'Updates';
    status: 'draft' | 'published' | 'archived';
    scheduled_for: string;
    image_url: string;
    cta_text: string;
    cta_link: string;
}

const DEFAULT_FORM: FormState = {
    title: '',
    content: '',
    category: 'Announcements',
    status: 'draft',
    scheduled_for: '',
    image_url: '',
    cta_text: '',
    cta_link: '',
};

export function AdminPostsManager() {
    const { toast } = useToast();
    const [posts, setPosts] = useState<AdminPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [activePost, setActivePost] = useState<AdminPost | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [isSaving, setIsSaving] = useState(false);

    const loadPosts = useCallback(async () => {
        try {
            setLoading(true);
            const items = await fetchAdminPosts();
            setPosts(items);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load posts', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        void loadPosts();
    }, [loadPosts]);

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setModalOpen(false);
            setActivePost(null);
            setForm(DEFAULT_FORM);
        } else {
            setModalOpen(true);
        }
    };

    const handleEditClick = (post: AdminPost) => {
        setActivePost(post);
        setForm({
            title: post.title,
            content: post.content,
            category: post.category,
            status: post.status,
            scheduled_for: post.scheduled_for ? post.scheduled_for.slice(0, 16) : '',
            image_url: post.image_url || '',
            cta_text: post.cta_text || '',
            cta_link: post.cta_link || '',
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            const payload = {
                ...form,
                scheduled_for: form.scheduled_for || null,
                image_url: form.image_url || null,
                cta_text: form.cta_text || null,
                cta_link: form.cta_link || null,
            };

            if (activePost) {
                await updatePost(activePost.id, payload);
                toast({ title: 'Updated', description: 'Post updated successfully' });
            } else {
                await createPost(payload);
                toast({ title: 'Created', description: 'Post published successfully' });
            }
            setModalOpen(false);
            void loadPosts();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to save post', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        try {
            await deletePost(id);
            toast({ title: 'Deleted', description: 'Post removed' });
            void loadPosts();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete post', variant: 'destructive' });
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-primary" />
                        Platform Posts & Announcements
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Manage updates, placement alerts, and news.</p>
                </div>
                <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setForm(DEFAULT_FORM)}>
                            <Plus className="mr-2 h-4 w-4" />
                            New Post
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{activePost ? 'Edit Post' : 'Create New Post'}</DialogTitle>
                            <DialogDescription>Publish updates or announcements to the platform.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="post-title">Title</Label>
                                    <Input
                                        id="post-title"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="post-category">Category</Label>
                                    <Select
                                        value={form.category}
                                        onValueChange={(val: any) => setForm({ ...form, category: val })}
                                    >
                                        <SelectTrigger id="post-category">
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Placements">Placements</SelectItem>
                                            <SelectItem value="Announcements">Announcements</SelectItem>
                                            <SelectItem value="Updates">Updates</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="post-content">Content (Supports HTML/Rich Text)</Label>
                                <Textarea
                                    id="post-content"
                                    value={form.content}
                                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                                    className="min-h-[200px]"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="post-status">Status</Label>
                                    <Select
                                        value={form.status}
                                        onValueChange={(val: any) => setForm({ ...form, status: val })}
                                    >
                                        <SelectTrigger id="post-status">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="published">Published</SelectItem>
                                            <SelectItem value="archived">Archived</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="post-schedule">Schedule Publication (Optional)</Label>
                                    <Input
                                        id="post-schedule"
                                        type="datetime-local"
                                        value={form.scheduled_for}
                                        onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="post-image">Featured Image URL (Optional)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="post-image"
                                        value={form.image_url}
                                        onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                                        placeholder="https://images.unsplash.com/..."
                                    />
                                    {form.image_url && (
                                        <img src={form.image_url} alt="Preview" className="h-10 w-10 object-cover rounded border" />
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="post-cta-text">CTA Button Text (Optional)</Label>
                                    <Input
                                        id="post-cta-text"
                                        value={form.cta_text}
                                        onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                                        placeholder="Apply Now"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="post-cta-link">CTA Button Link (Optional)</Label>
                                    <Input
                                        id="post-cta-link"
                                        value={form.cta_link}
                                        onChange={(e) => setForm({ ...form, cta_link: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <DialogFooter className="mt-6">
                                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {activePost ? 'Update Post' : 'Create Post'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex h-32 items-center justify-center text-muted-foreground gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading posts…
                    </div>
                ) : posts.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">No posts found. Start by creating your first update.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Post</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Scheduled</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {posts.map((post) => (
                                    <TableRow key={post.id}>
                                        <TableCell>
                                            <div className="font-medium">{post.title}</div>
                                            <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                                                {post.content.replace(/<[^>]*>/g, '').slice(0, 100)}...
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{post.category}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                post.status === 'published' ? 'default' :
                                                    post.status === 'archived' ? 'destructive' : 'secondary'
                                            }>
                                                {post.status.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {post.scheduled_for ? (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(post.scheduled_for).toLocaleDateString()}
                                                </div>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditClick(post)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(post.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
