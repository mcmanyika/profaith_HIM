import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://evvgpmryhbmljdxjuxth.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.warn('Supabase Anon Key is missing. Please set EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
