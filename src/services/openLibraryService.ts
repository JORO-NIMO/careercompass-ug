import { api } from '@/lib/api-client';

export async function searchBooks(query: string, limit = 20) {
  return api.searchBooks(query, limit);
}
