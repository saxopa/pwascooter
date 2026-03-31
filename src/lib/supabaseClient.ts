import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase env variables. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
    )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        flowType: 'pkce',
        detectSessionInUrl: false,
        persistSession: true,
    },
})
