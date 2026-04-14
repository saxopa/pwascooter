import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase env variables. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
    )
}

// Main client — full auth (session restore, token refresh, auth lock)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        flowType: 'implicit',
        detectSessionInUrl: true,
        persistSession: true,
    },
})

// Lightweight read-only client for public data (hosts map).
// No auth init → no auth lock → instant query on page refresh.
// Uses anon key only — relies on hosts_select_public RLS policy.
//
// IMPORTANT: storageKey must differ from the main client.
// Both clients run in the same tab → same Web Lock namespace by default
// → supabasePublic would block refreshSession() in invokeAuthedFunction.
export const supabasePublic = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        storageKey: 'sb-public-anon-no-lock',
    },
})
