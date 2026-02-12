// Deno Edge Function: ingest-jobs
// Fetches jobs from free APIs and inserts into database

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Parser from 'npm:rss-parser';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lock duration in minutes - prevents duplicate runs
const LOCK_DURATION_MINUTES = 30;

interface ExternalJob {
  title?: string;
  position?: string;
  company?: string;
  company_name?: string;
  location?: string;
  description?: string;
  url?: string;
  application_url?: string;
  salary?: string;
  job_type?: string;
  publication_date?: string;
  category?: string;
}

interface NormalizedJob {
  position_title: string;
  company_name: string;
  description: string;
  region: string;
  industry: string;
  stipend: string;
  application_link: string | null;
  source: string;
  approved: boolean;
}

// Free job APIs
const JOB_SOURCES = [
  {
    name: 'Remotive',
    url: 'https://remotive.com/api/remote-jobs?limit=50',
    transform: (data: { jobs: ExternalJob[] }): ExternalJob[] => data.jobs || [],
  },
  {
    name: 'Arbeitnow',
    url: 'https://www.arbeitnow.com/api/job-board-api',
    transform: (data: { data: ExternalJob[] }): ExternalJob[] => data.data || [],
  },
  // Add more free APIs here
];

// RSS feeds to ingest on each run (user-provided)
const RSS_SOURCES = [
  { name: 'Opportunities For Youth', url: 'https://opportunitiesforyouth.org/feed' },
  { name: 'Opportunities Corners', url: 'https://opportunitiescorners.com/feed/' },
  { name: 'Opportunity Desk', url: 'https://opportunitydesk.org/feed/' },
  { name: 'Uganda Ministry of Education', url: 'https://www.education.go.ug/feed/' },
  { name: 'Chevening', url: 'https://www.chevening.org/feed/' },
  { name: 'Scholars4Dev', url: 'https://www.scholars4dev.com/feed/' },
];

// Keywords to filter for Africa-relevant jobs
const AFRICA_KEYWORDS = [
  'africa', 'uganda', 'kenya', 'tanzania', 'rwanda', 'nigeria', 'ghana',
  'remote', 'worldwide', 'global', 'anywhere', 'emea',
];

// Broader global relevance keywords
const GLOBAL_KEYWORDS = [
  'internship', 'internships', 'fellowship', 'fellowships', 'scholarship', 'scholarships',
  'grant', 'grants', 'job', 'jobs', 'opportunity', 'opportunities', 'placement', 'placements',
  'program', 'programme', 'training', 'workshop', 'contest', 'award', 'call for applications'
];

function normalizeJob(job: ExternalJob, source: string): NormalizedJob | null {
  const title = job.title || job.position;
  const company = job.company || job.company_name;
  
  if (!title || !company) return null;
  
  const oppType = classifyOpportunityTypeFromText(`${title} ${job.description || ''} ${job.category || ''} ${job.job_type || ''}`);
  return {
    position_title: title.substring(0, 200),
    company_name: company.substring(0, 100),
    description: (job.description || '').substring(0, 2000),
    region: job.location || 'Remote',
    industry: oppType || job.category || job.job_type || 'General',
    stipend: job.salary || 'Not specified',
    application_link: job.url || job.application_url || null,
    source,
    approved: false,
  };
}

type RssItem = {
  title?: string;
  link?: string;
  content?: string;
  contentSnippet?: string;
  pubDate?: string;
  isoDate?: string;
  categories?: string[];
};

