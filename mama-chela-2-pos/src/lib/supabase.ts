import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://mmbghtefjtihzwilmjah.supabase.co'

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_bzMXtqA-WIDRhaeV20Sgiw_cR6eh3QP'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)