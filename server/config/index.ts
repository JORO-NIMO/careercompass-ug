/**
 * Configuration Module
 * Centralized configuration with environment variable validation
 */

import { config as loadEnv } from "dotenv";
import { z } from "zod";

// Load environment variables
loadEnv();

// Configuration schema
const ConfigSchema = z.object({
  // Supabase
  supabaseUrl: z.string().url(),
  supabaseServiceRoleKey: z.string().min(1),

  // OpenAI
  openaiApiKey: z.string().optional(),

  // Server
  port: z.coerce.number().default(3001),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),

  // Ingestion
  ingestionIntervalHours: z.coerce.number().min(1).max(24).default(6),
  maxDescriptionLength: z.coerce.number().default(5000),
  batchSize: z.coerce.number().default(50),

  // Rate Limiting
  rateLimitRequests: z.coerce.number().default(100),
  rateLimitWindowMs: z.coerce.number().default(60000),

  // Security
  corsAllowedOrigins: z.array(z.string()).default([]),
  rssAllowedHosts: z.array(z.string()).default([]),
});

// Parse and validate configuration
function loadConfig() {
  const rawConfig = {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    ingestionIntervalHours: process.env.INGESTION_INTERVAL_HOURS,
    maxDescriptionLength: process.env.MAX_DESCRIPTION_LENGTH,
    batchSize: process.env.BATCH_SIZE,
    rateLimitRequests: process.env.RATE_LIMIT_REQUESTS,
    rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
    corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    rssAllowedHosts: process.env.RSS_ALLOWED_HOSTS?.split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  };

  const result = ConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`Configuration validation failed:\n${errors}`);
  }

  return result.data;
}

// Export configuration
export const config = loadConfig();

// Default RSS sources (can be supplemented from database)
export const DEFAULT_RSS_SOURCES = [
  {
    name: "Opportunities For Youth",
    url: "https://opportunitiesforyouth.org/feed",
  },
  {
    name: "Opportunity Corners",
    url: "https://opportunitiescorners.com/feed/",
  },
  {
    name: "Opportunity Desk",
    url: "https://opportunitydesk.org/feed/",
  },
  {
    name: "After School Africa",
    url: "https://www.afterschoolafrica.com/feed/",
  },
  {
    name: "Youth Opportunities",
    url: "https://www.youthop.com/feed",
  },
  {
    name: "Scholars4Dev",
    url: "https://www.scholars4dev.com/feed/",
  },
  {
    name: "MyJobMag East Africa",
    url: "https://www.myjobmag.co.ug/feed",
  },
  {
    name: "Fuzu Uganda Jobs",
    url: "https://www.fuzu.com/uganda/feed.rss",
  },
];

// Opportunity type keywords for classification
export const TYPE_KEYWORDS: Record<string, string[]> = {
  job: [
    "job",
    "jobs",
    "hiring",
    "vacancy",
    "vacancies",
    "career",
    "careers",
    "employment",
    "position",
    "positions",
    "recruit",
    "recruiting",
  ],
  internship: [
    "intern",
    "internship",
    "internships",
    "trainee",
    "traineeship",
    "practicum",
    "work experience",
    "industrial attachment",
  ],
  scholarship: [
    "scholarship",
    "scholarships",
    "bursary",
    "bursaries",
    "award",
    "awards",
    "tuition",
    "study abroad",
    "fully funded",
    "partial funding",
  ],
  fellowship: [
    "fellowship",
    "fellowships",
    "fellow",
    "residency",
    "exchange program",
    "visiting researcher",
  ],
  training: [
    "training",
    "workshop",
    "bootcamp",
    "course",
    "certification",
    "webinar",
    "seminar",
    "capacity building",
    "skills development",
  ],
  grant: [
    "grant",
    "grants",
    "funding",
    "seed fund",
    "seed funding",
    "innovation fund",
    "research grant",
    "project funding",
    "financial support",
  ],
  competition: [
    "competition",
    "challenge",
    "contest",
    "hackathon",
    "pitch",
    "award competition",
    "startup competition",
  ],
  volunteer: [
    "volunteer",
    "volunteering",
    "volunteer opportunity",
    "community service",
    "unpaid",
  ],
  conference: [
    "conference",
    "summit",
    "forum",
    "congress",
    "symposium",
    "convention",
  ],
};

