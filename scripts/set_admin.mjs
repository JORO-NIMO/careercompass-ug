import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL; // pass ADMIN_EMAIL or provide on CLI

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: {
    persistSession: false,
  },
});

async function makeAdminByEmail(email) {
  // find profile by email
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (pErr) {
    console.error('Error finding profile:', pErr);
    process.exit(1);
  }

  if (!profile || !profile.id) {
    console.error('No profile found for email:', email);
    process.exit(1);
  }

  // insert admin role
  const { data, error } = await supabase
    .from('user_roles')
    .insert([{ user_id: profile.id, role: 'admin' }]);

  if (error) {
    console.error('Error inserting admin role:', error);
    process.exit(1);
  }

  console.log('Admin role assigned to', email);
}

const email = ADMIN_EMAIL || process.argv[2];
if (!email) {
  console.error('Usage: ADMIN_EMAIL=foo@bar.com SUPABASE_SERVICE_ROLE_KEY=... VITE_SUPABASE_URL=... node scripts/set_admin.mjs');
  process.exit(1);
}

makeAdminByEmail(email).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
