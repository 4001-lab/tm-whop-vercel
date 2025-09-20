import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let lastCleanup = 0;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ valid: false, error: 'Invalid request body' });
  }

  const { sessionToken } = req.body;

  if (!sessionToken || typeof sessionToken !== 'string') {
    return res.status(400).json({ valid: false, error: 'Valid session token required' });
  }

  try {
    // Cleanup expired sessions
    const now = Date.now();
    if (now - lastCleanup > CLEANUP_INTERVAL) {
      await supabase
        .from('sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());
      lastCleanup = now;
    }
    
    const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET);

    const { data: sessions, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        users!inner(
          subscription_status,
          whop_user_id,
          username
        )
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !sessions) {
      return res.status(401).json({ valid: false, error: 'Invalid or expired session' });
    }

    const session = { ...sessions, ...sessions.users };

    if (session.subscription_status !== 'active') {
      return res.status(403).json({ valid: false, error: 'Subscription not active' });
    }

    await supabase
      .from('sessions')
      .delete()
      .eq('user_id', sessions.user_id)
      .neq('session_token', sessionToken);

    res.json({
      valid: true,
      user: {
        id: session.whop_user_id,
        username: session.username
      }
    });
  } catch (error) {
    console.error('Session verification error:', error);
    res.status(401).json({ valid: false, error: 'Invalid session token' });
  }
}