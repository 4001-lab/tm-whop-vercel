import { WhopServerSdk } from '@whop/api';
import { createClient } from '@supabase/supabase-js';

let supabase;
try {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
} catch (error) {
  console.error('Supabase initialization error:', error);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate required environment variables
    if (!process.env.WHOP_API_KEY || !process.env.WHOP_APP_ID || !process.env.WHOP_REDIRECT_URI || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Missing required environment variables' });
    }

    const whopApi = WhopServerSdk({
      appApiKey: process.env.WHOP_API_KEY,
      appId: process.env.WHOP_APP_ID,
    });

    const { url, state } = whopApi.oauth.getAuthorizationUrl({
      redirectUri: process.env.WHOP_REDIRECT_URI,
      scope: ['read_user'],
    });

    // Store state for later verification
    await supabase
      .from('auth_sessions')
      .upsert({
        session_id: state,
        auth_data: { status: 'pending' },
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      });

    res.json({ authUrl: url, state });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
