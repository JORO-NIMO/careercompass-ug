-- Ensure required storage buckets exist for ads and company media uploads
insert into storage.buckets (id, name, public)
values
  ('ads', 'ads', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

insert into storage.buckets (id, name, public)
values
  ('company-media', 'company-media', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;
