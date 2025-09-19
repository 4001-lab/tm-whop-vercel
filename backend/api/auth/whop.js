const { WhopServerSdk } = require('@whop/api');
const authStorage = require('../../lib/auth-storage');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate required environment variables
    if (!process.env.WHOP_API_KEY || !process.env.WHOP_APP_ID || !process.env.WHOP_REDIRECT_URI) {
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
    await authStorage.set(state, { status: 'pending' });

    res.json({ authUrl: url, state });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
