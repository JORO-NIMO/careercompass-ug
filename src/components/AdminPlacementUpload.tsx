import { useState } from 'react';
import { read, utils } from 'xlsx';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ParsedPlacement {
    position_title: string;
    company_name: string;
    description: string;
    region: string;
    industry: string;
    stipend: string;
    available_slots: number;
}

export const AdminPlacementUpload = ({ onSuccess }: { onSuccess: () => void }) => {
    const [data, setData] = useState<ParsedPlacement[]>([]);
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

            // Get raw JSON with original headers
            const rawData = utils.sheet_to_json<any>(ws);

            // Define mappings for fuzzy matching
            const columnMapping: Record<string, string[]> = {
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

            const sanitizeKey = (key: string) => key.toLowerCase().trim().replace(/_/g, ' ');

            const mapRow = (row: any): ParsedPlacement => {
                const mapped: any = {};
                const keys = Object.keys(row);

                // Find matching keys
                for (const [field, aliases] of Object.entries(columnMapping)) {
                    const match = keys.find(k => {
                        const sanitized = sanitizeKey(k);
                        return aliases.some(alias => sanitized.includes(alias) || alias === sanitized);
                    });

                    if (match) {
                        mapped[field] = row[match];
                    }
                }

                return {
                    position_title: mapped.position_title || row.position_title || 'Untitled Position',
                    company_name: mapped.company_name || row.company_name || 'Unknown Company',
                    description: mapped.description || row.description || '',
                    region: mapped.region || row.region || 'Central',
                    industry: mapped.industry || row.industry || 'Other',
                    stipend: mapped.stipend ? String(mapped.stipend) : 'Unpaid',
                    available_slots: Number(mapped.available_slots) || 1,
                };
            };

            const sanitizedData = rawData.map(mapRow);

            setData(sanitizedData);
            toast({
                title: "File Parsed",
                description: `Found ${sanitizedData.length} rows. Please review before uploading.`,
            });
        };
        reader.readAsBinaryString(file);
    };

    const handleUpload = async () => {
        if (data.length === 0) return;
        setUploading(true);

        try {
            const { error } = await supabase.from('placements').insert(
                data.map(item => ({
                    ...item,
                    approved: true, // NOTE: Bulk admin uploads bypass the normal review workflow and are auto-approved. Ensure this feature is restricted to highly trusted admins.
                    created_at: new Date().toISOString()
                }))
            );

            if (error) throw error;

            toast({
                title: "Success",
                description: `Successfully uploaded ${data.length} placements.`,
            });
            setData([]);
            onSuccess();
        } catch (error) {
            console.error('Upload failed:', error);
            toast({
                title: "Upload Failed",
                description: "There was an error uploading the placements.",
                variant: "destructive",
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    Bulk Upload Placements (Excel)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <Input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                        className="max-w-sm"
                    />
                    {data.length > 0 && (
                        <Button onClick={handleUpload} disabled={uploading}>
                            {uploading ? "Uploading..." : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload {data.length} Placements
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {data.length === 0 && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Instructions</AlertTitle>
                        <AlertDescription>
                            Upload an Excel file with columns: <strong>position_title, company_name, description, region, industry, stipend, available_slots</strong>.
                        </AlertDescription>
                    </Alert>
                )}

                {data.length > 0 && (
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
                                {data.map((row, index) => (
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
                )}
            </CardContent>
        </Card>
    );
};
