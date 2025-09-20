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

  const { sessionToken } = req.body;

  try {
    if (sessionToken) {
      const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET);
      
      await supabase
        .from('sessions')
        .delete()
        .eq('session_token', sessionToken);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({ success: true }); // success for logout
  }
}