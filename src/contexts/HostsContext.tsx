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

    const fetchHosts = useCallback(async () => {
        setLoading(true)
        const { data, error: err } = await supabase
            .from('hosts')
            .select('*')

        if (err) setError(err.message)
        else setHosts(data ?? [])

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
