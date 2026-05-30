-- Supabase SQL function for top entities
create or replace function admin_analytics_top_entities(entity text, limit integer)
returns table (
  id text,
  name text,
  count bigint
) as $$
begin
  if entity = 'companies' then
    return query select company_id::text, company_name, count(*)
      from placements
      group by company_id, company_name
      order by count desc
      limit limit;
  elsif entity = 'jobs' then
    return query select id::text, position_title, applications
      from placements
      order by applications desc
      limit limit;
  else
    return query select ''::text, ''::text, 0::bigint;
  end if;
end;
$$ language plpgsql security definer;

-- RLS policy (example, adjust as needed)
-- Enable for function: admin_analytics_top_entities
-- Only allow role = 'admin'
