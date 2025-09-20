import jwt from 'jsonwebtoken';
import { WhopServerSdk } from '@whop/api';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const whopApi = WhopServerSdk({
  appApiKey: process.env.WHOP_API_KEY,
  appId: process.env.WHOP_APP_ID,
});

// Temporary storage for auth status with TTL cleanup
const tempAuthStorage = new Map();
const STORAGE_TTL = 5 * 60 * 1000; // 5 minutes

// Cleanup expired entries
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, value] of tempAuthStorage.entries()) {
    if (value.expires && now > value.expires) {
      tempAuthStorage.delete(key);
    }
  }
}

// Set entry with expiration
function setTempAuth(key, data) {
  cleanupExpiredEntries();
  tempAuthStorage.set(key, { ...data, expires: Date.now() + STORAGE_TTL });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state } = req.query;

  try {
    // Supabase tables should already exist

    const authResponse = await whopApi.oauth.exchangeCode({
      code,
      redirectUri: process.env.WHOP_REDIRECT_URI,
    });

    if (!authResponse.ok) {
      throw new Error('Code exchange failed');
    }
    const { access_token } = authResponse.tokens;

    const tokenParts = access_token.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    const userId = payload.sub;

    const userData = {
      id: userId,
      email: payload.email || '',
      username: payload.username || `user_${userId.slice(-8)}`
    };

    const authenticatedSdk = WhopServerSdk({
      appApiKey: process.env.WHOP_API_KEY,
      appId: process.env.WHOP_APP_ID,
      onBehalfOfUserId: userId,
    });

    let hasActiveSubscription = false;

    try {
      const check = await authenticatedSdk.access.checkIfUserHasAccessToAccessPass({
        accessPassId: process.env.WHOP_ACCESS_PASS_ID, 
        userId: userId,
      });

      hasActiveSubscription = check.hasAccess;
    } catch (err) {
      console.error('Access check failed:', err);
      hasActiveSubscription = false;
    }

    const { error: upsertError } = await supabase
      .from('users')
      .upsert({
        whop_user_id: userId,
        email: userData.email,
        username: userData.username,
        subscription_status: hasActiveSubscription ? 'active' : 'inactive',
        access_token: access_token,
        updated_at: new Date().toISOString()
      });
    
    if (upsertError) throw upsertError;

    if (hasActiveSubscription) {
      const sessionToken = jwt.sign({ userId: userId }, process.env.JWT_SECRET, { expiresIn: '24h' });

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('whop_user_id', userId)
        .single();
      
      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: userData.id,
          session_token: sessionToken,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      
      if (sessionError) throw sessionError;

      const sessionId = req.ip;
      setTempAuth(sessionId, {
        sessionToken,
        user: { id: userId, username: userData.username, email: userData.email }
      });
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Login Successful</title></head>
        <body>
          <div style="padding: 20px; text-align: center; font-family: Arial;">
            <h2>Login Successful!</h2>
            <p>You can close this window.</p>
          </div>
          <script>
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
        </html>
      `);
    } else {
      const sessionId = req.ip;
      setTempAuth(sessionId, {
        error: 'No active subscription found'
      });
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Access Denied</title></head>
        <body>
          <div style="padding: 20px; text-align: center; font-family: Arial; color: red;">
            <h2>Access Denied</h2>
            <p>No active subscription found.</p>
          </div>
          <script>
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('OAuth callback error:', error);
    const sessionId = req.ip;
    setTempAuth(sessionId, {
      error: 'Authentication failed'
    });
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Authentication Failed</title></head>
      <body>
        <div style="padding: 20px; text-align: center; font-family: Arial; color: red;">
          <h2>Authentication Failed</h2>
          <p>Please try again.</p>
        </div>
        <script>
          setTimeout(() => window.close(), 3000);
        </script>
      </body>
      </html>
    `);
  }
}