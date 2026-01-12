import { useState, useMemo } from 'react';
import { read, utils } from 'xlsx';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Check, ArrowLeft, ArrowRight, Table as TableIcon, Settings, Target, Eye, Database, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ColumnDefinition, ColumnType } from './types';

interface WizardState {
    step: 'upload' | 'inspect' | 'interpret' | 'confirm';
    collectionName: string;
    rawData: any[];
    rawHeaders: string[];
    selectedHeaders: string[];
    definitions: Record<string, ColumnDefinition>;
}

export const GenericUploadWizard = ({ onComplete }: { onComplete: () => void }) => {
    const [state, setState] = useState<WizardState>({
        step: 'upload',
        collectionName: '',
        rawData: [],
        rawHeaders: [],
        selectedHeaders: [],
        definitions: {},
    });
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();

    // Step 1: Raw Ingest
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const bstr = event.target?.result;
            const wb = read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];

            const data = utils.sheet_to_json<any>(ws);
            if (data.length === 0) {
                toast({ title: "Empty File", description: "The uploaded file has no data.", variant: "destructive" });
                return;
            }

            const headers = Object.keys(data[0]).filter(k => k.trim() !== "");

            setState(prev => ({
                ...prev,
                step: 'inspect',
                rawData: data,
                rawHeaders: headers,
                selectedHeaders: headers, // Select all by default, but show them for confirmation
                collectionName: file.name.split('.')[0],
            }));
        };
        reader.readAsBinaryString(file);
    };

    // Step 2: Interpretation Logic
    const initDefinitions = () => {
        const initialDefs: Record<string, ColumnDefinition> = {};
        state.selectedHeaders.forEach(header => {
            initialDefs[header] = {
                key: header,
                label: header, // Default to header name, but editable
                type: 'string', // Always default to string, no inference
            };
        });
        setState(prev => ({ ...prev, step: 'interpret', definitions: initialDefs }));
    };

    const updateDefinition = (header: string, updates: Partial<ColumnDefinition>) => {
        setState(prev => ({
            ...prev,
            definitions: {
                ...prev.definitions,
                [header]: { ...prev.definitions[header], ...updates }
            }
        }));
    };

    // Step 4: Database Commits
    const handleFinalize = async () => {
        setUploading(true);
        try {
            // 1. Create Collection
            const { data: collection, error: colError } = await (supabase
                .from('data_collections' as any) as any)
                .insert({
                    name: state.collectionName,
                    description: `Uploaded from file: ${state.collectionName}`,
                })
                .select()
                .single();

            if (colError) throw colError;

            // 2. Create Active Definition
            const columnList = Object.values(state.definitions);
            const { error: defError } = await (supabase
                .from('data_definitions' as any) as any)
                .insert({
                    collection_id: collection.id,
                    columns: columnList as any,
                    is_active: true,
                    version: 1
                });

            if (defError) throw defError;

            // 3. Insert Entries (Batching for large files)
            const entries = state.rawData.map(row => {
                const filteredRow: Record<string, any> = {};
                state.selectedHeaders.forEach(h => {
                    filteredRow[h] = row[h];
                });
                return {
                    collection_id: collection.id,
                    raw_content: filteredRow,
                };
            });

            // Insert in chunks of 500
            const chunkSize = 500;
            for (let i = 0; i < entries.length; i += chunkSize) {
                const chunk = entries.slice(i, i + chunkSize);
                const { error: entError } = await (supabase
                    .from('data_entries' as any) as any)
                    .insert(chunk);
                if (entError) throw entError;
            }

            toast({ title: "Success", description: "Data Platform updated successfully." });
            onComplete();
        } catch (error: any) {
            console.error("Upload failed", error);
            toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card className="w-full border-2 border-primary/10 shadow-xl overflow-hidden">
            <CardHeader className="bg-primary/5 pb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary rounded-lg text-white">
                        <Database className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">Generic Data Platform</CardTitle>
                        <CardDescription>Upload and interpret any structured data file</CardDescription>
                    </div>
                </div>

                {/* Wizard Steps */}
                <div className="flex items-center justify-between max-w-2xl mt-6 relative px-4">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0" />
                    {[
                        { id: 'upload', icon: Upload, label: 'Ingest' },
                        { id: 'inspect', icon: Eye, label: 'Inspect' },
                        { id: 'interpret', icon: Target, label: 'Interpret' },
                        { id: 'confirm', icon: Check, label: 'Finalize' }
                    ].map((s, idx) => (
                        <div key={s.id} className="relative z-10 flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${state.step === s.id ? 'bg-primary border-primary text-white scale-110 shadow-lg' :
                                'bg-background border-muted text-muted-foreground'
                                }`}>
                                <s.icon className="h-5 w-5" />
                            </div>
                            <span className={`text-[10px] mt-2 font-bold uppercase tracking-wider ${state.step === s.id ? 'text-primary' : 'text-muted-foreground'}`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>
            </CardHeader>

            <CardContent className="pt-8 min-h-[400px]">
                {/* STEP 1: UPLOAD */}
                {state.step === 'upload' && (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-primary/20 rounded-2xl p-16 bg-primary/5 transition-all hover:bg-primary/10 relative group">
                        <div className="p-6 bg-white rounded-full shadow-lg mb-6 group-hover:scale-110 transition-transform">
                            <FileSpreadsheet className="h-12 w-12 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Drop your data file</h3>
                        <p className="text-sm text-muted-foreground text-center max-w-sm mb-8">
                            Select an Excel, CSV, or TSV file. We'll read the structure exactly as it is without assumptions.
                        </p>
                        <Input
                            type="file"
                            accept=".xlsx, .xls, .csv, .tsv"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Button className="pointer-events-none px-8">Browse Files</Button>
                    </div>
                )}

                {/* STEP 2: INSPECT */}
                {state.step === 'inspect' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold">Raw Structure Detected</h3>
                                <p className="text-sm text-muted-foreground">Select columns you want to include in this data set.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="px-3 py-1 font-mono">{state.rawData.length} Rows</Badge>
                                <Badge variant="secondary" className="px-3 py-1 font-mono">{state.rawHeaders.length} Columns</Badge>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 p-4 border rounded-xl bg-muted/30">
                            {state.rawHeaders.map(header => {
                                const isSelected = state.selectedHeaders.includes(header);
                                return (
                                    <Badge
                                        key={header}
                                        onClick={() => setState(prev => ({
                                            ...prev,
                                            selectedHeaders: isSelected
                                                ? prev.selectedHeaders.filter(h => h !== header)
                                                : [...prev.selectedHeaders, header]
                                        }))}
                                        className={`px-3 py-1.5 cursor-pointer text-sm font-medium transition-all ${isSelected ? 'bg-primary hover:bg-primary/90' : 'bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20'
                                            }`}
                                    >
                                        {header}
                                        {isSelected && <Check className="ml-2 h-3 w-3" />}
                                    </Badge>
                                );
                            })}
                        </div>

                        <div className="flex justify-between items-center pt-8 border-t">
                            <Button variant="ghost" onClick={() => setState(prev => ({ ...prev, step: 'upload' }))}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Reset
                            </Button>
                            <Button onClick={initDefinitions} disabled={state.selectedHeaders.length === 0}>
                                Confirmed. Define Meanings <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 3: INTERPRET */}
                {state.step === 'interpret' && (
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold">Data Interpretation</h3>
                            <p className="text-sm text-muted-foreground">Give your columns human-friendly names and assign data types.</p>
                        </div>

                        <div className="grid gap-4 max-h-[500px] overflow-auto pr-2">
                            {state.selectedHeaders.map(header => {
                                const def = state.definitions[header];
                                return (
                                    <div key={header} className="p-4 border rounded-xl bg-background shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                        <div className="space-y-1">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Raw Key</span>
                                            <p className="font-mono text-xs truncate bg-secondary px-2 py-1 rounded w-fit">{header}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Display Name</span>
                                            <Input
                                                value={def.label}
                                                onChange={(e) => updateDefinition(header, { label: e.target.value })}
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Type</span>
                                            <Select
                                                value={def.type}
                                                onValueChange={(val) => updateDefinition(header, { type: val as ColumnType })}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="string">Text (Plain)</SelectItem>
                                                    <SelectItem value="number">Number</SelectItem>
                                                    <SelectItem value="currency">Currency</SelectItem>
                                                    <SelectItem value="date">Date</SelectItem>
                                                    <SelectItem value="tag">Category / Tag</SelectItem>
                                                    <SelectItem value="link">Web Link</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-between items-center pt-8 border-t">
                            <Button variant="ghost" onClick={() => setState(prev => ({ ...prev, step: 'inspect' }))}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Headers
                            </Button>
                            <Button onClick={() => setState(prev => ({ ...prev, step: 'confirm' }))}>
                                Review & Commit <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 4: CONFIRM */}
                {state.step === 'confirm' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className="p-8 border-2 border-primary/20 rounded-2xl bg-primary/5 space-y-4">
                            <div className="flex items-center gap-4 text-primary">
                                <Target className="h-8 w-8" />
                                <h3 className="text-2xl font-bold">Ready to Commit</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Collection Name</label>
                                    <Input
                                        value={state.collectionName}
                                        onChange={(e) => setState(prev => ({ ...prev, collectionName: e.target.value }))}
                                        className="text-lg h-12 mt-1"
                                    />
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="p-3 bg-white rounded-lg shadow-sm border">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Entities</span>
                                        <p className="text-xl font-bold">{state.rawData.length}</p>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg shadow-sm border">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Fields</span>
                                        <p className="text-xl font-bold">{state.selectedHeaders.length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Settings className="h-4 w-4" />
                                No data will be permanently stored until you click "Finalize".
                            </div>
                            <div className="flex gap-4">
                                <Button variant="ghost" onClick={() => setState(prev => ({ ...prev, step: 'interpret' }))}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Adjust Meanings
                                </Button>
                                <Button onClick={handleFinalize} disabled={uploading}>
                                    {uploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Database className="mr-2 h-4 w-4" />
                                            Finalize & Store
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
