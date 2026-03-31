/* eslint-disable react-refresh/only-export-components */
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

function isApprovedHost(profile: Profile | null) {
    return profile?.role === 'host' && profile.host_status === 'approved'
}

export function HostProfileProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const lastFetchedUserIdRef = useRef<string | null>(null)

    const fetchProfile = useCallback(async (currentUser: User) => {
        if (lastFetchedUserIdRef.current === currentUser.id) return
        lastFetchedUserIdRef.current = currentUser.id
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()

        if (data) { setProfile(data as Profile); return }

        const isMissingProfile = error?.code === 'PGRST116'
        if (!isMissingProfile) return

        const metadata = currentUser.user_metadata ?? {}
        const requestedHostAccess = metadata.role === 'host' || metadata.requested_role === 'host'
        const fallbackName =
            metadata.nom ?? metadata.full_name ?? metadata.name ??
            currentUser.email?.split('@')[0] ?? 'Utilisateur'

        const newProfile = {
            id: currentUser.id,
            email: currentUser.email ?? '',
            nom: String(fallbackName),
            role: 'user' as const,
            host_status: requestedHostAccess ? 'pending' : null,
            company_name: typeof metadata.company_name === 'string'
                ? metadata.company_name : null,
        }

        const { data: inserted } = await supabase
            .from('profiles')
            .upsert(newProfile, { onConflict: 'id' })
            .select()
            .single()

        if (inserted) setProfile(inserted as Profile)
    }, [])

    const refreshProfile = useCallback(async () => {
        if (user) {
            lastFetchedUserIdRef.current = null // Force refetch
            await fetchProfile(user)
        }
    }, [user, fetchProfile])

    const fetchProfileRef = useRef(fetchProfile)
    fetchProfileRef.current = fetchProfile

    useEffect(() => {
        let isMounted = true

        async function init() {
            try {
                const { data } = await supabase.auth.getSession()
                const currentUser = data.session?.user ?? null
                if (isMounted) setUser(currentUser)
                if (currentUser) await fetchProfileRef.current(currentUser)
            } catch (error) {
                console.error('Failed to initialize host profile context:', error)
                if (isMounted) {
                    setUser(null)
                    setProfile(null)
                }
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        void init()

        const { data: listener } = supabase.auth.onAuthStateChange(
            async (event: string, session: Session | null) => {
                if (event === 'INITIAL_SESSION') return // handled by init()
                try {
                    const newUser = session?.user ?? null
                    if (isMounted) setUser(newUser)
                    if (newUser) await fetchProfileRef.current(newUser)
                    else if (isMounted) {
                        setProfile(null)
                        lastFetchedUserIdRef.current = null
                    }
                } catch (error) {
                    console.error('Auth state change handling failed:', error)
                    if (isMounted && !session?.user) {
                        setProfile(null)
                        lastFetchedUserIdRef.current = null
                    }
                }
            }
        )

        return () => {
            isMounted = false
            listener.subscription.unsubscribe()
        }
    }, [])

    return (
        <HostProfileContext.Provider
            value={{ user, profile, isHost: isApprovedHost(profile), loading, refreshProfile }}
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
