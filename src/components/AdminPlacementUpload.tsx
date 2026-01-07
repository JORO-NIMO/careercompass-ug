import { useState } from 'react';
import { read, utils } from 'xlsx';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Check, AlertCircle, ArrowRight, ArrowLeft, Settings2, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ParsedPlacement {
    position_title: string;
    company_name: string;
    description: string;
    region: string;
    industry: string;
    stipend: string;
    available_slots: number;
    deadline?: string;
    application_link?: string;
}

const DB_FIELDS = [
    { id: 'position_title', label: 'Position Title', required: true },
    { id: 'company_name', label: 'Company Name', required: true },
    { id: 'description', label: 'Description', required: false },
    { id: 'region', label: 'Region', required: false },
    { id: 'industry', label: 'Industry', required: false },
    { id: 'stipend', label: 'Stipend', required: false },
    { id: 'available_slots', label: 'Available Slots', required: false },
    { id: 'deadline', label: 'Deadline', required: false },
    { id: 'application_link', label: 'Application Link', required: false },
];

export const AdminPlacementUpload = ({ onSuccess }: { onSuccess: () => void }) => {
    const [step, setStep] = useState(1);
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<any[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const [constantValues, setConstantValues] = useState<Record<string, string>>({});
    const [finalData, setFinalData] = useState<ParsedPlacement[]>([]);
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const bstr = event.target?.result;
            const wb = read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];

            const json = utils.sheet_to_json<any>(ws);
            if (json.length === 0) {
                toast({ title: "Empty File", description: "No data found in the spreadsheet.", variant: "destructive" });
                return;
            }

            const headers = Object.keys(json[0]);
            setRawHeaders(headers);
            setRawRows(json);

            // Initial auto-mapping
            const initialMappings: Record<string, string> = {};
            const fuzzyMap: Record<string, string[]> = {
                position_title: ['position', 'title', 'role', 'job title', 'job_title', 'position title'],
                company_name: ['company', 'organization', 'employer', 'company name', 'firm'],
                description: ['description', 'details', 'job description', 'summary'],
                region: ['region', 'location', 'district', 'city', 'area'],
                industry: ['industry', 'sector', 'category', 'field'],
                stipend: ['stipend', 'salary', 'pay', 'allowance', 'remuneration'],
                available_slots: ['slots', 'openings', 'vacancies', 'number', 'quantity', 'available'],
                deadline: ['deadline', 'closing date', 'expiry', 'due date'],
                application_link: ['link', 'url', 'website', 'application link', 'apply']
            };

            DB_FIELDS.forEach(field => {
                const match = headers.find(h => {
                    const sanitized = h.toLowerCase().trim().replace(/_/g, ' ');
                    return fuzzyMap[field.id]?.some(alias => sanitized.includes(alias) || alias === sanitized);
                });
                if (match) initialMappings[field.id] = match;
            });

            setMappings(initialMappings);
            setStep(2);
        };
        reader.readAsBinaryString(file);
    };

    const processData = () => {
        const processed = rawRows.map(row => {
            const item: any = {};
            DB_FIELDS.forEach(field => {
                const header = mappings[field.id];
                if (header) {
                    item[field.id] = row[header];
                } else if (constantValues[field.id]) {
                    item[field.id] = constantValues[field.id];
                }
            });

            return {
                position_title: item.position_title || 'Untitled Position',
                company_name: item.company_name || 'Unknown Company',
                description: item.description || '',
                region: item.region || 'Central',
                industry: item.industry || 'Other',
                stipend: item.stipend ? String(item.stipend) : 'Unpaid',
                available_slots: Number(item.available_slots) || 1,
                deadline: item.deadline ? String(item.deadline) : undefined,
                application_link: item.application_link ? String(item.application_link) : undefined,
            };
        });

        setFinalData(processed);
        setStep(3);
    };

    const handleUpload = async () => {
        setUploading(true);
        try {
            const { error } = await supabase.from('placements').insert(
                finalData.map(item => ({
                    ...item,
                    approved: true,
                    created_at: new Date().toISOString()
                }))
            );

            if (error) throw error;

            toast({ title: "Success", description: `Successfully uploaded ${finalData.length} placements.` });
            setStep(1);
            setRawRows([]);
            onSuccess();
        } catch (error) {
            console.error('Upload failed:', error);
            toast({ title: "Upload Failed", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    Advanced Bulk Upload (Step {step}/3)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {step === 1 && (
                    <div className="space-y-4">
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Instructions</AlertTitle>
                            <AlertDescription>
                                Upload an Excel file. On the next step, you will be able to map your columns to the database fields.
                            </AlertDescription>
                        </Alert>
                        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 transition-colors hover:border-primary/50 relative">
                            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-sm text-muted-foreground mb-4 text-center">
                                Drag and drop your spreadsheet here, or click to browse
                            </p>
                            <Input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            {DB_FIELDS.map(field => (
                                <div key={field.id} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-semibold flex items-center gap-1">
                                            {field.label}
                                            {field.required && <span className="text-red-500">*</span>}
                                        </Label>
                                        {mappings[field.id] && (
                                            <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-0.5 capitalize">
                                                <Check className="h-2 w-2" /> Match
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Select
                                                value={mappings[field.id] || "constant"}
                                                onValueChange={(val) => {
                                                    if (val === "constant") {
                                                        const newMappings = { ...mappings };
                                                        delete newMappings[field.id];
                                                        setMappings(newMappings);
                                                    } else {
                                                        setMappings({ ...mappings, [field.id]: val });
                                                    }
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Excel Column" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="constant">-- Use Constant Value --</SelectItem>
                                                    {rawHeaders.map(h => (
                                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {!mappings[field.id] && (
                                            <Input
                                                placeholder="Enter fixed value"
                                                value={constantValues[field.id] || ''}
                                                onChange={(e) => setConstantValues({ ...constantValues, [field.id]: e.target.value })}
                                                className="w-1/2"
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between">
                            <Button variant="outline" onClick={() => setStep(1)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </Button>
                            <Button onClick={processData}>
                                Next: Review Data <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4">
                        <div className="rounded-md border max-h-[400px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Position</TableHead>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Region</TableHead>
                                        <TableHead>Stipend</TableHead>
                                        <TableHead>Slots</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {finalData.map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{row.position_title}</TableCell>
                                            <TableCell>{row.company_name}</TableCell>
                                            <TableCell>{row.region}</TableCell>
                                            <TableCell>{row.stipend}</TableCell>
                                            <TableCell>{row.available_slots}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={() => setStep(2)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Edit Mapping
                            </Button>
                            <Button onClick={handleUpload} disabled={uploading}>
                                {uploading ? "Uploading..." : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Commit {finalData.length} Placements
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
