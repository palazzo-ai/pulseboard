import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lwmlagsqdckfmlrdkkjo.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3bWxhZ3NxZGNrZm1scmRra2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMjg1NzAsImV4cCI6MjA4MDkwNDU3MH0.MrPDMBzgkH9WKNxzdgwzPAQbECQrXwzK8HIVxmumOAQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
