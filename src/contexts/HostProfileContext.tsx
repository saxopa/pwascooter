import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { User, Session } from '@supabase/supabase-js'

interface Profile {
    id: string
    nom: string
    email: string
    role: 'user' | 'host' | 'admin' | null
    host_status: string | null
    company_name: string | null
    created_at: string | null
}

interface HostProfileContextType {
    user: User | null
    profile: Profile | null
    isHost: boolean
    loading: boolean
    refreshProfile: () => Promise<void>
}

const HostProfileContext = createContext<HostProfileContextType | null>(null)

export function HostProfileProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchProfile = useCallback(async (currentUser: User) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()

        if (data) { setProfile(data as Profile); return }

        const isMissingProfile = error?.code === 'PGRST116'
        if (!isMissingProfile) return

        const metadata = currentUser.user_metadata ?? {}
        const fallbackName =
            metadata.nom ?? metadata.full_name ?? metadata.name ??
            currentUser.email?.split('@')[0] ?? 'Utilisateur'

        const newProfile = {
            id: currentUser.id,
            email: currentUser.email ?? '',
            nom: String(fallbackName),
            company_name: typeof metadata.company_name === 'string'
                ? metadata.company_name : null,
            ...(typeof metadata.role === 'string' ? { role: metadata.role } : {}),
        }

        const { data: inserted } = await supabase
            .from('profiles')
            .upsert(newProfile, { onConflict: 'id' })
            .select()
            .single()

        if (inserted) setProfile(inserted as Profile)
    }, [])

    const refreshProfile = useCallback(async () => {
        if (user) await fetchProfile(user)
    }, [user, fetchProfile])

    // Ref to avoid stale closure AND prevent deps from triggering re-subscription
    const fetchProfileRef = useRef(fetchProfile)
    fetchProfileRef.current = fetchProfile

    useEffect(() => {
        let isMounted = true

        async function init() {
            const { data } = await supabase.auth.getSession()
            const currentUser = data.session?.user ?? null
            if (isMounted) setUser(currentUser)
            if (currentUser) await fetchProfileRef.current(currentUser)
            if (isMounted) setLoading(false)
        }

        void init()

        const { data: listener } = supabase.auth.onAuthStateChange(
            async (_event: string, session: Session | null) => {
                const newUser = session?.user ?? null
                if (isMounted) setUser(newUser)
                if (newUser) await fetchProfileRef.current(newUser)
                else if (isMounted) setProfile(null)
            }
        )

        return () => {
            isMounted = false
            listener.subscription.unsubscribe()
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <HostProfileContext.Provider
            value={{ user, profile, isHost: profile?.role === 'host', loading, refreshProfile }}
        >
            {children}
        </HostProfileContext.Provider>
    )
}

export function useHostProfile() {
    const ctx = useContext(HostProfileContext)
    if (!ctx) throw new Error('useHostProfile must be used within HostProfileProvider')
    return ctx
}
