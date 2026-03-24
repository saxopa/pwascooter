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

    const fetchProfile = useCallback(async (currentUser: User) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()

        if (data) {
            setProfile(data as Profile)
            return
        }

        const isMissingProfile = error?.code === 'PGRST116'
        if (!isMissingProfile) return

        const metadata = currentUser.user_metadata ?? {}
        const fallbackName =
            metadata.nom ??
            metadata.full_name ??
            metadata.name ??
            currentUser.email?.split('@')[0] ??
            'Utilisateur'

        const newProfile = {
            id: currentUser.id,
            email: currentUser.email ?? '',
            nom: String(fallbackName),
            company_name: typeof metadata.company_name === 'string' ? metadata.company_name : null,
            ...(typeof metadata.role === 'string' ? { role: metadata.role } : {}),
        }

        const { data: insertedProfile } = await supabase
            .from('profiles')
            .upsert(newProfile, { onConflict: 'id' })
            .select()
            .single()

        if (insertedProfile) {
            setProfile(insertedProfile as Profile)
        }
    }, [])

    const refreshProfile = useCallback(async () => {
        if (user) {
            await fetchProfile(user)
        }
    }, [user, fetchProfile])

    useEffect(() => {
        async function init() {
            const { data: authData } = await supabase.auth.getSession()
            const currentUser = authData.session?.user ?? null
            setUser(currentUser)

            if (currentUser) {
                await fetchProfile(currentUser)
            }
            setLoading(false)
        }

        init()

        const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const newUser = session?.user ?? null
            setUser(newUser)
            if (newUser) {
                await fetchProfile(newUser)
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
