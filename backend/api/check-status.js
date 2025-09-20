import { createClient } from '@supabase/supabase-js';
import { ensureTables } from '../lib/ensure-tables.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const sessionId = req.headers['x-session-id'] || req.ip || req.headers['x-forwarded-for'] || 'default';
  
  if (req.method === 'GET') {
    await ensureTables();
    
    // Clean up expired sessions
    await supabase
      .from('auth_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    const { data: authData, error } = await supabase
      .from('auth_sessions')
      .select('auth_data')
      .eq('session_id', sessionId)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (authData && !error) {
      res.json(authData.auth_data);
    } else {
      res.json({ status: 'pending' });
    }
  } else if (req.method === 'POST') {
    await supabase
      .from('auth_sessions')
      .delete()
      .eq('session_id', sessionId);
    res.json({ success: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}