-- Migration: Generic Data Platform (GDP) Infrastructure
-- Enables flexible, schema-less data storage with dynamic interpretation

BEGIN;

-- 1. Create Data Collections (The "Containers")
CREATE TABLE IF NOT EXISTS public.data_collections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    is_published boolean DEFAULT false,
    owner_id uuid REFERENCES auth.users(id),
    config jsonb DEFAULT '{}'::jsonb, -- Stores UI preferences (default filters, views)
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Create Data Definitions (The "Interpreter Layer")
-- Versioned rules for how to display and cast raw JSONB data
CREATE TABLE IF NOT EXISTS public.data_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id uuid REFERENCES public.data_collections(id) ON DELETE CASCADE,
    version integer DEFAULT 1,
    is_active boolean DEFAULT true,
    columns jsonb NOT NULL, -- Array of {key, label, type, hidden, transform, format}
    created_at timestamptz DEFAULT now()
);

-- 3. Create Data Entries (The "Raw Data")
CREATE TABLE IF NOT EXISTS public.data_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id uuid REFERENCES public.data_collections(id) ON DELETE CASCADE,
    raw_content jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb, -- system flags, source info, versioning
    created_at timestamptz DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.data_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_entries ENABLE ROW LEVEL SECURITY;

-- 5. Policies for data_collections
-- Admins can do everything
CREATE POLICY "Admins have full access to collections" ON public.data_collections
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Public can view published collections
CREATE POLICY "Public can view published collections" ON public.data_collections
    FOR SELECT TO public
    USING (is_published = true);

-- 6. Policies for data_definitions
CREATE POLICY "Admins have full access to definitions" ON public.data_definitions
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Public can view active definitions of published collections" ON public.data_definitions
    FOR SELECT TO public
    USING (
        is_active = true AND 
        EXISTS (
            SELECT 1 FROM public.data_collections 
            WHERE id = data_definitions.collection_id AND is_published = true
        )
    );

-- 7. Policies for data_entries
CREATE POLICY "Admins have full access to entries" ON public.data_entries
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Public can view entries of published collections" ON public.data_entries
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.data_collections 
            WHERE id = data_entries.collection_id AND is_published = true
        )
    );

-- 8. Helper Indexes for JSONB performance
CREATE INDEX IF NOT EXISTS idx_data_entries_collection_id ON public.data_entries(collection_id);
CREATE INDEX IF NOT EXISTS idx_data_entries_raw_content_gin ON public.data_entries USING GIN (raw_content);

COMMIT;
