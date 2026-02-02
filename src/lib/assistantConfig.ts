export interface AssistantPrefs {
  enabled: boolean;
  pages: Record<string, boolean>; // key -> enabled
}

// Keys used for per-page toggles (human-readable labels mapped to route prefixes)
export const ASSISTANT_PAGE_KEYS: Record<string, string> = {
  Home: '/',
  FindPlacements: '/find-placements',
  Jobs: '/jobs',
  LearningHub: '/learning',
  ApplicationTips: '/application-tips',
  CVBuilder: '/cv-builder',
  CVGuide: '/guides/how-to-write-a-cv',
  PlacementDetails: '/placements/*',
  AdminListingsReview: '/admin/listings-review',
};

const DEFAULT_PREFS: AssistantPrefs = {
  enabled: true,
  pages: Object.fromEntries(Object.values(ASSISTANT_PAGE_KEYS).map((k) => [k, true])),
};

export function getAssistantPrefs(): AssistantPrefs {
  try {
    const raw = localStorage.getItem('assistantPrefs');
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as AssistantPrefs;
    // Ensure keys exist
    const merged: AssistantPrefs = {
      enabled: parsed.enabled ?? true,
      pages: { ...DEFAULT_PREFS.pages, ...(parsed.pages || {}) },
    };
    return merged;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setAssistantPrefs(prefs: AssistantPrefs) {
  localStorage.setItem('assistantPrefs', JSON.stringify(prefs));
}

function matchesKey(path: string, key: string): boolean {
  if (key.endsWith('/*')) {
    const base = key.slice(0, -2);
    return path.startsWith(base + '/') || path === base;
  }
  return path === key || path.startsWith(key);
}

export function isAssistantEnabledForPath(path: string): boolean {
  const prefs = getAssistantPrefs();
  if (!prefs.enabled) return false;
  // Find the first matching page key (exact or prefix)
  const enabled = Object.entries(prefs.pages).some(([key, val]) => val && matchesKey(path, key));
  return enabled;
}

export function getSuggestionsForPath(path: string): string[] {
  // Route-specific suggestions
  if (path.startsWith('/placements/')) {
    return [
      'Summarize this job and requirements',
      'Draft a short motivation paragraph',
      'Does my CV match this role?'
    ];
  }
  const map: Record<string, string[]> = {
    '/': [
      'Find internships in my city',
      'Show me featured listings',
      'How do I use this platform effectively?'
    ],
    '/find-placements': [
      'What keywords should I search for data roles?',
      'Filter placements for remote opportunities',
      'Show internships in East Africa'
    ],
    '/jobs': [
      'What is new today?',
      'Highlight top featured listings',
      'Sort by scholarships and fellowships'
    ],
    '/learning': [
      'Where should I start learning data analytics?',
      'Recommend certifications for beginners',
      'How do I prepare for technical interviews?'
    ],
    '/application-tips': [
      'How can I tailor my application?',
      'Draft an email to apply for this role',
      'What should I include in my cover letter?'
    ],
    '/cv-builder': [
      'How can I improve my career summary?',
      'Rewrite this bullet for impact',
      'What sections should I add to match data analytics roles?'
    ],
    '/guides/how-to-write-a-cv': [
      'Can you critique my CV summary?',
      'Turn this duty into an accomplishment bullet',
      'What layout is best for internships?'
    ],
    '/admin/listings-review': [
      'How should I prioritize drafts?',
      'Suggest company assignments for unassigned listings',
      'Apply best practices for bulk publishing'
    ],
    '/for-companies': [
      'How can I post a listing?',
      'What makes a compelling listing?',
      'How do I manage company media?'
    ],
    '/find-talent': [
      'Filter talent by skills',
      'Show top profiles for data analytics',
      'How do I contact candidates?'
    ],
    '/guides/interview-tips': [
      'How do I prepare for interviews?',
      'Practice common questions',
      'What to avoid in interviews?'
    ],
    '/guides/interview-tips-uganda': [
      'Cultural considerations in interviews',
      'Local hiring practices overview',
      'How to follow up after interviews?'
    ],
    '/insights/top-internships': [
      'Show top internships by industry',
      'What skills are most in-demand?',
      'How do I get shortlisted?'
    ],
    '/insights/career-trends': [
      'What careers are trending now?',
      'Which certifications help most?',
      'How should I pivot my career?'
    ],
  };
  // Handle dynamic path for top internships by industry
  if (path.startsWith('/insights/top-internships/')) {
    return [
      'Highlight top internships in this industry',
      'What skills should I add to my CV?',
      'Suggest courses to prepare quickly'
    ];
  }
  return map[path] || [
    'Help me navigate this page',
    'What should I do next?',
    'Find relevant content for me'
  ];
}

export function getContextForPath(path: string): Record<string, unknown> {
  if (path.startsWith('/placements/')) {
    return { placementId: path.split('/').pop() };
  }
  return {};
}
