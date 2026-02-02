// Deno Edge Function: parse-email
// Parses incoming emails/newsletters to extract job postings

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParseEmailRequest {
  messageId: string;
  from: string;
  to?: string;
  subject: string;
  textContent: string;
  htmlContent?: string;
  receivedAt: string;
}

interface ExtractedJob {
  position_title: string;
  company_name: string;
  location?: string;
  description?: string;
  application_link?: string;
  deadline?: string;
  salary?: string;
  confidence: number;
}

// Extract jobs using LLM
async function extractJobsWithLLM(
  content: string,
  subject: string,
  openaiKey: string
): Promise<ExtractedJob[]> {
  const systemPrompt = `You are a job posting extractor. Analyze the email content and extract all job postings.

For each job found, extract:
- position_title: The job title
- company_name: The hiring company
- location: City/region/country (if mentioned)
- description: Brief job description (max 200 chars)
- application_link: URL to apply (if present)
- deadline: Application deadline (if mentioned)
- salary: Salary/stipend info (if mentioned)
- confidence: Your confidence 0-1 that this is a real job posting

Return a JSON array of job objects. If no jobs are found, return an empty array.
Focus on jobs in East Africa (Uganda, Kenya, Tanzania, Rwanda) but include remote/global positions too.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Subject: ${subject}\n\nEmail Content:\n${content.substring(0, 10000)}` 
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
    }),
  });

  const data = await response.json();
  const result = JSON.parse(data.choices?.[0]?.message?.content || '{"jobs": []}');
  
  return result.jobs || [];
}

// Basic extraction without LLM (pattern matching)
function extractJobsBasic(content: string, subject: string): ExtractedJob[] {
  const jobs: ExtractedJob[] = [];
  
  // Common job-related patterns
  const jobPatterns = [
    /(?:hiring|vacancy|opening|position|job|opportunity|role)[\s:]+([^.!?\n]{10,100})/gi,
    /(?:we are looking for|seeking|wanted)[\s:]+(?:a |an )?([^.!?\n]{5,80})/gi,
  ];

  const companyPatterns = [
    /(?:at|with|for|company|organization)[\s:]+([A-Z][a-zA-Z\s&]{3,50})/g,
  ];

  // Extract potential job titles from subject
  if (subject.toLowerCase().includes('job') || 
      subject.toLowerCase().includes('hiring') ||
      subject.toLowerCase().includes('vacancy')) {
    const titleMatch = subject.match(/(?:job|hiring|vacancy|position)[\s:]+(.+)/i);
    if (titleMatch) {
      jobs.push({
        position_title: titleMatch[1].trim().substring(0, 100),
        company_name: 'Unknown',
        confidence: 0.4,
      });
    }
  }

  // Extract URLs that might be application links
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const urls = content.match(urlPattern) || [];
  const applicationUrl = urls.find(u => 
    u.includes('apply') || 
    u.includes('career') || 
    u.includes('job') ||
    u.includes('vacancy')
  );

  // Add application link to first job if found
  if (jobs.length > 0 && applicationUrl) {
    jobs[0].application_link = applicationUrl;
  }

  return jobs;
}