// Lightweight heuristics to extract deadlines and regions from text
function extractDeadlineFromText(text: string | undefined): string | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, ' ').trim();

  const iso = /(20\d{2})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])/i.exec(t);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}`).toISOString();

  const dmy = /(?:apply by|deadline|closing date|applications close|application closes|applications closing|closes on|due by|due|last date|last day|ends on|submission deadline)[^\n\r:]*?(?:on|is|:)?\s*(0?[1-9]|[12]\d|3[01])\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i.exec(t);
  if (dmy) {
    const parsed = Date.parse(`${dmy[1]} ${dmy[2]} ${dmy[3]}`);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }

  const mdy = /(?:apply by|deadline|closing date|applications close|application closes|applications closing|closes on|due by|due|last date|last day|ends on|submission deadline)[^\n\r:]*?(?:on|is|:)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+(0?[1-9]|[12]\d|3[01]),?\s+(\d{4})/i.exec(t);
  if (mdy) {
    const parsed = Date.parse(`${mdy[1]} ${mdy[2]}, ${mdy[3]}`);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }

  const dmyNumeric = /(?:apply by|deadline|closing date|applications close|application closes|applications closing|closes on|due by|due|last date|last day|ends on|submission deadline)[^\n\r:]*?(?:on|is|:)?\s*(0?[1-9]|[12]\d|3[01])[/.-](0?[1-9]|1[0-2])[/.-](\d{4})/i.exec(t);
  if (dmyNumeric) return new Date(`${dmyNumeric[3]}-${dmyNumeric[2]}-${dmyNumeric[1]}`).toISOString();

  const mdyNumeric = /(?:apply by|deadline|closing date|applications close|application closes|applications closing|closes on|due by|due|last date|last day|ends on|submission deadline)[^\n\r:]*?(?:on|is|:)?\s*(0?[1-9]|1[0-2])[/.-](0?[1-9]|[12]\d|3[01])[/.-](\d{4})/i.exec(t);
  if (mdyNumeric) return new Date(`${mdyNumeric[3]}-${mdyNumeric[1]}-${mdyNumeric[2]}`).toISOString();

  return null;
}

const REGION_HINTS = [
  // Africa countries & regions
  'Africa','Sub-Saharan Africa','East Africa','West Africa','North Africa','Southern Africa',
  'Uganda','Kenya','Tanzania','Rwanda','Burundi','Ethiopia','Somalia','Eritrea','Sudan','South Sudan',
  'DRC','Congo','Democratic Republic of the Congo','Ghana','Nigeria','Cameroon','Senegal','Ivory Coast','Cote d\'Ivoire','Sierra Leone','Liberia','Zambia','Zimbabwe','Botswana','Namibia','Malawi','Mozambique','Angola','Morocco','Tunisia','Algeria','Egypt',
  // Global & macro regions
  'Global','Worldwide','Remote','Anywhere', 'EMEA','APAC','AMER','MENA','Middle East','Europe','European Union','EU','Oceania',
  // Countries (selected)
  'UK','United Kingdom','England','Scotland','Wales','Northern Ireland','Ireland','USA','United States','Canada','Australia','New Zealand',
  'Germany','France','Italy','Spain','Portugal','Netherlands','Belgium','Sweden','Norway','Denmark','Finland','Poland','Czech Republic','Austria','Switzerland','Greece','Turkey',
  'India','Pakistan','Bangladesh','Sri Lanka','Nepal','Bhutan','Maldives','China','Japan','South Korea','Singapore','Malaysia','Indonesia','Philippines','Thailand','Vietnam','Cambodia','Laos','Myanmar','Brunei','Mongolia',
  'UAE','United Arab Emirates','Saudi Arabia','Qatar','Kuwait','Bahrain','Oman','Jordan','Lebanon','Israel'
];

function inferRegionFromText(text: string | undefined): string | null {
  if (!text) return null;
  const t = text;
  for (const hint of REGION_HINTS) {
    const re = new RegExp(`\\b${hint.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (re.test(t)) return hint;
  }
  if (/remote|anywhere|worldwide|global/i.test(t)) return 'Global';
  return null;
}

