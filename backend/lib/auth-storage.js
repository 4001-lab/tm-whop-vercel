import { pool } from './database.js';

let lastCleanup = 0;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

const authStorage = {
  set: async (sessionId, authData) => {
    try {
      await pool.query(`
        INSERT INTO auth_sessions (session_id, auth_data, expires_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '10 minutes')
        ON CONFLICT (session_id) 
        DO UPDATE SET auth_data = $2, expires_at = CURRENT_TIMESTAMP + INTERVAL '10 minutes'
      `, [sessionId, authData]);
    } catch (error) {
      console.error('Auth storage set error:', error);
      throw error;
    }
  },

  get: async (sessionId) => {
    try {
      // Only run cleanup every 5 minutes
      const now = Date.now();
      if (now - lastCleanup > CLEANUP_INTERVAL) {
        await pool.query(`DELETE FROM auth_sessions WHERE expires_at < CURRENT_TIMESTAMP`);
        lastCleanup = now;
      }
      
      const result = await pool.query(
        `SELECT auth_data FROM auth_sessions WHERE session_id = $1`,
        [sessionId]
      );
      
      return result.rows[0]?.auth_data;
    } catch (error) {
      console.error('Auth storage get error:', error);
      throw error;
    }
  },

  delete: async (sessionId) => {
    try {
      await pool.query(`DELETE FROM auth_sessions WHERE session_id = $1`, [sessionId]);
    } catch (error) {
      console.error('Auth storage delete error:', error);
      throw error;
    }
  }
};

export default authStorage;