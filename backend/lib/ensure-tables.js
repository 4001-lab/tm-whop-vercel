import { createClient } from '@supabase/supabase-js';

let tablesCreated = false;

export async function ensureTables() {
  if (tablesCreated) return;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Try to create tables using direct SQL
    const { error } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          whop_user_id VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255),
          username VARCHAR(255),
          subscription_status VARCHAR(50) DEFAULT 'inactive',
          access_token TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          session_token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS auth_sessions (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(255) UNIQUE NOT NULL,
          auth_data JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL
        );
      `
    });

    if (error) {
      console.error('Table creation error:', error);
    } else {
      console.log('Tables ensured successfully');
      tablesCreated = true;
    }
  } catch (error) {
    console.error('Table creation error:', error);
  }
}