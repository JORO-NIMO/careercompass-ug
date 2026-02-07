import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import PageAssistant from '@/components/common/PageAssistant';
import { isAssistantEnabledForPath, getSuggestionsForPath, getContextForPath } from '@/lib/assistantConfig';
import { useAuth } from '@/hooks/useAuth';

export default function GlobalPageAssistant() {
  const location = useLocation();
  const path = location.pathname;
  const { isAdmin } = useAuth();

  const config = useMemo(() => {
    // Skip pages that include their own assistant to avoid duplication
    const skip = ['/cv-builder', '/guides/how-to-write-a-cv'];
    if (skip.includes(path)) return null;

    // Do not render assistant on admin routes unless user is admin
    if (path.startsWith('/admin') && !isAdmin) return null;

    if (!isAssistantEnabledForPath(path)) return null;

    const suggestions = getSuggestionsForPath(path);
    const context = getContextForPath(path);

    // Map dynamic pages to friendly names for analytics
    const currentPage = path.startsWith('/placements/') ? 'placement-details' : path.startsWith('/admin/listings-review') ? 'admin-listings-review' : path;

    return { currentPage, suggestions, context };
  }, [path, isAdmin]);

  if (!config) return null;
  return <PageAssistant currentPage={config.currentPage} context={config.context} suggestions={config.suggestions} />;
}
