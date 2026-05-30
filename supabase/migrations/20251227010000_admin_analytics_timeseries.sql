-- Supabase SQL function for time series metrics
create or replace function admin_analytics_timeseries(metric text, period text)
returns table (
  date date,
  value bigint
) as $$
begin
  if metric = 'signups' then
    return query select date_trunc('day', created_at)::date as date, count(*) as value
      from profiles
      where created_at > now() - (period::interval)
      group by date
      order by date asc;
  elsif metric = 'placements' then
    return query select date_trunc('day', created_at)::date as date, count(*) as value
      from placements
      where created_at > now() - (period::interval)
      group by date
      order by date asc;
  else
    return query select now()::date as date, 0 as value;
  end if;
end;
$$ language plpgsql security definer;

-- RLS policy (example, adjust as needed)
-- Enable for function: admin_analytics_timeseries
-- Only allow role = 'admin'
