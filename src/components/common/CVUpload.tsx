import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface CVUploadProps {
  onSuccess?: (data: {
    skills: string[];
    experience_years: number;
    education_level: string;
    has_embedding: boolean;
  }) => void;
}

type UploadState = 'idle' | 'uploading' | 'parsing' | 'success' | 'error';

export function CVUpload({ onSuccess }: CVUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<{
    skills: string[];
    experience_years: number;
    education_level: string;
    has_embedding: boolean;
  } | null>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF, Word document, or text file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);
    setUploadState('uploading');
    setProgress(10);

    try {
      // Upload to Supabase Storage
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      
      setProgress(30);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      setProgress(50);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('cvs')
        .getPublicUrl(uploadData.path);

      const cvUrl = urlData.publicUrl;

      setUploadState('parsing');
      setProgress(70);

      // Call parse-cv Edge Function
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-cv`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            cvUrl,
          }),
        }
      );

      setProgress(90);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse CV');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'CV parsing failed');
      }

      setProgress(100);
      setUploadState('success');
      setParsedData(result.data);

      toast({
        title: 'CV Processed Successfully',
        description: `Found ${result.data.skills.length} skills and ${result.data.experience_years} years of experience.`,
      });

      onSuccess?.(result.data);
    } catch (err) {
      console.error('CV upload error:', err);
      setError((err as Error).message || 'Failed to process CV');
      setUploadState('error');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    setUploadState('idle');
    setProgress(0);
    setError(null);
    setParsedData(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Upload Your CV
        </CardTitle>
        <CardDescription>
          Upload your CV/resume to enable AI-powered job matching and recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileChange}
          className="hidden"
        />

        {uploadState === 'idle' && (
          <div
            onClick={handleFileSelect}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm font-medium">Click to upload your CV</p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, DOC, DOCX, or TXT (max 5MB)
            </p>
          </div>
        )}

        {(uploadState === 'uploading' || uploadState === 'parsing') && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">
                {uploadState === 'uploading' ? 'Uploading CV...' : 'Analyzing with AI...'}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            {uploadState === 'parsing' && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Extracting skills, experience, and generating profile embedding
              </p>
            )}
          </div>
        )}

        {uploadState === 'success' && parsedData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">CV Processed Successfully</span>
            </div>

            <div className="grid gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Skills Found</p>
                <div className="flex flex-wrap gap-1">
                  {parsedData.skills.slice(0, 10).map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {parsedData.skills.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{parsedData.skills.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Experience</p>
                  <p className="font-medium">{parsedData.experience_years} years</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Education</p>
                  <p className="font-medium">{parsedData.education_level}</p>
                </div>
              </div>

              {parsedData.has_embedding && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  AI matching enabled
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Upload Different CV
            </Button>
          </div>
        )}

        {uploadState === 'error' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CVUpload;
