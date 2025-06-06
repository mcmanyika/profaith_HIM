import { createClient } from '@supabase/supabase-js'

// Use environment variables for Supabase URL and Key.
// In your project root, create .env.local for development and .env.production for production.
// Example .env.local:
// NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
// NEXT_PUBLIC_SUPABASE_ANON_KEY=dev-anon-key
// Example .env.production:
// NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
// NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create a single instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey) 