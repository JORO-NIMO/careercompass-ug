-- Migration: Create Admin Uploads Bucket
-- Note: Managing storage buckets via SQL is possible in Supabase

-- 1. Insert Bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin_uploads', 'admin_uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies
-- Allow Admins to do everything
CREATE POLICY "Admins can do everything on admin_uploads"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'admin_uploads' AND is_admin())
WITH CHECK (bucket_id = 'admin_uploads' AND is_admin());

-- Allow Public to READ (so the AI/anyone can access the URL if needed)
CREATE POLICY "Public can read admin_uploads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'admin_uploads');
