// Deno Edge Function: parse-cv
// Parses uploaded CV (PDF/DOCX) and extracts structured data + generates embedding

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParseCVRequest {
  userId: string;
  cvUrl: string;
}

interface CVData {
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills: string[];
  experience: {
    title: string;
    company: string;
    duration?: string;
    description?: string;
  }[];
  education: {
    degree: string;
    institution: string;
    year?: string;
  }[];
  experience_years: number;
  education_level: string;
}

// Extract text from PDF using external service or simple regex
async function extractTextFromPDF(url: string): Promise<string> {
  // In production, use a service like pdf.co, Adobe PDF Services, or self-hosted pdftotext
  // For now, we'll use a simple fetch and assume text-based PDF or use LLM vision
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  
  // Convert to base64 for LLM processing
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return base64;
}

// Parse CV using LLM
async function parseWithLLM(cvText: string, openaiKey: string): Promise<CVData> {
  const systemPrompt = `You are a CV/resume parser. Extract structured information from the CV text provided.
Return a JSON object with these fields:
- full_name: string
- email: string
- phone: string
- location: string (city/country)
- summary: string (brief professional summary)
- skills: string[] (list of technical and soft skills)
- experience: array of {title, company, duration, description}
- education: array of {degree, institution, year}
- experience_years: number (total years of work experience, estimate if needed)
- education_level: string (one of: "High School", "Diploma", "Bachelor's", "Master's", "PhD", "Other")

Be thorough but concise. If information is not available, use empty string or empty array.`;

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
        { role: 'user', content: `Parse this CV:\n\n${cvText}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('Failed to parse CV with LLM');
  }

  return JSON.parse(content) as CVData;
}

// Generate embedding for profile
async function generateEmbedding(text: string, openaiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536,
    }),
  });

  const data = await response.json();
  return data.data?.[0]?.embedding;
}

// Create profile text for embedding
function createProfileText(cvData: CVData): string {
  const parts = [];
  
  if (cvData.summary) {
    parts.push(`Summary: ${cvData.summary}`);
  }
  
  if (cvData.skills.length > 0) {
    parts.push(`Skills: ${cvData.skills.join(', ')}`);
  }
  
  if (cvData.experience.length > 0) {
    const expText = cvData.experience
      .map(e => `${e.title} at ${e.company}`)
      .join('; ');
    parts.push(`Experience: ${expText}`);
  }
  
  if (cvData.education.length > 0) {
    const eduText = cvData.education
      .map(e => `${e.degree} from ${e.institution}`)
      .join('; ');
    parts.push(`Education: ${eduText}`);
  }
  
  parts.push(`Experience: ${cvData.experience_years} years`);
  parts.push(`Education Level: ${cvData.education_level}`);
  
  return parts.join('\n');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, cvUrl } = (await req.json()) as ParseCVRequest;

    if (!userId || !cvUrl) {
      throw new Error('userId and cvUrl are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user owns this request
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user?.id !== userId) {
        throw new Error('Unauthorized: can only parse own CV');
      }
    }

    // Download and extract CV text
    console.log('Downloading CV from:', cvUrl);
    const cvResponse = await fetch(cvUrl);
    const cvText = await cvResponse.text();

    let cvData: CVData;
    let embedding: number[] | null = null;

    if (openaiKey) {
      // Parse with LLM
      console.log('Parsing CV with LLM...');
      cvData = await parseWithLLM(cvText, openaiKey);

      // Generate embedding
      console.log('Generating embedding...');
      const profileText = createProfileText(cvData);
      embedding = await generateEmbedding(profileText, openaiKey);
    } else {
      // Basic parsing without LLM
      console.log('No OpenAI key, using basic parsing...');
      cvData = {
        skills: [],
        experience: [],
        education: [],
        experience_years: 0,
        education_level: 'Other',
      };

      // Simple skill extraction
      const skillKeywords = [
        'python', 'javascript', 'typescript', 'react', 'node', 'sql',
        'java', 'c++', 'excel', 'communication', 'leadership', 'management',
        'marketing', 'sales', 'design', 'analytics', 'accounting'
      ];
      
      const lowerText = cvText.toLowerCase();
      cvData.skills = skillKeywords.filter(s => lowerText.includes(s));
    }

    // Update profile in database
    console.log('Updating profile...');
    const { data, error } = await supabase.rpc('update_profile_cv', {
      p_user_id: userId,
      p_cv_url: cvUrl,
      p_cv_data: cvData,
      p_skills: cvData.skills,
      p_experience_years: cvData.experience_years,
      p_education_level: cvData.education_level,
      p_embedding: embedding ? `[${embedding.join(',')}]` : null,
    });

    if (error) throw error;

    // Log success
    await supabase.from('workflow_logs').insert({
      workflow_name: 'cv-parser',
      status: 'completed',
      completed_at: new Date().toISOString(),
      items_processed: 1,
      items_succeeded: 1,
      metadata: { user_id: userId, skills_count: cvData.skills.length },
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          skills: cvData.skills,
          experience_years: cvData.experience_years,
          education_level: cvData.education_level,
          has_embedding: !!embedding,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('CV parsing error:', error);

    // Log failure
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('workflow_logs').insert({
        workflow_name: 'cv-parser',
        status: 'failed',
        completed_at: new Date().toISOString(),
        items_processed: 1,
        items_failed: 1,
        error_message: (error as Error).message,
      });
    }

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