// Opportunity type classification
function classifyOpportunityTypeFromText(text: string | undefined, categories?: string[] | string | null): string | null {
  const hay = `${(text || '')} ${(Array.isArray(categories) ? categories.join(' ') : (categories || ''))}`.toLowerCase();
  const has = (kw: string | RegExp) => (kw instanceof RegExp ? kw.test(hay) : hay.includes(kw));

  if (has(/scholarship|bursary|tuition/i)) return 'Scholarship';
  if (has(/fellow(ship)?/i)) return 'Fellowship';
  if (has(/intern(ship)?|summer internship|placement/i)) return 'Internship';
  if (has(/grant|funding|seed funding|microgrant/i)) return 'Grant';
  if (has(/hackathon|competition|contest|challenge/i)) return 'Competition';
  if (has(/workshop|bootcamp|masterclass|training/i)) return 'Training';
  if (has(/conference|symposium|summit|forum/i)) return 'Conference';
  if (has(/volunteer|volunteering/i)) return 'Volunteer';
  if (has(/job|vacancy|role|position|hiring/i)) return 'Job';
  if (has(/program(me)?|opportunity/i)) return 'Program';
  return null;
}

function normalizeRssItem(item: RssItem, source: string): NormalizedJob | null {
  const title = cleanText(item.title);
  const company = new URL(source).hostname.replace('www.', '');
  if (!title) return null;
  const description = cleanText(item.contentSnippet || item.content || '');
  const oppType = classifyOpportunityTypeFromText(`${title} ${description}`, item.categories);
  const cleanedUrl = cleanUrl(item.link);
  return {
    position_title: title.substring(0, 200),
    company_name: company.substring(0, 100),
    description: description.substring(0, 2000),
    region: 'Global',
    industry: oppType || item.categories?.[0] || 'General',
    stipend: 'Not specified',
    application_link: cleanedUrl || null,
    source,
    approved: false,
  };
}

function cleanText(value?: string): string {
  if (!value) return '';
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanUrl(url?: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'ref', 'source'].forEach((param) => {
      parsed.searchParams.delete(param);
    });
    return parsed.toString();
  } catch {
    return url;
  }
}

