import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }



  const { sessionToken, eventUrls, credentials } = req.body;

  try {
    // Verify session first
    jwt.verify(sessionToken, process.env.JWT_SECRET);

    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        users!inner(
          subscription_status,
          whop_user_id
        )
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !sessionData || sessionData.users.subscription_status !== 'active') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Validate inputs
    if (!eventUrls || !credentials || eventUrls.length === 0 || credentials.length === 0) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    // Process and return validated data for extension
    const processedData = {
      eventUrls: eventUrls.filter(url => url.trim() !== ''),
      credentials: credentials.filter(cred => cred.trim() !== '').map(line => line.split(/\s+/)),
      userId: sessionData.users.whop_user_id
    };

    res.json({ success: true, data: processedData });
  } catch (error) {
    console.error('Extension start error:', error);
    res.status(401).json({ error: 'Invalid session' });
  }
}