import { createClient } from '@supabase/supabase-js';

let tablesCreated = false;

export async function ensureTables() {
  // Skip automatic table creation - tables should be created manually in Supabase dashboard
  return;
}