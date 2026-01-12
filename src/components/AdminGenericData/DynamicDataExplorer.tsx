import { useState, useEffect, useMemo } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, ExternalLink, RefreshCcw, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { DataCollection, DataDefinition, DataEntry } from './types';
import { format } from 'date-fns';

interface DynamicDataExplorerProps {
    collectionId: string;
}

export const DynamicDataExplorer = ({ collectionId }: DynamicDataExplorerProps) => {
    const [collection, setCollection] = useState<DataCollection | null>(null);
    const [definition, setDefinition] = useState<DataDefinition | null>(null);
    const [entries, setEntries] = useState<DataEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(0);
    const pageSize = 50;

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Get Collection & Active Definition
            const { data: colData } = await (supabase
                .from('data_collections' as any) as any)
                .select('*')
                .eq('id', collectionId)
                .single();

            const { data: defData } = await (supabase
                .from('data_definitions' as any) as any)
                .select('*')
                .eq('collection_id', collectionId)
                .eq('is_active', true)
                .single();

            setCollection(colData);
            setDefinition(defData);

            // 2. Get Entries
            const { data: entData } = await (supabase
                .from('data_entries' as any) as any)
                .select('*')
                .eq('collection_id', collectionId)
                .order('created_at', { ascending: true })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            setEntries(entData || []);
        } catch (error) {
            console.error("Failed to load generic data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [collectionId, page]);

    // Simple client-side filtering (for current page)
    const filteredEntries = useMemo(() => {
        if (!searchQuery) return entries;
        const lowQuery = searchQuery.toLowerCase();
        return entries.filter(entry =>
            JSON.stringify(entry.raw_content).toLowerCase().includes(lowQuery)
        );
    }, [entries, searchQuery]);

    const formatValue = (value: any, type: string) => {
        if (value === null || value === undefined) return '-';

        switch (type) {
            case 'currency':
                return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(Number(value) || 0);
            case 'date':
                try {
                    return format(new Date(value), 'MMM d, yyyy');
                } catch {
                    return String(value);
                }
            case 'tag':
                return <Badge variant="secondary" className="font-normal">{String(value)}</Badge>;
            case 'link':
                return (
                    <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        View <ExternalLink className="h-3 w-3" />
                    </a>
                );
            case 'boolean':
                return <Badge variant={value ? 'default' : 'outline'}>{value ? 'Yes' : 'No'}</Badge>;
            default:
                return String(value);
        }
    };

    if (loading && entries.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Navigating the data layer...</span>
            </div>
        );
    }

    if (!definition) return <div>No interpretation found for this collection.</div>;

    const visibleColumns = definition.columns.filter(c => !c.hidden);

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-background p-4 border rounded-xl shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search through all fields..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 border-primary/10"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                        <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Advanced filters
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-12 text-center font-bold">#</TableHead>
                                {visibleColumns.map(col => (
                                    <TableHead key={col.key} className="font-bold text-foreground">
                                        {col.label}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEntries.map((entry, idx) => (
                                <TableRow key={entry.id} className="hover:bg-primary/5 transition-colors">
                                    <TableCell className="text-center text-muted-foreground font-mono text-xs">
                                        {page * pageSize + idx + 1}
                                    </TableCell>
                                    {visibleColumns.map(col => (
                                        <TableCell key={col.key} className="py-3">
                                            {formatValue(entry.raw_content[col.key], col.type)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2 py-4 border-t">
                <p className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{filteredEntries.length}</span> results
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <span className="text-sm font-medium px-4">Page {page + 1}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={entries.length < pageSize}
                    >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
