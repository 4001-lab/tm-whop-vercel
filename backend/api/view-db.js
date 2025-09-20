import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const { data: users } = await supabase.from('users').select('*');
    const { data: sessions } = await supabase.from('sessions').select('*');
    const { data: authSessions } = await supabase.from('auth_sessions').select('*');

    res.json({
      users: users || [],
      sessions: sessions || [],
      auth_sessions: authSessions || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}