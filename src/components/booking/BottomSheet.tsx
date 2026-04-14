import { useState, useRef, useEffect } from 'react'
import {
    Clock, X, CreditCard, Battery, Package, UserCircle,
    CheckCircle2, Loader2, Navigation,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { Elements } from '@stripe/react-stripe-js'
import type { Tables } from '../../types/supabase'
import { getStripePromise } from '../../lib/stripe'
import { invokeAuthedFunction } from '../../lib/invokeAuthedFunction'
import { resolveBookingPickupCode } from '../../lib/bookingCode'
import { sendBookingNotification } from '../../lib/bookingNotifications'
import CheckoutForm, { type ConfirmedBookingPayload } from '../CheckoutForm'
import BookingCodeCard from '../BookingCodeCard'

type Host = Tables<'hosts'>

interface BottomSheetProps {
    host: Host
    user: User | null
    onClose: () => void
    onOpenAuth: () => void
}

const DURATIONS = [
    { label: '1h',         hours: 1 },
    { label: '2h',         hours: 2 },
    { label: '4h',         hours: 4 },
    { label: 'Journée (8h)', hours: 8 },
]

function nextHalfHour(): Date {
    const d = new Date()
    const mins = d.getMinutes()
    const roundedMins = mins < 30 ? 30 : 60
    d.setMinutes(roundedMins, 0, 0)
    return d
}

export default function BottomSheet({ host, user, onClose, onOpenAuth }: BottomSheetProps) {
    const isMountedRef = useRef(true)
    useEffect(() => { return () => { isMountedRef.current = false } }, [])

    const [selectedDuration, setSelectedDuration] = useState(1)
    const [selectedStartTime, setSelectedStartTime] = useState<Date>(() => nextHalfHour())
    const [isPaying, setIsPaying] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null)
    const [confirmedPickupCode, setConfirmedPickupCode] = useState<string | null>(null)
    const [confirmedStartTime, setConfirmedStartTime] = useState<string | null>(null)
    const [confirmedEndTime, setConfirmedEndTime] = useState<string | null>(null)
    const [clientSecret, setClientSecret] = useState<string | null>(null)
    const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)

    const totalPrice = Number(host.price_per_hour) * selectedDuration
    const isSelfBooking = !!user && host.owner_id === user.id
    const isLegacyDemoHost = host.owner_id == null

    async function handleBook() {
        if (!user) return
        setIsPaying(true)
        setError(null)

        try {
            const startTime = selectedStartTime
            const endTime = new Date(startTime.getTime() + selectedDuration * 3600 * 1000)
            setConfirmedStartTime(startTime.toISOString())
            setConfirmedEndTime(endTime.toISOString())

            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 8000)

            const { data: intentData, error: intentError } = await invokeAuthedFunction<{
                clientSecret?: string
                paymentIntentId?: string
            }>('create-payment-intent', {
                body: { hostId: host.id, startTime: startTime.toISOString(), endTime: endTime.toISOString() },
                signal: controller.signal,
            })

            clearTimeout(timeoutId)

            if (intentError || !intentData?.clientSecret || !intentData?.paymentIntentId) {
                const msg = intentError?.message ?? ''
                if (msg.includes('AUTH_SESSION') || msg.includes('SESSION_EXPIRED_NEED_RELOGIN') || msg.includes('AUTH_TOKEN_EXPIRED')) {
                    throw new Error('SESSION_EXPIRED_NEED_RELOGIN')
                }
                throw new Error(`Erreur Stripe: ${msg || 'Erreur inconnue'}`)
            }

            setPaymentIntentId(intentData.paymentIntentId)
            setClientSecret(intentData.clientSecret)
        } catch (err: unknown) {
            console.error(err)
            if (isMountedRef.current) {
                const msg = err instanceof Error ? err.message : 'Une erreur est survenue lors du paiement.'
                setError(msg === 'SESSION_EXPIRED_NEED_RELOGIN'
                    ? 'Votre session a expiré. Veuillez vous reconnecter.'
                    : msg)
            }
        } finally {
            if (isMountedRef.current) setIsPaying(false)
        }
    }

    function handlePaymentSuccess(payload: ConfirmedBookingPayload) {
        try {
            const bookingId = payload.bookingId
            const pickupCode = resolveBookingPickupCode(payload.pickupCode, bookingId)
            if (!isMountedRef.current) return
            setConfirmedBookingId(bookingId)
            setConfirmedPickupCode(pickupCode)
            void sendBookingNotification('booking_created', bookingId)

            try {
                localStorage.setItem('scootsafe_latest_booking', JSON.stringify({
                    bookingId,
                    pickupCode,
                    hostName: host.name,
                    hostLat: host.latitude,
                    hostLng: host.longitude,
                    startTime: confirmedStartTime,
                    endTime: confirmedEndTime,
                    totalPrice: Number(totalPrice.toFixed(2)),
                }))
            } catch { /* silent — local cache is optional */ }

            setTimeout(() => { if (isMountedRef.current) setSuccess(true) }, 0)
        } catch (err) {
            console.error(err)
            if (isMountedRef.current) {
                setError('Délai dépassé ou erreur réseau lors de la récupération du code.')
            }
        }
    }

    const confirmedSchedule =
        confirmedStartTime && confirmedEndTime
            ? `${new Date(confirmedStartTime).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · ${new Date(confirmedStartTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} → ${new Date(confirmedEndTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
            : null

    // ── Stripe payment step ───────────────────────────────────
    if (clientSecret && paymentIntentId && !success) {
        const isKeyMissing = !(import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined)?.trim()

        return (
            <>
                <div className="overlay-enter" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={onClose} />
                <div
                    className="bottom-sheet-enter glass-card"
                    style={{
                        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001,
                        padding: '24px 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
                        borderTopLeftRadius: 'var(--radius-xl)', borderTopRightRadius: 'var(--radius-xl)',
                        borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute', top: 16, right: 16,
                            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
                            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'var(--color-text-secondary)', zIndex: 10,
                        }}
                    >
                        <X size={18} />
                    </button>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>Paiement sécurisé</h2>

                    {isKeyMissing ? (
                        <div style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', padding: 16, borderRadius: 8, fontSize: '0.9rem', marginBottom: 24 }}>
                            <strong>Erreur Critique</strong><br />
                            La clé VITE_STRIPE_PUBLIC_KEY est introuvable.
                        </div>
                    ) : (
                        <Elements
                            stripe={getStripePromise()}
                            options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#6C5CE7', colorBackground: '#1a1a2e', colorText: '#ffffff', colorDanger: '#ff6b6b' } } }}
                        >
                            <CheckoutForm paymentIntentId={paymentIntentId} onSuccess={handlePaymentSuccess} />
                        </Elements>
                    )}
                </div>
            </>
        )
    }

    // ── Booking success step ──────────────────────────────────
    if (success) {
        return (
            <div
                className="bottom-sheet-enter glass-card"
                style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001,
                    padding: '32px 20px',
                    borderTopLeftRadius: 'var(--radius-xl)', borderTopRightRadius: 'var(--radius-xl)',
                    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
                    textAlign: 'center',
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 16, right: 16,
                        background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
                        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--color-text-secondary)',
                    }}
                >
                    <X size={18} />
                </button>

                <CheckCircle2 size={64} color="var(--color-success)" style={{ margin: '0 auto 16px' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Réservation confirmée !</h2>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>
                    Votre place chez {host.name} est réservée pour {selectedDuration}h.
                </p>

                {confirmedSchedule && (
                    <div className="glass-card" style={{ marginBottom: 18, padding: '14px 16px', textAlign: 'left', background: 'rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}>Créneau réservé</div>
                        <div style={{ marginTop: 6, fontSize: '1rem', fontWeight: 800, color: 'white' }}>{confirmedSchedule}</div>
                    </div>
                )}

                {confirmedBookingId && confirmedPickupCode && (
                    <div style={{ marginBottom: 20, textAlign: 'left' }}>
                        <BookingCodeCard
                            code={confirmedPickupCode}
                            title="Code à présenter"
                            subtitle="Le commerçant peut scanner ou saisir ce code pour valider votre dépôt."
                        />
                    </div>
                )}

                <button
                    className="btn-primary"
                    onClick={onClose}
                    style={{ width: '100%', background: 'var(--color-success)', color: 'white' }}
                >
                    Voir mes réservations
                </button>
            </div>
        )
    }

    // ── Booking form step ─────────────────────────────────────
    const pad = (n: number) => String(n).padStart(2, '0')
    const toDatetimeLocal = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

    const endPreview = new Date(selectedStartTime.getTime() + selectedDuration * 3600 * 1000)
    const fmtDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    const fmtTime = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const now = new Date()
    const startInPast = selectedStartTime < now

    return (
        <>
            <div className="overlay-enter" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={onClose} />
            <div
                className="bottom-sheet-enter glass-card"
                style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001,
                    padding: '24px 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
                    borderTopLeftRadius: 'var(--radius-xl)', borderTopRightRadius: 'var(--radius-xl)',
                    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
                    maxHeight: '85vh', overflowY: 'auto',
                }}
            >
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-text-muted)', margin: '0 auto 16px' }} />

                <button
                    onClick={onClose}
                    aria-label="Fermer"
                    style={{
                        position: 'absolute', top: 16, right: 16,
                        background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
                        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--color-text-secondary)',
                    }}
                >
                    <X size={18} />
                </button>

                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>{host.name}</h2>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(108,92,231,0.15)', color: 'var(--color-primary-light)', fontSize: '0.85rem', fontWeight: 600 }}>
                        <Clock size={14} /> {Number(host.price_per_hour).toFixed(2)} €/h
                    </span>
                    {host.has_charging && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,206,201,0.15)', color: 'var(--color-accent)', fontSize: '0.85rem', fontWeight: 600 }}>
                            <Battery size={14} /> Recharge incluse
                        </span>
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                        <Package size={14} /> {host.capacity} place(s)
                    </span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 20 }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 10, fontWeight: 600 }}>Créneau de début</h3>
                    <input
                        type="datetime-local"
                        value={toDatetimeLocal(selectedStartTime)}
                        min={toDatetimeLocal(now)}
                        max={toDatetimeLocal(new Date(Date.now() + 7 * 24 * 3600 * 1000))}
                        onChange={(e) => { if (e.target.value) setSelectedStartTime(new Date(e.target.value)) }}
                        style={{
                            width: '100%', padding: '11px 13px',
                            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 'var(--radius-sm)', color: 'white', fontSize: '0.95rem',
                            fontFamily: 'inherit', marginBottom: 16, colorScheme: 'dark',
                            outline: 'none', boxSizing: 'border-box',
                        }}
                    />

                    <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 10, fontWeight: 600 }}>Choisir une durée</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {DURATIONS.map((dur) => (
                            <button
                                key={dur.hours}
                                onClick={() => setSelectedDuration(dur.hours)}
                                style={{
                                    padding: '10px 4px', borderRadius: 'var(--radius-sm)',
                                    border: selectedDuration === dur.hours ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)',
                                    background: selectedDuration === dur.hours ? 'rgba(108,92,231,0.2)' : 'transparent',
                                    color: selectedDuration === dur.hours ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
                                }}
                            >
                                {dur.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.2)', fontSize: '0.82rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={13} style={{ flexShrink: 0, color: 'var(--color-primary-light)' }} />
                        <span>
                            Du <strong style={{ color: 'white' }}>{fmtDate(selectedStartTime)} {fmtTime(selectedStartTime)}</strong>
                            {' '}au <strong style={{ color: 'white' }}>{fmtDate(endPreview)} {fmtTime(endPreview)}</strong>
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Total calculé</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{totalPrice.toFixed(2)} €</span>
                </div>

                {startInPast && (
                    <div style={{ color: 'var(--color-warning)', fontSize: '0.85rem', marginBottom: 12, padding: '10px 12px', background: 'rgba(253,203,110,0.1)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={14} style={{ flexShrink: 0 }} /> Le créneau est déjà passé.
                    </div>
                )}

                {error && (
                    <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: 16, padding: 12, background: 'rgba(255,107,107,0.15)', borderRadius: 'var(--radius-sm)' }}>
                        {error}
                    </div>
                )}

                {isSelfBooking && (
                    <div style={{ color: 'var(--color-warning)', fontSize: '0.85rem', marginBottom: 16, padding: 12, background: 'rgba(253,203,110,0.14)', borderRadius: 'var(--radius-sm)' }}>
                        Cette offre vous appartient. Une auto-réservation n'est pas autorisée.
                    </div>
                )}

                {isLegacyDemoHost && (
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: 16, padding: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)' }}>
                        Place de démonstration. La réservation est désactivée tant qu'aucun commerçant validé n'y est rattaché.
                    </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${host.latitude},${host.longitude}`, '_blank')}
                        style={{
                            flex: '0 0 auto', padding: '14px',
                            background: 'rgba(255,255,255,0.08)', color: 'white',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            cursor: 'pointer', fontWeight: 600,
                        }}
                        title="S'y rendre (Google Maps)"
                    >
                        <Navigation size={18} />
                    </button>

                    {isLegacyDemoHost ? (
                        <button disabled style={{ flex: 1, padding: '14px 20px', background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'not-allowed', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            <Package size={18} /> Place de démonstration
                        </button>
                    ) : !user ? (
                        <button
                            onClick={onOpenAuth}
                            style={{ flex: 1, padding: '14px 20px', background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                        >
                            <UserCircle size={18} /> Se connecter pour réserver
                        </button>
                    ) : (
                        <button
                            className="btn-primary"
                            onClick={handleBook}
                            disabled={isPaying || isSelfBooking || isLegacyDemoHost || startInPast}
                            style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                opacity: isPaying || isSelfBooking || isLegacyDemoHost || startInPast ? 0.7 : 1,
                                cursor: isPaying || isSelfBooking || isLegacyDemoHost || startInPast ? 'not-allowed' : 'pointer',
                                padding: '14px 20px', whiteSpace: 'nowrap',
                            }}
                        >
                            {isPaying ? (
                                <><Loader2 size={18} className="animate-spin" /> En cours...</>
                            ) : (
                                <><CreditCard size={18} /> Payer ({totalPrice.toFixed(2)} €)</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </>
    )
}
