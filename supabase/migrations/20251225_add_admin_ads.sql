-- Create ads table for homepage advertisements
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text not null,
  link text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists ads_active_created_idx
  on public.ads (is_active, created_at desc);

alter table public.ads enable row level security;

create policy "Admins manage ads"
  on public.ads
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Public can read active ads"
  on public.ads
  for select
  using (is_active = true);
