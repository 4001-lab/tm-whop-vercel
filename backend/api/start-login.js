import jwt from 'jsonwebtoken';
import { pool, initDatabase } from '../lib/database.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }



  const { sessionToken, eventUrls, credentials } = req.body;

  try {
    await initDatabase();
    
    // Verify session first
    jwt.verify(sessionToken, process.env.JWT_SECRET);

    const sessionResult = await pool.query(`
      SELECT s.*, u.subscription_status, u.whop_user_id
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = $1 AND s.expires_at > CURRENT_TIMESTAMP
    `, [sessionToken]);

    if (sessionResult.rows.length === 0 || sessionResult.rows[0].subscription_status !== 'active') {
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
      userId: sessionResult.rows[0].whop_user_id
    };

    res.json({ success: true, data: processedData });
  } catch (error) {
    console.error('Extension start error:', error);
    res.status(401).json({ error: 'Invalid session' });
  }
}