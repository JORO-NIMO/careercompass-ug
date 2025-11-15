export async function searchJobsJSearch(query: string) {
  const res = await fetch(`/api/jobs?query=${encodeURIComponent(query)}&provider=jsearch`);
  if (!res.ok) throw new Error('Failed to fetch jobs');
  return res.json();
}
