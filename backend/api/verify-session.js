require('dotenv').config();
const jwt = require('jsonwebtoken');
const { pool, initDatabase } = require('../lib/database');

let lastCleanup = 0;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

module.exports = async function handler(req, res) {
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
    await initDatabase();
    
    // Only run cleanup every 5 minutes
    const now = Date.now();
    if (now - lastCleanup > CLEANUP_INTERVAL) {
      await pool.query('DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP');
      lastCleanup = now;
    }
    
    const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET);

    const sessionResult = await pool.query(`
      SELECT s.*, u.subscription_status, u.whop_user_id, u.username
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = $1 AND s.expires_at > CURRENT_TIMESTAMP
    `, [sessionToken]);

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ valid: false, error: 'Invalid or expired session' });
    }

    const session = sessionResult.rows[0];

    if (session.subscription_status !== 'active') {
      return res.status(403).json({ valid: false, error: 'Subscription not active' });
    }

    await pool.query(`
      DELETE FROM sessions 
      WHERE user_id = (SELECT user_id FROM sessions WHERE session_token = $1) 
      AND session_token != $1
    `, [sessionToken]);

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