import { api } from '@/lib/api-client';

export async function getCourseraCourses(limit = 20) {
  return api.getCourses(limit);
}

// Alias for compatibility
export const fetchCourses = getCourseraCourses;