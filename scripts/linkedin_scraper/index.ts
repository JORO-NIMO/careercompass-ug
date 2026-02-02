/**
 * LinkedIn Jobs Scraper
 * Scrapes jobs, validates with AI, and posts approved ones to listings
 */
import { createClient } from '@supabase/supabase-js';
import { LinkedinScraper, ETimeFilterOptions, ERelevanceFilterOptions, events } from 'linkedin-jobs-scraper';
import { CONFIG } from './config.js';
import { validateJob } from './aiValidator.js';

// Initialize Supabase with service role for full access
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ScrapedJob {
    title: string;
    company: string;
    location: string | null;
    description: string;
    job_url: string;
    posted_date: string | null;
}

const scrapedJobs: ScrapedJob[] = [];
let IS_DRY_RUN = process.argv.includes('--dry-run');

async function scrapeLinkedInJobs(): Promise<ScrapedJob[]> {
    // Clear array from any previous runs
    scrapedJobs.length = 0;
    console.log('Starting LinkedIn scraper...');

    const scraper = new LinkedinScraper({
        headless: true,
        slowMo: 200,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    scraper.on(events.scraper.data, (data) => {
        scrapedJobs.push({
            title: data.title || 'Untitled',
            company: data.company || 'Unknown Company',
            location: data.location || null,
            description: data.description || '',
            job_url: data.link || '',
            posted_date: data.date || null,
        });
    });

    scraper.on(events.scraper.error, (err) => {
        console.error('Scraper error:', err);
    });

    scraper.on(events.scraper.end, () => {
        console.log(`Scraping complete. Found ${scrapedJobs.length} jobs.`);
    });

    // Run searches for each query
    for (const query of CONFIG.searchQueries) {
        try {
            await scraper.run([{
                query,
                options: {
                    locations: CONFIG.scraper.locations,
                    limit: CONFIG.scraper.maxJobs,
                    filters: {
                        time: ETimeFilterOptions.MONTH,
                        relevance: ERelevanceFilterOptions.RELEVANT,
                    },
                },
            }]);
        } catch (err) {
            console.error(`Error scraping query "${query}":`, err);
        }
    }

    await scraper.close();
    return scrapedJobs;
}

console.log(`Saved ${savedCount} jobs.`);
return savedCount;
}

async function saveToDatabase(jobs: ScrapedJob[]): Promise<number> {
    if (IS_DRY_RUN) {
        console.log(`[DRY RUN] Would save ${jobs.length} jobs to database.`);
        return jobs.length;
    }
    console.log(`Saving ${jobs.length} jobs to database...`);
    let savedCount = 0;

    for (const job of jobs) {
        if (!job.job_url) continue;

        const { error } = await supabase
            .from('linkedin_jobs')
            .upsert({
                title: job.title,
                company: job.company,
                location: job.location,
                description: job.description,
                job_url: job.job_url,
                posted_date: job.posted_date,
                scraped_at: new Date().toISOString(),
            }, { onConflict: 'job_url' });

        if (error) {
            console.error(`Failed to save job: ${job.title}`, error.message);
        } else {
            savedCount++;
        }
    }

    console.log(`Saved ${savedCount} jobs.`);
    return savedCount;
}

async function processUnvalidatedJobs(): Promise<void> {
    console.log('Processing unvalidated jobs with AI...');

    const { data: jobs, error } = await supabase
        .from('linkedin_jobs')
        .select('*')
        .is('processed_at', null)
        .limit(50);

    if (error || !jobs) {
        console.error('Failed to fetch unvalidated jobs:', error?.message);
        return;
    }

    console.log(`Found ${jobs.length} jobs to validate.`);

    for (const job of jobs) {
        console.log(`Validating: ${job.title} at ${job.company}`);

        const result = await validateJob({
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            job_url: job.job_url,
        });

        if (IS_DRY_RUN) {
            console.log(`  [DRY RUN] → ${result.approved ? '✓ Approved' : '✗ Rejected'} (Score: ${result.relevanceScore})`);
            continue;
        }

        const { error: updateError } = await supabase
            .from('linkedin_jobs')
            .update({
                processed_at: new Date().toISOString(),
                is_approved: result.approved,
                ai_analysis: result.analysis,
                rejection_reason: result.rejectionReason,
            })
            .eq('id', job.id);

        if (updateError) {
            console.error(`Failed to update job ${job.id}:`, updateError.message);
        } else {
            console.log(`  → ${result.approved ? '✓ Approved' : '✗ Rejected'} (Score: ${result.relevanceScore})`);
        }

        // Rate limit AI calls
        await new Promise(r => setTimeout(r, 500));
    }
}

async function postApprovedToListings(): Promise<number> {
    console.log('Posting approved jobs to listings...');

    const { data: approvedJobs, error } = await supabase
        .from('linkedin_jobs')
        .select('*')
        .eq('is_approved', true)
        .eq('is_posted', false)
        .limit(20);

    if (error || !approvedJobs) {
        console.error('Failed to fetch approved jobs:', error?.message);
        return 0;
    }

    console.log(`Found ${approvedJobs.length} approved jobs to post.`);
    let postedCount = 0;

    for (const job of approvedJobs) {
        const analysis = job.ai_analysis || {};

        // Build description with extracted data
        let description = job.description;
        if (analysis.deadline) description += `\n\nDeadline: ${analysis.deadline}`;
        if (analysis.salary) description += `\nSalary: ${analysis.salary}`;
        if (analysis.skills?.length) description += `\nSkills: ${analysis.skills.join(', ')}`;
        description += `\n\nApply: ${job.job_url}`;

        if (IS_DRY_RUN) {
            console.log(`  [DRY RUN] Would post listing: ${job.title}`);
            postedCount++;
            continue;
        }

        const { error: insertError } = await supabase
            .from('listings')
            .insert({
                title: job.title,
                description: description.slice(0, 5000),
                is_featured: false,
                display_order: 0,
            });

        if (insertError) {
            console.error(`Failed to post listing for ${job.title}:`, insertError.message);
            continue;
        }

        // Mark as posted
        await supabase
            .from('linkedin_jobs')
            .update({ is_posted: true })
            .eq('id', job.id);

        postedCount++;
        console.log(`  ✓ Posted: ${job.title}`);
    }

    return postedCount;
}

async function cleanup(): Promise<void> {
    if (IS_DRY_RUN) {
        console.log('[DRY RUN] Skipping cleanup.');
        return;
    }
    console.log('Running cleanup...');

    const { data, error } = await supabase.rpc('cleanup_old_linkedin_jobs');

    if (error) {
        console.error('Cleanup failed:', error.message);
    } else {
        console.log(`Cleaned up ${data || 0} old records.`);
    }
}

async function main(): Promise<void> {
    console.log('='.repeat(50));
    console.log('LinkedIn Jobs Scraper - Starting');
    if (IS_DRY_RUN) {
        console.log('*** RUNNING IN DRY RUN MODE ***');
    }
    console.log('='.repeat(50));

    // Validate environment
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        if (!IS_DRY_RUN) {
            console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
            process.exit(1);
        } else {
            console.warn('Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing - Dry run will have limited functionality.');
        }
    }
    if (!process.env.OPENAI_API_KEY) {
        console.error('Missing OPENAI_API_KEY');
        process.exit(1);
    }

    try {
        // Step 1: Scrape LinkedIn
        const jobs = await scrapeLinkedInJobs();

        // Step 2: Save to staging table
        await saveToDatabase(jobs);

        // Step 3: AI validation
        await processUnvalidatedJobs();

        // Step 4: Post approved jobs to listings
        const posted = await postApprovedToListings();

        // Step 5: Cleanup old data
        await cleanup();

        console.log('='.repeat(50));
        console.log(`Complete! Posted ${posted} new listings.`);
        console.log('='.repeat(50));
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main();
