const { pool, initDatabase } = require('../lib/database');

module.exports = async function handler(req, res) {
  try {
    await initDatabase();
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({ 
      success: true, 
      database_connected: true,
      current_time: result.rows[0].current_time 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      database_connected: false 
    });
  }
}