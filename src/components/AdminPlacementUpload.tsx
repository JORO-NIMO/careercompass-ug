import { useState, useMemo } from 'react';
import { read, utils } from 'xlsx';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Check, ArrowLeft, ArrowRight, Plus, Trash2, Edit2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// Database fields the admin can map to
const DB_FIELDS = [
    { key: 'position_title', label: 'Position Title', required: true },
    { key: 'company_name', label: 'Company Name', required: true },
    { key: 'description', label: 'Description', required: false },
    { key: 'region', label: 'Region', required: false },
    { key: 'industry', label: 'Industry', required: false },
    { key: 'stipend', label: 'Stipend', required: false },
    { key: 'available_slots', label: 'Available Slots', required: false },
    { key: 'website', label: 'Website', required: false },
    { key: 'email', label: 'Email', required: false },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'contact_name', label: 'Contact Name', required: false },
] as const;

type DBFieldKey = typeof DB_FIELDS[number]['key'];

interface ParsedPlacement {
    position_title: string;
    company_name: string;
    description: string;
    region: string;
    industry: string;
    stipend: string;
    available_slots: number;
    website?: string;
    email?: string;
    phone?: string;
    contact_name?: string;
}

type Step = 'upload' | 'mapping' | 'preview';

export const AdminPlacementUpload = ({ onSuccess }: { onSuccess: () => void }) => {
    const [step, setStep] = useState<Step>('upload');
    const [rawData, setRawData] = useState<any[]>([]);
    const [excelColumns, setExcelColumns] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState<Record<string, DBFieldKey | 'ignore'>>({});
    const [mappedData, setMappedData] = useState<ParsedPlacement[]>([]);
    const [uploading, setUploading] = useState(false);
    const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
    const { toast } = useToast();

    // Step 1: Handle file upload
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

            const columns = Object.keys(data[0]).filter(c => c && String(c).trim() !== "");
            setRawData(data);
            setExcelColumns(columns);

            // Auto-suggest mappings based on fuzzy match
            const initialMapping: Record<string, DBFieldKey | 'ignore'> = {};
            const aliases: Record<DBFieldKey, string[]> = {
                position_title: ['position', 'title', 'role', 'job title', 'job_title', 'vacancy'],
                company_name: ['company', 'organization', 'employer', 'firm', 'organisation'],
                description: ['description', 'details', 'job description', 'summary', 'about'],
                region: ['region', 'location', 'district', 'city', 'area', 'address'],
                industry: ['industry', 'sector', 'category', 'field', 'department'],
                stipend: ['stipend', 'salary', 'pay', 'allowance', 'wage', 'compensation'],
                available_slots: ['slots', 'openings', 'vacancies', 'number', 'positions'],
                website: ['website', 'url', 'web', 'link'],
                email: ['email', 'e-mail', 'mail'],
                phone: ['phone', 'telephone', 'mobile', 'cell'],
                contact_name: ['contact', 'contact name', 'contact person', 'representative'],
            };

            columns.forEach(col => {
                const lowerCol = col.toLowerCase();
                let foundField: DBFieldKey | 'ignore' = 'ignore';

                for (const [field, fieldAliases] of Object.entries(aliases)) {
                    if (fieldAliases.some(alias => lowerCol.includes(alias))) {
                        foundField = field as DBFieldKey;
                        break;
                    }
                }
                initialMapping[col] = foundField;
            });

            setColumnMapping(initialMapping);
            setStep('mapping');

            toast({
                title: "File Loaded",
                description: `Found ${data.length} rows and ${columns.length} columns.`,
            });
        };
        reader.readAsBinaryString(file);
    };

    // Step 2: Apply column mapping
    const applyMapping = () => {
        // Create an inverse mapping for easier lookup during row processing
        const inverseMapping: Partial<Record<DBFieldKey, string>> = {};
        Object.entries(columnMapping).forEach(([excelCol, dbField]) => {
            if (dbField !== 'ignore') {
                inverseMapping[dbField] = excelCol;
            }
        });

        const mapped = rawData.map(row => ({
            position_title: row[inverseMapping.position_title!] || 'Untitled',
            company_name: row[inverseMapping.company_name!] || 'Unknown',
            description: row[inverseMapping.description!] || '',
            region: row[inverseMapping.region!] || 'Central',
            industry: row[inverseMapping.industry!] || 'Other',
            stipend: String(row[inverseMapping.stipend!] || 'Unpaid'),
            available_slots: Number(row[inverseMapping.available_slots!]) || 1,
            website: row[inverseMapping.website!] || undefined,
            email: row[inverseMapping.email!] || undefined,
            phone: row[inverseMapping.phone!] || undefined,
            contact_name: row[inverseMapping.contact_name!] || undefined,
        }));
        setMappedData(mapped);
        setStep('preview');
    };

    // Step 3: Edit a cell
    const updateCell = (rowIndex: number, field: keyof ParsedPlacement, value: string | number) => {
        setMappedData(prev => prev.map((row, i) =>
            i === rowIndex ? { ...row, [field]: value } : row
        ));
        setEditingCell(null);
    };

    // Add a new empty row
    const addRow = () => {
        setMappedData(prev => [...prev, {
            position_title: '',
            company_name: '',
            description: '',
            region: '',
            industry: '',
            stipend: '',
            available_slots: 1,
        }]);
    };

    // Delete a row
    const deleteRow = (index: number) => {
        setMappedData(prev => prev.filter((_, i) => i !== index));
    };

    // Upload to database
    const handleUpload = async () => {
        if (mappedData.length === 0) return;

        // Validation
        const invalid = mappedData.filter(row => !row.position_title || !row.company_name);
        if (invalid.length > 0) {
            toast({
                title: "Validation Error",
                description: `${invalid.length} rows are missing Position Title or Company Name.`,
                variant: "destructive",
            });
            return;
        }

        setUploading(true);
        try {
            const { error } = await supabase.from('placements').insert(
                mappedData.map(item => ({
                    ...item,
                    approved: true,
                    created_at: new Date().toISOString()
                }))
            );

            if (error) throw error;

            toast({
                title: "Success",
                description: `Uploaded ${mappedData.length} placements.`,
            });
            setRawData([]);
            setMappedData([]);
            setStep('upload');
            onSuccess();
        } catch (error) {
            console.error('Upload failed:', error);
            toast({ title: "Upload Failed", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const requiredFieldsMapped = useMemo(() => {
        const mappedFields = new Set(Object.values(columnMapping));
        return DB_FIELDS.filter(f => f.required).every(f => mappedFields.has(f.key));
    }, [columnMapping]);

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    Bulk Upload Placements
                </CardTitle>
                <CardDescription>
                    {step === 'upload' && 'Step 1: Upload your Excel or CSV file'}
                    {step === 'mapping' && 'Step 2: Assign Excel columns to database fields'}
                    {step === 'preview' && 'Step 3: Review, edit, and confirm upload'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Progress Indicator */}
                <div className="flex items-center justify-center gap-2 mb-4">
                    {['upload', 'mapping', 'preview'].map((s, i) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === s ? 'bg-primary text-white' :
                                ['mapping', 'preview'].indexOf(step) > i ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                                }`}>
                                {['mapping', 'preview'].indexOf(step) > i ? <Check className="h-4 w-4" /> : i + 1}
                            </div>
                            {i < 2 && <div className={`w-12 h-1 ${['mapping', 'preview'].indexOf(step) > i ? 'bg-green-500' : 'bg-muted'}`} />}
                        </div>
                    ))}
                </div>

                {/* Step 1: File Upload */}
                {step === 'upload' && (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 transition-colors hover:border-primary/50 relative">
                        <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground mb-2 text-center">
                            Drop your Excel or CSV file here, or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground/70 text-center">
                            Supports: .xlsx, .xls, .csv
                        </p>
                        <Input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </div>
                )}

                {/* Step 2: Column Mapping */}
                {step === 'mapping' && (
                    <>
                        <Alert>
                            <AlertTitle>Select Columns to Post</AlertTitle>
                            <AlertDescription>
                                For each column in your file, decide which database field it maps to.
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {DB_FIELDS.filter(f => f.required).map(f => (
                                        <Badge key={f.key} variant={Object.values(columnMapping).includes(f.key) ? "secondary" : "destructive"} className="text-[10px]">
                                            {f.label} *
                                        </Badge>
                                    ))}
                                </div>
                            </AlertDescription>
                        </Alert>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {excelColumns.map(col => (
                                <div key={col} className="space-y-1 p-3 border rounded-lg bg-muted/30">
                                    <label className="text-sm font-semibold truncate block" title={col}>
                                        Column: "{col}"
                                    </label>
                                    <Select
                                        value={columnMapping[col] || 'ignore'}
                                        onValueChange={(value) => setColumnMapping(prev => ({ ...prev, [col]: value as DBFieldKey | 'ignore' }))}
                                    >
                                        <SelectTrigger className="w-full bg-background">
                                            <SelectValue placeholder="Map to..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ignore">-- Ignore --</SelectItem>
                                            {DB_FIELDS.map(field => (
                                                <SelectItem key={field.key} value={field.key}>
                                                    {field.label} {field.required ? '*' : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={() => setStep('upload')}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </Button>
                            <Button onClick={applyMapping} disabled={!requiredFieldsMapped}>
                                Apply Mapping <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </>
                )}

                {/* Step 3: Editable Preview */}
                {step === 'preview' && (
                    <>
                        <div className="flex justify-between items-center">
                            <Badge variant="secondary">{mappedData.length} rows ready</Badge>
                            <Button variant="outline" size="sm" onClick={addRow}>
                                <Plus className="mr-2 h-4 w-4" /> Add Row
                            </Button>
                        </div>
                        <div className="rounded-md border max-h-[400px] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-8">#</TableHead>
                                        <TableHead>Position</TableHead>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Region</TableHead>
                                        <TableHead>Industry</TableHead>
                                        <TableHead>Stipend</TableHead>
                                        <TableHead className="w-16">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mappedData.map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                            {(['position_title', 'company_name', 'region', 'industry', 'stipend'] as const).map(field => (
                                                <TableCell key={field}>
                                                    {editingCell?.row === index && editingCell?.field === field ? (
                                                        <Input
                                                            autoFocus
                                                            defaultValue={row[field] as string}
                                                            onBlur={(e) => updateCell(index, field, e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && updateCell(index, field, (e.target as HTMLInputElement).value)}
                                                            className="h-8"
                                                        />
                                                    ) : (
                                                        <span
                                                            className="cursor-pointer hover:text-primary flex items-center gap-1"
                                                            onClick={() => setEditingCell({ row: index, field })}
                                                        >
                                                            {row[field] || <span className="text-muted-foreground italic">empty</span>}
                                                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                                                        </span>
                                                    )}
                                                </TableCell>
                                            ))}
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => deleteRow(index)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={() => setStep('mapping')}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Mapping
                            </Button>
                            <Button onClick={handleUpload} disabled={uploading || mappedData.length === 0}>
                                {uploading ? "Uploading..." : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload {mappedData.length} Placements
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};
