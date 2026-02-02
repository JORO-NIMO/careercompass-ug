-- Give access privileges to Supabase roles
-- This is necessary because creating policies is not enough if the role cannot SELECT/INSERT/etc on the table.

GRANT SELECT ON TABLE public.data_collections TO anon;
GRANT SELECT ON TABLE public.data_definitions TO anon;
GRANT SELECT ON TABLE public.data_entries TO anon;

GRANT ALL ON TABLE public.data_collections TO authenticated;
GRANT ALL ON TABLE public.data_definitions TO authenticated;
GRANT ALL ON TABLE public.data_entries TO authenticated;

GRANT ALL ON TABLE public.data_collections TO service_role;
GRANT ALL ON TABLE public.data_definitions TO service_role;
GRANT ALL ON TABLE public.data_entries TO service_role;
