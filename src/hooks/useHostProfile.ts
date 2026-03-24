import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

interface Profile {
    id: string
    nom: string
    email: string
    role: 'user' | 'host' | 'admin' | null
    company_name: string | null
    created_at: string | null
}

interface UseHostProfileReturn {
    user: User | null
    profile: Profile | null
    isHost: boolean
    loading: boolean
    refreshProfile: () => Promise<void>
}

export function useHostProfile(): UseHostProfileReturn {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchProfile = useCallback(async (userId: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (data) {
            setProfile(data as Profile)
        }
    }, [])

    const refreshProfile = useCallback(async () => {
        if (user) {
            await fetchProfile(user.id)
        }
    }, [user, fetchProfile])

    useEffect(() => {
        async function init() {
            const { data: authData } = await supabase.auth.getSession()
            const currentUser = authData.session?.user ?? null
            setUser(currentUser)

            if (currentUser) {
                await fetchProfile(currentUser.id)
            }
            setLoading(false)
        }

        init()

        const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const newUser = session?.user ?? null
            setUser(newUser)
            if (newUser) {
                await fetchProfile(newUser.id)
            } else {
                setProfile(null)
            }
        })

        return () => {
            listener.subscription.unsubscribe()
        }
    }, [fetchProfile])

    return {
        user,
        profile,
        isHost: profile?.role === 'host',
        loading,
        refreshProfile,
    }
}