// Field/sector keywords for classification
export const FIELD_KEYWORDS: Record<string, string[]> = {
  "ICT / Technology": [
    "tech",
    "technology",
    "software",
    "developer",
    "programming",
    "data",
    "ai",
    "machine learning",
    "cyber",
    "it ",
    "ict",
    "computer",
    "web",
    "mobile",
    "app",
    "digital",
    "cloud",
    "devops",
  ],
  Engineering: [
    "engineer",
    "engineering",
    "mechanical",
    "electrical",
    "civil",
    "structural",
    "construction",
    "manufacturing",
  ],
  Business: [
    "business",
    "management",
    "marketing",
    "sales",
    "entrepreneur",
    "startup",
    "commerce",
    "mba",
    "administration",
    "operations",
  ],
  Health: [
    "health",
    "medical",
    "clinical",
    "nursing",
    "pharmacy",
    "doctor",
    "hospital",
    "healthcare",
    "medicine",
    "public health",
    "epidemiology",
  ],
  Agriculture: [
    "agriculture",
    "agri",
    "farming",
    "agribusiness",
    "food security",
    "crop",
    "livestock",
    "fisheries",
  ],
  Education: [
    "education",
    "teaching",
    "teacher",
    "school",
    "university",
    "learning",
    "academic",
    "lecturer",
    "professor",
    "curriculum",
  ],
  "Development / NGO": [
    "development",
    "ngo",
    "humanitarian",
    "social impact",
    "nonprofit",
    "non-profit",
    "charity",
    "aid",
    "relief",
    "sustainability",
    "sdg",
  ],
  Finance: [
    "finance",
    "banking",
    "accounting",
    "audit",
    "investment",
    "financial",
    "economist",
    "economics",
    "fintech",
  ],
  Law: [
    "law",
    "legal",
    "lawyer",
    "attorney",
    "advocate",
    "barrister",
    "paralegal",
    "compliance",
    "regulatory",
  ],
  "Media / Communications": [
    "media",
    "journalism",
    "communications",
    "pr ",
    "public relations",
    "broadcasting",
    "writer",
    "editor",
    "content",
  ],
  "Arts / Creative": [
    "art",
    "arts",
    "design",
    "creative",
    "graphic",
    "music",
    "film",
    "photography",
    "fashion",
    "animation",
  ],
  "Science / Research": [
    "science",
    "research",
    "researcher",
    "scientist",
    "laboratory",
    "phd",
    "postdoc",
    "biology",
    "chemistry",
    "physics",
  ],
  Environment: [
    "environment",
    "climate",
    "conservation",
    "wildlife",
    "forestry",
    "renewable",
    "sustainability",
    "green",
  ],
  "Government / Policy": [
    "government",
    "policy",
    "public sector",
    "civil service",
    "governance",
    "diplomat",
    "foreign affairs",
  ],
};

// Common country patterns
export const COUNTRY_PATTERNS: Record<string, string[]> = {
  Uganda: ["uganda", "kampala", "ugandan"],
  Kenya: ["kenya", "nairobi", "kenyan"],
  Tanzania: ["tanzania", "dar es salaam", "tanzanian"],
  Rwanda: ["rwanda", "kigali", "rwandan"],
  Nigeria: ["nigeria", "lagos", "abuja", "nigerian"],
  Ghana: ["ghana", "accra", "ghanaian"],
  "South Africa": ["south africa", "johannesburg", "cape town", "pretoria"],
  Ethiopia: ["ethiopia", "addis ababa", "ethiopian"],
  "United States": ["usa", "united states", "america", "american", "u.s."],
  "United Kingdom": [
    "uk",
    "united kingdom",
    "britain",
    "british",
    "london",
    "england",
  ],
  Germany: ["germany", "german", "berlin", "deutschland"],
  France: ["france", "french", "paris"],
  Canada: ["canada", "canadian", "toronto", "vancouver"],
  Australia: ["australia", "australian", "sydney", "melbourne"],
  India: ["india", "indian", "delhi", "mumbai", "bangalore"],
  China: ["china", "chinese", "beijing", "shanghai"],
  Japan: ["japan", "japanese", "tokyo"],
  Global: ["global", "worldwide", "international", "anywhere", "world"],
  Remote: ["remote", "work from home", "wfh", "virtual", "online position"],
  Africa: ["africa", "african", "sub-saharan"],
  "East Africa": ["east africa", "eastern africa", "eac"],
  Europe: ["europe", "european", "eu "],
  Asia: ["asia", "asian"],
};
