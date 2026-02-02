// Scraper Configuration
export const CONFIG = {
    // Search keywords for LinkedIn jobs
    searchQueries: [
        'internship Uganda',
        'graduate trainee Uganda',
        'placement Uganda',
        'entry level Uganda',
        'industrial training Uganda'
    ],

    // LinkedIn scraper settings
    scraper: {
        maxJobs: 50, // Max jobs per query
        optimize: true,
        locations: ['Uganda', 'Kampala', 'East Africa'],
    },

    // AI validation settings
    ai: {
        model: 'gpt-4o-mini',
        minRelevanceScore: 60, // Minimum score to approve (0-100)
        maxTokens: 1000,
    },

    // Cleanup settings
    cleanup: {
        maxAgeDays: 30, // Delete jobs older than this
    },

    // Fraud detection keywords
    fraudIndicators: [
        'wire transfer',
        'western union',
        'pay upfront',
        'registration fee',
        'processing fee',
        'guaranteed income',
        'work from home $',
        'crypto investment',
    ],
} as const;

export type Config = typeof CONFIG;