// Verify and dedupe jobs against existing placements
async function verifyAndDedupeJobs(
  jobs: ExtractedJob[],
  supabase: ReturnType<typeof createClient>,
  trustScore: number
): Promise<{ verified: ExtractedJob[]; duplicates: number }> {
  const verified: ExtractedJob[] = [];
  let duplicates = 0;

  for (const job of jobs) {
    // Skip low confidence jobs from low trust sources
    if (job.confidence < 0.5 && trustScore < 0.7) {
      continue;
    }

    // Check for duplicates
    const { data: existing } = await supabase
      .from('placements')
      .select('id')
      .ilike('position_title', `%${job.position_title.substring(0, 50)}%`)
      .ilike('company_name', `%${job.company_name.substring(0, 30)}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      duplicates++;
      continue;
    }

    verified.push(job);
  }

  return { verified, duplicates };
}

// Insert verified jobs as placements
async function insertPlacements(
  jobs: ExtractedJob[],
  supabase: ReturnType<typeof createClient>,
  sourceEmailId: UUID
): Promise<number> {
  let inserted = 0;

  for (const job of jobs) {
    try {
      const { error } = await supabase.from('placements').insert({
        position_title: job.position_title,
        company_name: job.company_name,
        description: job.description || `Position at ${job.company_name}`,
        region: job.location || 'Not specified',
        industry: 'Various',
        stipend: job.salary || 'Not specified',
        application_link: job.application_link,
        deadline: job.deadline ? new Date(job.deadline).toISOString() : null,
        available_slots: 1,
        approved: false, // Require manual approval
        source: 'email_ingestion',
        source_metadata: { email_id: sourceEmailId, confidence: job.confidence },
      });

      if (!error) {
        inserted++;
      }
    } catch (err) {
      console.error('Failed to insert job:', err);
    }
  }

  return inserted;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const payload = (await req.json()) as ParseEmailRequest;
    const { messageId, from, to, subject, textContent, htmlContent, receivedAt } = payload;

    if (!messageId || !from || !subject) {
      throw new Error('messageId, from, and subject are required');
    }

    console.log(`Processing email from ${from}: ${subject}`);

    // Record the email
    const { data: emailIdData } = await supabase.rpc('record_ingested_email', {
      p_message_id: messageId,
      p_from_address: from,
      p_to_address: to || null,
      p_subject: subject,
      p_received_at: receivedAt || new Date().toISOString(),
      p_raw_content: textContent?.substring(0, 50000),
      p_metadata: { has_html: !!htmlContent },
    });

    const emailId = emailIdData as string;

    // Get trust score
    const { data: trustScore } = await supabase.rpc('get_email_trust_score', {
      p_from_address: from,
    });

    console.log(`Email ${emailId} from ${from}, trust score: ${trustScore}`);

    // Skip very low trust sources
    if (trustScore < 0.2) {
      await supabase.rpc('update_email_processing', {
        p_email_id: emailId,
        p_status: 'skipped',
        p_error_message: 'Source trust score too low',
      });

      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'low_trust' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract jobs
    const content = textContent || htmlContent || '';
    let extractedJobs: ExtractedJob[] = [];

    if (openaiKey) {
      extractedJobs = await extractJobsWithLLM(content, subject, openaiKey);
    } else {
      extractedJobs = extractJobsBasic(content, subject);
    }

    console.log(`Extracted ${extractedJobs.length} potential jobs`);

    if (extractedJobs.length === 0) {
      await supabase.rpc('update_email_processing', {
        p_email_id: emailId,
        p_status: 'completed',
        p_jobs_extracted: 0,
      });

      return new Response(
        JSON.stringify({ success: true, jobs_extracted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify and dedupe
    const { verified, duplicates } = await verifyAndDedupeJobs(
      extractedJobs, 
      supabase, 
      trustScore
    );

    console.log(`Verified: ${verified.length}, Duplicates: ${duplicates}`);

    // Insert verified jobs
    const inserted = await insertPlacements(verified, supabase, emailId);

    // Update processing status
    await supabase.rpc('update_email_processing', {
      p_email_id: emailId,
      p_status: 'completed',
      p_parsed_jobs: extractedJobs,
      p_jobs_extracted: extractedJobs.length,
      p_jobs_verified: verified.length,
      p_jobs_inserted: inserted,
    });

    // Log to workflow_logs
    await supabase.from('workflow_logs').insert({
      workflow_name: 'email-ingestion',
      status: 'completed',
      completed_at: new Date().toISOString(),
      items_processed: 1,
      items_succeeded: inserted,
      items_failed: extractedJobs.length - inserted,
      metadata: { email_id: emailId, from, subject: subject.substring(0, 100) },
    });

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailId,
        jobs_extracted: extractedJobs.length,
        jobs_verified: verified.length,
        jobs_inserted: inserted,
        duplicates_skipped: duplicates,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Email parsing error:', error);

    // Log failure
    await supabase.from('workflow_logs').insert({
      workflow_name: 'email-ingestion',
      status: 'failed',
      completed_at: new Date().toISOString(),
      items_processed: 1,
      items_failed: 1,
      error_message: (error as Error).message,
    });

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