function isRelevant(job: ExternalJob): boolean {
  const searchText = [
    job.title,
    job.location,
    job.description?.substring(0, 500),
    job.category,
    job.job_type,
  ].join(' ').toLowerCase();

  return GLOBAL_KEYWORDS.some(kw => searchText.includes(kw))
    || AFRICA_KEYWORDS.some(kw => searchText.includes(kw));
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check for recent successful run (deduplication lock)
  const lockCutoff = new Date(Date.now() - LOCK_DURATION_MINUTES * 60 * 1000).toISOString();
  const { data: recentRun } = await supabase
    .from('workflow_logs')
    .select('id, started_at')
    .eq('workflow_name', 'job-ingestion')
    .eq('status', 'completed')
    .gte('started_at', lockCutoff)
    .limit(1);

  if (recentRun && recentRun.length > 0) {
    console.log('Skipping - already ran recently at', recentRun[0].started_at);
    return new Response(
      JSON.stringify({ 
        success: true, 
        skipped: true, 
        reason: 'Already ran within lock period',
        last_run: recentRun[0].started_at 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const results = {
    sources_checked: 0,
    jobs_fetched: 0,
    jobs_relevant: 0,
    jobs_inserted: 0,
    rss_sources_checked: 0,
    rss_items_fetched: 0,
    rss_items_relevant: 0,
    rss_items_inserted: 0,
    errors: [] as string[],
  };

  try {
    for (const source of JOB_SOURCES) {
      try {
        console.log(`Fetching from ${source.name}...`);
        results.sources_checked++;
        
        const response = await fetch(source.url, {
          headers: { 'User-Agent': 'CareerCompass/1.0' },
        });
        
        if (!response.ok) {
          results.errors.push(`${source.name}: HTTP ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        const jobs = source.transform(data);
        results.jobs_fetched += jobs.length;
        
        // Filter for globally relevant opportunities (jobs, internships, fellowships, etc.)
        const relevantJobs = jobs.filter(isRelevant);
        results.jobs_relevant += relevantJobs.length;
        
        // Normalize and insert
        for (const job of relevantJobs) {
          const normalized = normalizeJob(job, source.name);
          if (!normalized) continue;
          
          // Check for duplicates in listings by title and application_url
          const { data: existing } = await supabase
            .from('listings')
            .select('id')
            .ilike('title', normalized.position_title)
            .limit(1);

          if (existing && existing.length > 0) continue;

          // Insert into listings as draft for curation
          const { error } = await supabase.from('listings').insert({
            title: normalized.position_title,
            description: normalized.description,
            company_id: null,
            is_featured: false,
            opportunity_type: classifyOpportunityTypeFromText(`${job.title || ''} ${job.description || ''} ${job.category || ''} ${job.job_type || ''}`) || job.category || job.job_type || 'General',
            application_deadline: job.publication_date || null,
            application_method: normalized.application_link ? 'url' : null,
            application_url: normalized.application_link,
            region: normalized.region,
          });
          if (!error) {
            results.jobs_inserted++;
          } else {
            results.errors.push(`${source.name} insert: ${error.message}`);
          }
        }
        
      } catch (err) {
        results.errors.push(`${source.name}: ${(err as Error).message}`);
      }
    }

    // Ingest RSS feeds
    const parser = new Parser({
      timeout: 20000,
      headers: {
        'User-Agent': 'CareerCompassBot/1.0 (+https://careercompass-ug.vercel.app)',
        Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml',
      },
    });
    for (const feedSource of RSS_SOURCES) {
      try {
        results.rss_sources_checked++;
        const feed = await parser.parseURL(feedSource.url);
        const items = feed.items as RssItem[];
        results.rss_items_fetched += items.length;

        for (const item of items) {
          const text = cleanText([item.title, item.contentSnippet, item.content].join(' ')).toLowerCase();
          const relevant = GLOBAL_KEYWORDS.some((kw) => text.includes(kw)) || AFRICA_KEYWORDS.some((kw) => text.includes(kw));
          if (!relevant) continue;
          results.rss_items_relevant++;

          const normalized = normalizeRssItem(item, feedSource.url);
          if (!normalized) continue;

          const rawContent = cleanText((item.content || item.contentSnippet || '') as string);
          const extractedDeadline = extractDeadlineFromText(rawContent);
          const inferredRegion = inferRegionFromText(rawContent) || normalized.region;

          let existing: { id: string }[] | null = null;
          if (normalized.application_link) {
            const { data } = await supabase
              .from('listings')
              .select('id')
              .eq('application_url', normalized.application_link)
              .limit(1);
            existing = data;
          }

          if (!existing || existing.length === 0) {
            const { data } = await supabase
              .from('listings')
              .select('id')
              .ilike('title', normalized.position_title)
              .limit(1);
            existing = data;
          }

          if (existing && existing.length > 0) continue;

          const { error } = await supabase.from('listings').insert({
            title: normalized.position_title,
            description: normalized.description,
            company_id: null,
            is_featured: false,
            opportunity_type: normalized.industry,
            application_deadline: extractedDeadline || item.isoDate || item.pubDate || null,
            application_method: normalized.application_link ? 'url' : null,
            application_url: normalized.application_link,
            region: inferredRegion,
          });

          if (!error) {
            results.rss_items_inserted++;
          } else {
            results.errors.push(`RSS insert ${feedSource.name}: ${error.message}`);
          }
        }
      } catch (err) {
        results.errors.push(`RSS ${feedSource.name}: ${(err as Error).message}`);
      }
    }

    // Log to workflow_logs
    await supabase.from('workflow_logs').insert({
      workflow_name: 'job-ingestion',
      status: results.errors.length === 0 ? 'completed' : 'warning',
      completed_at: new Date().toISOString(),
      items_processed: results.jobs_fetched,
      items_succeeded: results.jobs_inserted,
      items_failed: results.jobs_relevant - results.jobs_inserted,
      metadata: results,
    });

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Job ingestion error:', error);
    
    await supabase.from('workflow_logs').insert({
      workflow_name: 'job-ingestion',
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: (error as Error).message,
    });

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
