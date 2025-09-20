// import { Pool } from 'pg';

// // Use connection string for Vercel environment
// if (!process.env.POSTGRES_URL) {
//   throw new Error('POSTGRES_URL environment variable is not set');
// }
// const pool = new Pool({
//   connectionString: process.env.POSTGRES_URL,
//   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
// });


// const initDatabase = async () => {
//   try {
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS users (
//         id SERIAL PRIMARY KEY,
//         whop_user_id VARCHAR(255) UNIQUE NOT NULL,
//         email VARCHAR(255),
//         username VARCHAR(255),
//         subscription_status VARCHAR(50) DEFAULT 'inactive',
//         access_token TEXT,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       )
//     `);

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS sessions (
//         id SERIAL PRIMARY KEY,
//         user_id INTEGER REFERENCES users(id),
//         session_token VARCHAR(255) UNIQUE NOT NULL,
//         expires_at TIMESTAMP NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       )
//     `);

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS auth_sessions (
//         id SERIAL PRIMARY KEY,
//         session_id VARCHAR(255) UNIQUE NOT NULL,
//         auth_data JSONB,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         expires_at TIMESTAMP NOT NULL
//       )
//     `);

//     console.log('Database initialized successfully');
//   } catch (error) {
//     console.error('Database initialization error:', error);
//     throw error;
//   }
// };

// export { pool, initDatabase };

// Use the Supabase client designed for serverless environments
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL; // Your Supabase project URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use the service role key for backend operations

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase environment variables are not set');
}

// This client handles connection pooling and SSL issues automatically
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Not needed for serverless
    autoRefreshToken: false,
  },
});

// Helper function to get a direct Postgres client for raw SQL
// Note: This uses the Supabase connection pool which handles SSL correctly
const getDatabase = () => supabase;

// Your init function adapted for Supabase
const initDatabase = async () => {
  try {
    // Execute raw SQL through Supabase
    const { error: usersError } = await supabase.rpc('exec_sql', {
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
        )
      `
    });

        await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        auth_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      )
    `);

    // Similar for other tables...
    if (usersError) throw usersError;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

export { supabase as pool, initDatabase, getDatabase };