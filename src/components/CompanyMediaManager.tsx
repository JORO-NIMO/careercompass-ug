import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Trash2, UploadCloud, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  deleteCompanyMedia,
  listCompanyMedia,
  uploadCompanyMedia,
  type CompanyMedia,
} from '@/services/companiesService';

interface CompanyMediaManagerProps {
  companyId: string;
  disabled?: boolean;
}

const CompanyMediaManager = ({ companyId, disabled = false }: CompanyMediaManagerProps) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [media, setMedia] = useState<CompanyMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadMedia = useCallback(async () => {
    try {
      setLoading(true);
      const items = await listCompanyMedia(companyId);
      setMedia(items ?? []);
    } catch (error: unknown) {
      console.error('Failed to load media', error);
      toast({
        title: 'Unable to load media',
        description: 'Please try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [companyId, toast]);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const item = await uploadCompanyMedia(companyId, file);
      setMedia((prev) => [item, ...prev]);
      toast({ title: 'Media uploaded', description: `${file.name} is now available.` });
    } catch (error: unknown) {
      console.error('Upload failed', error);
      const message = error instanceof Error ? error.message : undefined;
      toast({
        title: 'Upload failed',
        description: message ?? 'Only images or PDFs up to 5MB are allowed.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteCompanyMedia(companyId, id);
      setMedia((prev) => prev.filter((item) => item.id !== id));
      toast({ title: 'Media removed' });
    } catch (error: unknown) {
      console.error('Delete failed', error);
      const message = error instanceof Error ? error.message : undefined;
      toast({
        title: 'Unable to delete media',
        description: message ?? 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">Media library</h4>
          <p className="text-xs text-muted-foreground">
            Upload images or PDFs up to 5MB to showcase your organisation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || disabled}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading || disabled}
        />
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading media…
        </div>
      ) : media.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No media uploaded yet. Use the upload button to add images or PDFs.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {media.map((item) => {
            const isImage = item.type === 'image';
            return (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded border p-3">
                <div className="flex items-center gap-3">
                  {isImage ? (
                    <img src={item.url} alt={item.path} className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.path.split('/').pop()}</p>
                    <p className="text-xs text-muted-foreground">
                      {(item.size / 1024).toFixed(1)} KB • {new Date(item.uploaded_at).toLocaleString()}
                    </p>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary underline"
                    >
                      View
                    </a>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id || disabled}
                >
                  {deletingId === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CompanyMediaManager;
