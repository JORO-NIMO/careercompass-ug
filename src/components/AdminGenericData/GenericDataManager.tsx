import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Database, Table, Trash2, Globe, Lock, ExternalLink, ArrowRight } from "lucide-react";
import { DataCollection } from './types';
import { GenericUploadWizard } from './GenericUploadWizard';
import { DynamicDataExplorer } from './DynamicDataExplorer';
import { useToast } from "@/hooks/use-toast";

export function GenericDataManager() {
    const [collections, setCollections] = useState<DataCollection[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'upload' | 'explorer'>('list');
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchCollections = async () => {
        try {
            setLoading(true);
            const { data } = await (supabase
                .from('data_collections' as any) as any)
                .select('*')
                .order('created_at', { ascending: false });
            setCollections(data || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCollections();
    }, []);

    const togglePublish = async (col: DataCollection) => {
        const { error } = await (supabase
            .from('data_collections' as any) as any)
            .update({ is_published: !col.is_published })
            .eq('id', col.id);

        if (error) {
            toast({ title: "Update failed", description: error.message, variant: "destructive" });
        } else {
            setCollections(prev => prev.map(c => c.id === col.id ? { ...c, is_published: !c.is_published } : c));
            toast({ title: col.is_published ? "Unpublished" : "Published", description: `${col.name} visibility updated.` });
        }
    };

    const deleteCollection = async (id: string) => {
        if (!confirm("Are you sure? This will delete all entries and definitions for this collection.")) return;

        const { error } = await (supabase.from('data_collections' as any) as any).delete().eq('id', id);
        if (error) {
            toast({ title: "Delete failed", description: error.message, variant: "destructive" });
        } else {
            setCollections(prev => prev.filter(c => c.id !== id));
            toast({ title: "Deleted", description: "Collection removed." });
        }
    };

    if (view === 'upload') {
        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => setView('list')}>
                    <ArrowRight className="mr-2 h-4 w-4 rotate-180" /> Back to Dashboard
                </Button>
                <GenericUploadWizard onComplete={() => {
                    setView('list');
                    fetchCollections();
                }} />
            </div>
        );
    }

    if (view === 'explorer' && selectedCollection) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => setView('list')}>
                    <ArrowRight className="mr-2 h-4 w-4 rotate-180" /> Back to List
                </Button>
                <DynamicDataExplorer collectionId={selectedCollection} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Data Platform</h2>
                    <p className="text-muted-foreground">Manage schema-less data collections and public views.</p>
                </div>
                <Button onClick={() => setView('upload')} className="shadow-lg shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" /> New Upload
                </Button>
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : collections.length === 0 ? (
                <Card className="border-dashed border-2 bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center py-20">
                        <Database className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                        <h3 className="text-xl font-semibold text-muted-foreground">No data collections found</h3>
                        <p className="text-sm text-muted-foreground mb-6">Start by uploading your first spreadsheet.</p>
                        <Button onClick={() => setView('upload')} variant="outline">
                            Initialize Storage
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {collections.map(col => (
                        <Card key={col.id} className="group hover:border-primary/50 transition-all hover:shadow-md cursor-pointer overflow-hidden border-2 bg-background">
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Table className="h-4 w-4" />
                                    </div>
                                    <Badge variant={col.is_published ? "default" : "outline"} className="flex gap-1 items-center">
                                        {col.is_published ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                        {col.is_published ? "Published" : "Private"}
                                    </Badge>
                                </div>
                                <CardTitle className="text-xl group-hover:text-primary transition-colors">{col.name}</CardTitle>
                                <CardDescription className="line-clamp-2 min-h-[40px]">
                                    {col.description || "No description provided."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-4">
                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground border-t pt-4">
                                    <span>Created {new Date(col.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => {
                                            setSelectedCollection(col.id);
                                            setView('explorer');
                                        }}
                                    >
                                        <Eye className="mr-2 h-4 w-4" /> View Data
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => togglePublish(col)}
                                    >
                                        {col.is_published ? "Unpublish" : "Publish"}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => deleteCollection(col.id)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </Button>
                                    {col.is_published && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full"
                                            asChild
                                        >
                                            <a href={`/data/${col.id}`} target="_blank">
                                                <ExternalLink className="mr-2 h-4 w-4" /> Public URL
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
