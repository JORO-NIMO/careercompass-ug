-- Supabase SQL function for overview metrics
create or replace function admin_analytics_overview()
returns table (
  total_users bigint,
  total_employers bigint,
  new_signups_daily bigint,
  new_signups_weekly bigint,
  new_signups_monthly bigint,
  total_placements bigint,
  applications bigint,
  successful_placements bigint
) as $$
begin
  return query
    select
      (select count(*) from profiles) as total_users,
      (select count(*) from profiles where role = 'employer') as total_employers,
      (select count(*) from profiles where created_at > now() - interval '1 day') as new_signups_daily,
      (select count(*) from profiles where created_at > now() - interval '7 days') as new_signups_weekly,
      (select count(*) from profiles where created_at > now() - interval '30 days') as new_signups_monthly,
      (select count(*) from placements) as total_placements,
      (select count(*) from applications) as applications,
      (select count(*) from placements where status = 'successful') as successful_placements;
end;
$$ language plpgsql security definer;

-- RLS policy (example, adjust as needed)
-- Enable for function: admin_analytics_overview
-- Only allow role = 'admin'
