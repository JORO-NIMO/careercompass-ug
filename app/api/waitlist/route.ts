import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.json();
  const { full_name, email, phone, field_of_study, country } = body;

  if (!full_name || !email) {
    return NextResponse.json({ error: 'Full name and email are required.' }, { status: 400 });
  }

  const { error } = await supabase.from('waitlist_students').insert([
    { full_name, email, phone, field_of_study, country }
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
