export async function fetchCourses(limit = 20) {
  const res = await fetch(`/api/courses?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch courses');
  return res.json();
}
