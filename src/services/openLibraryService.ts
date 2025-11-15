export async function searchBooks(query: string, limit = 20) {
  const res = await fetch(`/api/books?q=${encodeURIComponent(query)}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch books');
  return res.json();
}
