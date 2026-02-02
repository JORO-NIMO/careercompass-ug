import OpenAI from 'openai';
import { CONFIG } from './config.js';

interface JobData {
    title: string;
    company: string;
    location: string | null;
    description: string;
    job_url: string;
}

interface ValidationResult {
    approved: boolean;
    relevanceScore: number;
    analysis: {
        deadline: string | null;
        salary: string | null;
        skills: string[];
        jobType: string | null;
    };
    fraudFlags: string[];
    rejectionReason: string | null;
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Check for obvious fraud indicators before calling AI
function checkFraudIndicators(description: string): string[] {
    const lowerDesc = description.toLowerCase();
    return CONFIG.fraudIndicators.filter(indicator =>
        lowerDesc.includes(indicator.toLowerCase())
    );
}

export async function validateJob(job: JobData): Promise<ValidationResult> {
    // Pre-check for fraud
    const fraudFlags = checkFraudIndicators(job.description);

    if (fraudFlags.length >= 2) {
        return {
            approved: false,
            relevanceScore: 0,
            analysis: { deadline: null, salary: null, skills: [], jobType: null },
            fraudFlags,
            rejectionReason: `Multiple fraud indicators detected: ${fraudFlags.join(', ')}`,
        };
    }

    const prompt = `Analyze this job posting and extract structured data. Be factual - only extract information explicitly stated.
  Focus on relevance for Ugandan students and graduates. Consider local districts (Kampala, Entebbe, Wakiso, Jinja, etc.) and specific Ugandan universities/institutions if mentioned.

Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location || 'Not specified'}
Description: ${job.description.slice(0, 2000)}

Return a JSON object with:
{
  "relevanceScore": number (0-100, how relevant for Ugandan students/graduates seeking internships or entry-level positions),
  "deadline": string or null (application deadline if mentioned),
  "salary": string or null (salary/stipend if mentioned, specify currency if known like UGX),
  "skills": string[] (required skills, max 5),
  "jobType": string or null (internship/graduate trainee/full-time/part-time),
  "isLegitimate": boolean (false if scam indicators like unrealistic promises, upfront payments, non-official email addresses),
  "fraudConcerns": string[] (any suspicious elements)
}`;

    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await openai.chat.completions.create({
                model: CONFIG.ai.model,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                max_tokens: CONFIG.ai.maxTokens,
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                return {
                    approved: false,
                    relevanceScore: 0,
                    analysis: { deadline: null, salary: null, skills: [], jobType: null },
                    fraudFlags: [],
                    rejectionReason: 'AI response empty',
                };
            }

            const parsed = JSON.parse(content);
            const allFraudFlags = [...fraudFlags, ...(parsed.fraudConcerns || [])];
            const isLegit = parsed.isLegitimate !== false && allFraudFlags.length < 2;
            const meetsThreshold = parsed.relevanceScore >= CONFIG.ai.minRelevanceScore;

            return {
                approved: isLegit && meetsThreshold,
                relevanceScore: parsed.relevanceScore || 0,
                analysis: {
                    deadline: parsed.deadline || null,
                    salary: parsed.salary || null,
                    skills: parsed.skills || [],
                    jobType: parsed.jobType || null,
                },
                fraudFlags: allFraudFlags,
                rejectionReason: !isLegit
                    ? 'Potential fraud detected'
                    : !meetsThreshold
                        ? `Relevance score ${parsed.relevanceScore} below threshold ${CONFIG.ai.minRelevanceScore}`
                        : null,
            };
        } catch (error) {
            console.error(`AI validation error (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // Exponential backoff
                continue;
            }
            return {
                approved: false,
                relevanceScore: 0,
                analysis: { deadline: null, salary: null, skills: [], jobType: null },
                fraudFlags: [],
                rejectionReason: `AI error after ${maxRetries + 1} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    // TypeScript requires a return here even though all paths above return
    return {
        approved: false,
        relevanceScore: 0,
        analysis: { deadline: null, salary: null, skills: [], jobType: null },
        fraudFlags: [],
        rejectionReason: 'Unexpected error in retry loop',
    };
}
