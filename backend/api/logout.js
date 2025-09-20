import jwt from 'jsonwebtoken';
import { pool, initDatabase } from '../lib/database.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionToken } = req.body;

  try {
    await initDatabase();
    
    if (sessionToken) {
      const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET);
      
      await pool.query('DELETE FROM sessions WHERE session_token = $1', [sessionToken]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({ success: true }); // success for logout
  }
}