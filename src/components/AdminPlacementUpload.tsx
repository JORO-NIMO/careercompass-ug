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
            const jsonData = utils.sheet_to_json<ParsedPlacement>(ws);

            // Basic validation/sanitization could happen here
            const sanitizedData = jsonData.map(item => ({
                position_title: item.position_title || 'Untitled Position',
                company_name: item.company_name || 'Unknown Company',
                description: item.description || '',
                region: item.region || 'Central',
                industry: item.industry || 'Other',
                stipend: item.stipend ? String(item.stipend) : 'Unpaid',
                available_slots: Number(item.available_slots) || 1,
            }));

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
                    approved: true, // Auto-approve admin uploads
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
