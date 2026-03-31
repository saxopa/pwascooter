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
        setError(null)

        const controller = new AbortController()
        const timeoutId = window.setTimeout(() => controller.abort(), 10000)

        try {
            const { data, error: viewError } = await supabase
                .from('hosts_map')
                .select('id, name, latitude, longitude, price_per_hour, has_charging, capacity, owner_id, is_active')
                .abortSignal(controller.signal)

            if (!viewError) {
                const mappedHosts = (data ?? []) as unknown as Host[]
                setHosts(mappedHosts)
                hostsCache = { data: mappedHosts, fetchedAt: Date.now() }
                return
            }

            const { data: fallbackData, error: tableError } = await supabase
                .from('hosts')
                .select('id, name, latitude, longitude, price_per_hour, has_charging, capacity, owner_id, is_active')
                .eq('is_active', true)
                .abortSignal(controller.signal)

            if (tableError) {
                throw new Error(viewError.message || tableError.message)
            }

            const mappedHosts = (fallbackData ?? []) as Host[]
            setHosts(mappedHosts)
            hostsCache = { data: mappedHosts, fetchedAt: Date.now() }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Impossible de charger la carte.'
            setError(message === 'AbortError' ? 'Le chargement de la carte a expiré.' : message)
        } finally {
            window.clearTimeout(timeoutId)
            setLoading(false)
        }
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
