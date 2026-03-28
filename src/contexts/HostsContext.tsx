import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Tables } from '../types/supabase'

type Host = Tables<'hosts'>

interface HostsContextType {
    hosts: Host[]
    loading: boolean
    error: string | null
    refreshHosts: () => Promise<void>
}

const HostsContext = createContext<HostsContextType | null>(null)

export function HostsProvider({ children }: { children: ReactNode }) {
    const [hosts, setHosts] = useState<Host[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    let hostsCache: { data: Host[]; fetchedAt: number } | null = null
    const CACHE_TTL = 2 * 60 * 1000 // 2 minutes

    const fetchHosts = useCallback(async () => {
        if (hostsCache && Date.now() - hostsCache.fetchedAt < CACHE_TTL) {
            setHosts(hostsCache.data)
            setLoading(false)
            return
        }

        setLoading(true)
        const { data, error: err } = await supabase
            .from('hosts_map')
            .select('id, name, latitude, longitude, price_per_hour, has_charging, capacity, owner_id, is_active')

        if (err) {
            setError(err.message)
        } else {
            const mappedHosts = (data ?? []) as unknown as Host[]
            setHosts(mappedHosts)
            hostsCache = { data: mappedHosts, fetchedAt: Date.now() }
        }

        setLoading(false)
    }, [])

    useEffect(() => {
        void fetchHosts()
    }, [fetchHosts])

    return (
        <HostsContext.Provider value={{ hosts, loading, error, refreshHosts: fetchHosts }}>
            {children}
        </HostsContext.Provider>
    )
}

export function useHosts() {
    const ctx = useContext(HostsContext)
    if (!ctx) throw new Error('useHosts must be used within HostsProvider')
    return ctx
}
