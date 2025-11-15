export async function searchJobsAdzuna(query: string) {
  const res = await fetch(`/api/jobs?query=${encodeURIComponent(query)}&provider=adzuna`);
  if (!res.ok) throw new Error('Failed to fetch adzuna jobs');
  return res.json();
}
