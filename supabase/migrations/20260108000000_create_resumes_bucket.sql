-- Create resumes bucket for user CVs
insert into storage.buckets (id, name, public)
values
  ('resumes', 'resumes', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

-- Policy: Anyone can upload a resume (authenticated)
create policy "Authenticated users can upload resumes"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'resumes' );

-- Policy: Public can read resumes (since they are shared via link)
create policy "Public can view resumes"
  on storage.objects for select
  to public
  using ( bucket_id = 'resumes' );

-- Policy: Users can update their own resumes
create policy "Users can update own resumes"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'resumes' AND owner = auth.uid() );

-- Policy: Users can delete their own resumes
create policy "Users can delete own resumes"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'resumes' AND owner = auth.uid() );
