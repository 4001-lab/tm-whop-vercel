// Temporary storage for auth status with expiration
const tempAuthStorage = new Map();
const MAX_SESSIONS = 1000;
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, data] of tempAuthStorage) {
    if (data.timestamp && now - data.timestamp > SESSION_TIMEOUT) {
      tempAuthStorage.delete(sessionId);
    }
  }
  
  // Enforce size limit
  if (tempAuthStorage.size > MAX_SESSIONS) {
    const entries = Array.from(tempAuthStorage.entries());
    const toDelete = entries.slice(0, entries.length - MAX_SESSIONS);
    toDelete.forEach(([sessionId]) => tempAuthStorage.delete(sessionId));
  }
}

export default async function handler(req, res) {
  cleanupExpiredSessions();
  
  const sessionId = req.headers['x-session-id'] || req.ip;
  
  if (req.method === 'GET') {
    const authData = tempAuthStorage.get(sessionId);
    if (authData) {
      const { timestamp, ...data } = authData;
      res.json(data);
    } else {
      res.json({ status: 'pending' });
    }
  } else if (req.method === 'POST') {
    tempAuthStorage.delete(sessionId);
    res.json({ success: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}