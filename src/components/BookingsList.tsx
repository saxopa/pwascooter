import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ArrowLeft,
    MapPin,
    Clock,
    Battery,
    CheckCircle2,
    AlertCircle,
    Loader2,
    CalendarDays,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { Tables } from '../types/supabase'
import BookingCodeCard from './BookingCodeCard'
import { resolveBookingPickupCode } from '../lib/bookingCode'
import LegalLinks from './LegalLinks'

type Booking = Tables<'bookings'> & {
    hosts: Pick<Tables<'hosts'>, 'name' | 'latitude' | 'longitude'> | null
}

const STATUS_CONFIG = {
    pending: {
        label: 'En attente',
        color: 'var(--color-warning)',
        bg: 'rgba(253, 203, 110, 0.15)',
        icon: <AlertCircle size={14} />,
    },
    active: {
        label: 'Active',
        color: 'var(--color-success)',
        bg: 'rgba(0, 184, 148, 0.15)',
        icon: <CheckCircle2 size={14} />,
    },
    completed: {
        label: 'Terminée',
        color: 'var(--color-text-muted)',
        bg: 'rgba(108, 108, 128, 0.15)',
        icon: <CheckCircle2 size={14} />,
    },
    cancelled: {
        label: 'Annulée',
        color: 'var(--color-danger)',
        bg: 'rgba(255, 107, 107, 0.15)',
        icon: <AlertCircle size={14} />,
    },
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function formatDuration(start: string, end: string) {
    const diff = new Date(end).getTime() - new Date(start).getTime()
    const hours = Math.round(diff / 3600000)
    return hours >= 8 ? 'Journée (8h)' : `${hours}h`
}

export default function BookingsList() {
    const navigate = useNavigate()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null)
    const [cancellingId, setCancellingId] = useState<string | null>(null)
    const [actionMessage, setActionMessage] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)

        const { data: authData } = await supabase.auth.getSession()
        const currentUser = authData.session?.user ?? null
        setUser(currentUser)

        if (!currentUser) {
            setLoading(false)
            return
        }

        const { data, error: err } = await supabase
            .from('bookings')
            .select('*, hosts(name, latitude, longitude)')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })

        if (err) {
            setError(err.message)
        } else {
            setBookings((data as Booking[]) ?? [])
        }

        setLoading(false)
    }, [])

    useEffect(() => {
        queueMicrotask(() => {
            void load()
        })
    }, [load])

    async function cancelBooking(bookingId: string) {
        setCancellingId(bookingId)
        setError(null)
        setActionMessage(null)

        const { error: rpcError } = await supabase.rpc('cancel_booking', {
            p_booking_id: bookingId,
        })

        if (rpcError) {
            if (rpcError.message.includes('BOOKING_NOT_CANCELLABLE')) {
                setError('Cette réservation ne peut plus être annulée.')
            } else if (rpcError.message.includes('FORBIDDEN')) {
                setError('Vous ne pouvez pas annuler cette réservation.')
            } else {
                setError(rpcError.message)
            }
            setCancellingId(null)
            return
        }

        await load()
        setActionMessage('Réservation annulée.')
        setCancellingId(null)
    }

    return (
        <div
            style={{
                minHeight: '100dvh',
                background: 'var(--color-bg-dark)',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '16px 20px',
                    paddingTop: 'max(20px, env(safe-area-inset-top))',
                    background: 'linear-gradient(to bottom, rgba(15,15,26,0.98), rgba(15,15,26,0.85))',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                }}
            >
                <button
                    onClick={() => navigate('/map')}
                    aria-label="Retour à la carte"
                    style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '50%',
                        width: 38,
                        height: 38,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--color-text-primary)',
                        flexShrink: 0,
                        transition: 'background 0.2s',
                    }}
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1
                        className="text-gradient"
                        style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}
                    >
                        Mes Réservations
                    </h1>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 1 }}>
                        ⚡ ScootSafe
                    </p>
                    <div style={{ marginTop: 6 }}>
                        <LegalLinks compact align="left" />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '20px 16px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>

                {/* Loading */}
                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                        <Loader2
                            size={32}
                            style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary-light)' }}
                        />
                    </div>
                )}

                {/* Not logged in */}
                {!loading && !user && (
                    <div
                        className="glass-card"
                        style={{ padding: 32, textAlign: 'center', marginTop: 24 }}
                    >
                        <CalendarDays size={48} color="var(--color-text-muted)" style={{ margin: '0 auto 16px' }} />
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>
                            Connexion requise
                        </h2>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
                            Connecte-toi pour voir tes réservations.
                        </p>
                        <button
                            className="btn-primary"
                            onClick={() => navigate('/map')}
                        >
                            Retour à la carte
                        </button>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div style={{
                        padding: 16,
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255,107,107,0.15)',
                        color: 'var(--color-danger)',
                        fontSize: '0.9rem',
                        marginBottom: 16,
                    }}>
                        Erreur : {error}
                    </div>
                )}

                {actionMessage && (
                    <div style={{
                        padding: 16,
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(0,184,148,0.15)',
                        color: 'var(--color-success)',
                        fontSize: '0.9rem',
                        marginBottom: 16,
                    }}>
                        {actionMessage}
                    </div>
                )}

                {/* Empty state */}
                {!loading && user && !error && bookings.length === 0 && (
                    <div
                        className="glass-card"
                        style={{ padding: 32, textAlign: 'center', marginTop: 24 }}
                    >
                        <CalendarDays size={48} color="var(--color-text-muted)" style={{ margin: '0 auto 16px' }} />
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>
                            Aucune réservation
                        </h2>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
                            Tu n'as pas encore réservé de parking. Trouve-en un sur la carte !
                        </p>
                        <button
                            className="btn-primary"
                            onClick={() => navigate('/map')}
                        >
                            Trouver un parking
                        </button>
                    </div>
                )}

                {/* Bookings list */}
                {!loading && bookings.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {bookings.map((booking) => {
                            const statusCfg = STATUS_CONFIG[booking.status ?? 'pending']
                            return (
                                <div
                                    key={booking.id}
                                    className="glass-card"
                                    style={{ padding: '16px 18px', borderRadius: 'var(--radius-md)' }}
                                >
                                    {/* Status badge + price */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                            padding: '4px 10px', borderRadius: 6,
                                            background: statusCfg.bg, color: statusCfg.color,
                                            fontSize: '0.78rem', fontWeight: 700,
                                        }}>
                                            {statusCfg.icon}
                                            {statusCfg.label}
                                        </span>
                                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white' }}>
                                            {Number(booking.total_price).toFixed(2)} €
                                        </span>
                                    </div>

                                    {/* Host name */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                                        <MapPin size={15} color="var(--color-primary-light)" />
                                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                            {booking.hosts?.name ?? 'Parking inconnu'}
                                        </span>
                                    </div>

                                    {/* Dates */}
                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                            <Clock size={13} />
                                            {formatDate(booking.start_time)}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                            <Battery size={13} />
                                            {formatDuration(booking.start_time, booking.end_time)}
                                        </span>
                                    </div>

                                    {booking.status !== 'cancelled' && (
                                        <div style={{ marginTop: 14 }}>
                                            <BookingCodeCard
                                                code={resolveBookingPickupCode(booking.pickup_code, booking.id)}
                                                compact
                                                title="Code de validation"
                                                subtitle="Présente ce code au commerçant lors du dépôt."
                                            />
                                        </div>
                                    )}

                                    {booking.status === 'pending' && (
                                        <div style={{ marginTop: 12 }}>
                                            <button
                                                type="button"
                                                onClick={() => cancelBooking(booking.id)}
                                                disabled={cancellingId === booking.id}
                                                style={{
                                                    width: '100%',
                                                    padding: '11px 14px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: '1px solid rgba(255,107,107,0.2)',
                                                    background: 'rgba(255,107,107,0.12)',
                                                    color: 'var(--color-danger)',
                                                    cursor: cancellingId === booking.id ? 'not-allowed' : 'pointer',
                                                    fontWeight: 700,
                                                    opacity: cancellingId === booking.id ? 0.65 : 1,
                                                }}
                                            >
                                                {cancellingId === booking.id ? 'Annulation…' : 'Annuler la réservation'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
