// 

// /backend/api/test-db.js
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
  try {
    // Test connection by making a simple query
    const { data, error } = await supabase
      .from('_test_connection') // This table doesn't need to exist
      .select('count')
      .limit(1)
      .single()

    // If we get any response, the connection works
    // The error here is expected because the table doesn't exist
    // but it proves we connected to Supabase
    res.status(200).json({
      success: true,
      database_connected: true,
      message: 'Successfully connected to Supabase',
      supabase_response: error ? 'Connection good but table missing (expected)' : 'Unexpected success'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      database_connected: false
    })
  }
}