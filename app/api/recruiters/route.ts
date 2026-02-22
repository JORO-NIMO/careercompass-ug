import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.json();
  const { company_name, email, roles_hiring } = body;

  if (!company_name || !email) {
    return NextResponse.json({ error: 'Company name and email are required.' }, { status: 400 });
  }

  const { error } = await supabase.from('recruiter_requests').insert([
    { company_name, email, roles_hiring }
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
