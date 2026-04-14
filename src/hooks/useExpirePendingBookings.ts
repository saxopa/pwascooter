import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useExpirePendingBookings(userId: string | undefined) {
    useEffect(() => {
        if (userId) {
            void supabase.rpc('expire_pending_bookings')
        }
    // Re-run only when user presence changes (null ↔ truthy)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!userId])
}
