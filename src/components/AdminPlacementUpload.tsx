import { useState } from 'react';
import { read, utils } from 'xlsx';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

            const rawData = utils.sheet_to_json<any>(ws);

            // Smart fuzzy matching for any column names
            const columnMapping: Record<string, string[]> = {
                position_title: ['position', 'title', 'role', 'job title', 'job_title', 'position title', 'job', 'vacancy'],
                company_name: ['company', 'organization', 'employer', 'company name', 'firm', 'organisation'],
                description: ['description', 'details', 'job description', 'summary', 'about', 'info'],
                region: ['region', 'location', 'district', 'city', 'area', 'place', 'address'],
                industry: ['industry', 'sector', 'category', 'field', 'department'],
                stipend: ['stipend', 'salary', 'pay', 'allowance', 'remuneration', 'wage', 'compensation'],
                available_slots: ['slots', 'openings', 'vacancies', 'number', 'quantity', 'available', 'positions'],
                website: ['website', 'url', 'web', 'site', 'link', 'homepage'],
                email: ['email', 'e-mail', 'mail', 'contact email'],
                phone: ['phone', 'phone number', 'tel', 'telephone', 'mobile', 'contact number', 'cell'],
                contact_name: ['contact', 'contact name', 'name for contact', 'contact person', 'person', 'representative'],
            };

            const sanitizeKey = (key: string) => key.toLowerCase().trim().replace(/_/g, ' ');

            const mapRow = (row: any): ParsedPlacement => {
                const mapped: any = {};
                const keys = Object.keys(row);

                for (const [field, aliases] of Object.entries(columnMapping)) {
                    const match = keys.find(k => {
                        const sanitized = sanitizeKey(k);
                        return aliases.some(alias => sanitized.includes(alias) || alias === sanitized);
                    });

                    if (match) {
                        mapped[field] = row[match];
                    }
                }

                // Fallback: try direct column access if fuzzy match failed
                return {
                    position_title: mapped.position_title || row.Position || row.Title || 'Untitled Position',
                    company_name: mapped.company_name || row.Company || row.Organization || 'Unknown Company',
                    description: mapped.description || row.Description || row.Details || '',
                    region: mapped.region || row.Location || row.Region || 'Central',
                    industry: mapped.industry || row.Category || row.Industry || row.Sector || 'Other',
                    stipend: mapped.stipend ? String(mapped.stipend) : (row.Stipend || row.Salary || 'Unpaid'),
                    available_slots: Number(mapped.available_slots) || Number(row.Slots) || 1,
                    website: mapped.website || row.Website || undefined,
                    email: mapped.email || row.Email || undefined,
                    phone: mapped.phone || row['Phone number'] || row.Phone || undefined,
                    contact_name: mapped.contact_name || row['Name for Contact'] || row.Contact || undefined,
                };
            };

            const sanitizedData = rawData.map(mapRow);

            setData(sanitizedData);
            toast({
                title: "File Processed",
                description: `Found ${sanitizedData.length} rows ready for upload.`,
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
                    approved: true,
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
                    Bulk Upload Placements
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 transition-colors hover:border-primary/50 relative">
                    <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-2 text-center">
                        Drop your Excel or CSV file here
                    </p>
                    <p className="text-xs text-muted-foreground/70 text-center">
                        Supports: Company, Category, Website, Email, Phone, Contact Name, Location
                    </p>
                    <Input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                </div>

                {data.length > 0 && (
                    <>
                        <Alert className="bg-green-50 border-green-200">
                            <Check className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800">Ready to Upload</AlertTitle>
                            <AlertDescription className="text-green-700">
                                {data.length} placements detected. Review and click upload.
                            </AlertDescription>
                        </Alert>

                        <div className="rounded-md border max-h-[300px] overflow-x-auto overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Website</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Contact</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.slice(0, 10).map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{row.company_name}</TableCell>
                                            <TableCell>{row.industry}</TableCell>
                                            <TableCell>{row.region}</TableCell>
                                            <TableCell className="text-xs">{row.website || '-'}</TableCell>
                                            <TableCell className="text-xs">{row.email || '-'}</TableCell>
                                            <TableCell className="text-xs">{row.phone || '-'}</TableCell>
                                            <TableCell className="text-xs">{row.contact_name || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {data.length > 10 && (
                            <p className="text-xs text-muted-foreground text-center">
                                Showing first 10 of {data.length} rows
                            </p>
                        )}

                        <Button onClick={handleUpload} disabled={uploading} className="w-full">
                            {uploading ? "Uploading..." : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload {data.length} Placements
                                </>
                            )}
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    );
};
