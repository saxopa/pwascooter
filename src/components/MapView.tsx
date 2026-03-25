import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap,
    useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import {
    Clock,
    X,
    CreditCard,
    Battery,
    Package,
    UserCircle,
    CheckCircle2,
    Loader2,
    CalendarDays,
    Crosshair,
    SlidersHorizontal,
    Shield,
    ChevronRight,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { Tables } from '../types/supabase'
import AuthModal from './AuthModal'
import RoleSelectModal from './RoleSelectModal'
import { useHostProfile } from '../hooks/useHostProfile'
import BookingCodeCard from './BookingCodeCard'
import { resolveBookingPickupCode } from '../lib/bookingCode'
import { sendBookingNotification } from '../lib/bookingNotifications'

type Host = Tables<'hosts'>


// ────────────────────── Toulouse Center ──────────────────────
const TOULOUSE_CENTER: [number, number] = [43.6047, 1.4442]
const DEFAULT_ZOOM = 14
let standardMarkerIcon: L.DivIcon | null = null
let chargingMarkerIcon: L.DivIcon | null = null

// ────────────────────── Custom Marker Icon ───────────────────
function createMarkerIcon(hasCharging: boolean) {
    if (hasCharging && chargingMarkerIcon) {
        return chargingMarkerIcon
    }

    if (!hasCharging && standardMarkerIcon) {
        return standardMarkerIcon
    }

    const iconSymbol = hasCharging
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L6 13H11L10 22L18 10H13V2Z"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C16 17.8 19 14.4 19 10.5C19 6.36 15.87 3 12 3C8.13 3 5 6.36 5 10.5C5 14.4 8 17.8 12 22Z"/><circle cx="12" cy="10" r="2.6" fill="#6C5CE7"/></svg>'

    const iconHtml = `
        <div style="
            width:40px;
            height:40px;
            border-radius:50%;
            background:${hasCharging ? 'linear-gradient(135deg, #6C5CE7, #00CEC9)' : 'linear-gradient(135deg, #6C5CE7, #A29BFE)'};
            display:flex;
            align-items:center;
            justify-content:center;
            border:3px solid rgba(255,255,255,0.9);
            box-shadow:0 4px 15px rgba(108,92,231,0.5);
        ">
            <span style="display:flex;align-items:center;justify-content:center;">
                ${iconSymbol}
            </span>
        </div>
    `

    const icon = L.divIcon({
        html: iconHtml,
        className: 'custom-marker-icon', // Animation styles from index.css
        iconSize: [40, 40],
        iconAnchor: [20, 40], // Point of the pin is at bottom-center
        popupAnchor: [0, -42], // Popup opens just above the pin
    })

    if (hasCharging) {
        chargingMarkerIcon = icon
    } else {
        standardMarkerIcon = icon
    }

    return icon
}

// ────────────────────── Fly-to helper ────────────────────────
function FlyToMarker({ position }: { position: [number, number] | null }) {
    const map = useMap()
    useEffect(() => {
        if (position) {
            map.flyTo(position, 16, { duration: 0.8 })
        }
    }, [position, map])
    return null
}

function EnsureMapLayout() {
    const map = useMap()

    useEffect(() => {
        const invalidate = () => {
            window.requestAnimationFrame(() => {
                map.invalidateSize()
            })
        }

        invalidate()

        const delayedInvalidate = window.setTimeout(invalidate, 250)
        const handleResize = () => invalidate()
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                invalidate()
            }
        }

        window.addEventListener('resize', handleResize)
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            window.clearTimeout(delayedInvalidate)
            window.removeEventListener('resize', handleResize)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [map])

    return null
}

// ────────────────────── Fly-to User ──────────────────────────
function FlyToUser({ locateRequest }: { locateRequest: number }) {
    const map = useMap()
    const hasHandledInitialRequest = useRef(false)

    useEffect(() => {
        if (!locateRequest || !navigator.geolocation) return

        if (!hasHandledInitialRequest.current) {
            hasHandledInitialRequest.current = true
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                map.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { duration: 1 })
            },
            () => {
                // Permission denied or unavailable: stay on Toulouse
            }
        )
    }, [locateRequest, map])

    return null
}

// ────────────────────── Map click close ──────────────────────
function MapClickClose({ onClose }: { onClose: () => void }) {
    useMapEvents({
        click: onClose,
    })
    return null
}

// ────────────────────── Bottom Sheet ─────────────────────────
interface BottomSheetProps {
    host: Host
    user: import('@supabase/supabase-js').User | null
    onClose: () => void
    onOpenAuth: () => void
}

// Options de durée
const DURATIONS = [
    { label: '1h', hours: 1 },
    { label: '2h', hours: 2 },
    { label: '4h', hours: 4 },
    { label: 'Journée (8h)', hours: 8 },
]

function BottomSheet({ host, user, onClose, onOpenAuth }: BottomSheetProps) {
    const [selectedDuration, setSelectedDuration] = useState(1) // par défaut 1h
    const [isPaying, setIsPaying] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null)
    const [confirmedPickupCode, setConfirmedPickupCode] = useState<string | null>(null)
    const [confirmedStartTime, setConfirmedStartTime] = useState<string | null>(null)
    const [confirmedEndTime, setConfirmedEndTime] = useState<string | null>(null)

    const totalPrice = Number(host.price_per_hour) * selectedDuration
    const isSelfBooking = !!user && host.owner_id === user.id

    async function handleBook() {
        if (!user) return

        setIsPaying(true)
        setError(null)

        try {
            // 1. Simuler le paiement Stripe (2 secondes — sera remplacé par vraie intégration)
            await new Promise((resolve) => setTimeout(resolve, 2000))

            // 2. Préparer les dates
            const startTime = new Date()
            const endTime = new Date()
            endTime.setHours(endTime.getHours() + selectedDuration)
            setConfirmedStartTime(startTime.toISOString())
            setConfirmedEndTime(endTime.toISOString())

            // 3. Appel RPC anti-surbooking
            const { data: rpcData, error: rpcError } = await supabase.rpc('book_parking_spot', {
                p_host_id: host.id,
                p_start_time: startTime.toISOString(),
                p_end_time: endTime.toISOString(),
                p_total_price: Number(totalPrice.toFixed(2)),
            })

            if (rpcError) throw rpcError

            // 4. Vérifier le résultat métier
            if (!rpcData?.success) {
                if (rpcData?.error === 'PARKING_FULL') {
                    setError('Ce parking est complet pour ce créneau. Essaie une autre heure ou un autre parking.')
                } else if (rpcData?.error === 'SELF_BOOKING_FORBIDDEN') {
                    setError('Vous ne pouvez pas réserver votre propre place commerçant.')
                } else if (rpcData?.error === 'AUTH_REQUIRED') {
                    setError('Votre session a expiré. Reconnectez-vous pour réserver.')
                } else if (rpcData?.error === 'HOST_NOT_AVAILABLE') {
                    setError('Cette place n’est plus disponible pour le moment.')
                } else if (rpcData?.error === 'INVALID_TIME_RANGE') {
                    setError('Le créneau demandé est invalide.')
                } else {
                    throw new Error(rpcData?.error ?? 'Erreur lors de la réservation.')
                }
                return
            }

            // 5. Succès !
            setConfirmedBookingId(rpcData.booking_id ?? null)

            if (rpcData.booking_id) {
                const { data: bookingData } = await supabase
                    .from('bookings')
                    .select('id, pickup_code')
                    .eq('id', rpcData.booking_id)
                    .single()

                setConfirmedPickupCode(resolveBookingPickupCode(bookingData?.pickup_code, rpcData.booking_id))
                void sendBookingNotification('booking_created', rpcData.booking_id)
            }
            setSuccess(true)
        } catch (err: unknown) {
            console.error(err)
            setError(err instanceof Error ? err.message : 'Une erreur est survenue lors du paiement.')
        } finally {
            setIsPaying(false)
        }
    }

    const confirmedSchedule =
        confirmedStartTime && confirmedEndTime
            ? `${new Date(confirmedStartTime).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
            })} · ${new Date(confirmedStartTime).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
            })} → ${new Date(confirmedEndTime).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
            })}`
            : null

    // Si confirmation réussie, on affiche un message de succès
    if (success) {
        return (
            <div
                className="bottom-sheet-enter glass-card"
                style={{
                    position: 'fixed',
                    bottom: 0, left: 0, right: 0, zIndex: 1001,
                    padding: '32px 20px',
                    borderTopLeftRadius: 'var(--radius-xl)',
                    borderTopRightRadius: 'var(--radius-xl)',
                    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
                    textAlign: 'center'
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 16, right: 16,
                        background: 'rgba(255,255,255,0.08)', border: 'none',
                        borderRadius: '50%', width: 32, height: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                    <div
                        className="glass-card"
                        style={{
                            marginBottom: 18,
                            padding: '14px 16px',
                            textAlign: 'left',
                            background: 'rgba(255,255,255,0.05)',
                        }}
                    >
                        <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}>
                            Créneau réservé
                        </div>
                        <div style={{ marginTop: 6, fontSize: '1rem', fontWeight: 800, color: 'white' }}>
                            {confirmedSchedule}
                        </div>
                    </div>
                )}

                {confirmedBookingId && confirmedPickupCode && (
                    <div style={{ marginBottom: 20, textAlign: 'left' }}>
                        <BookingCodeCard
                            code={confirmedPickupCode}
                            title="Code a presenter"
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

    return (
        <>
            {/* Overlay */}
            <div
                className="overlay-enter"
                style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                }}
                onClick={onClose}
            />

            {/* Sheet */}
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
                {/* Handle */}
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-text-muted)', margin: '0 auto 16px' }} />

                {/* Close button */}
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

                {/* Host Info */}
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
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 12, fontWeight: 600 }}>Choisir une durée</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {DURATIONS.map((dur) => (
                            <button
                                key={dur.hours}
                                onClick={() => setSelectedDuration(dur.hours)}
                                style={{
                                    padding: '10px 4px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: selectedDuration === dur.hours ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)',
                                    background: selectedDuration === dur.hours ? 'rgba(108,92,231,0.2)' : 'transparent',
                                    color: selectedDuration === dur.hours ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {dur.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dynamic Price */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Total calculé</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>
                        {totalPrice.toFixed(2)} €
                    </span>
                </div>

                {/* Error message */}
                {error && (
                    <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: 16, padding: 12, background: 'rgba(255,107,107,0.15)', borderRadius: 'var(--radius-sm)' }}>
                        {error}
                    </div>
                )}

                {isSelfBooking && (
                    <div style={{ color: 'var(--color-warning)', fontSize: '0.85rem', marginBottom: 16, padding: 12, background: 'rgba(253,203,110,0.14)', borderRadius: 'var(--radius-sm)' }}>
                        Cette offre vous appartient. Une auto-réservation n’est pas autorisée.
                    </div>
                )}

                {/* Auth / CTA Button */}
                {!user ? (
                    <button
                        onClick={onOpenAuth}
                        style={{
                            width: '100%', padding: '14px 28px',
                            background: 'rgba(255,255,255,0.08)', color: 'white',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            cursor: 'pointer', fontWeight: 600,
                        }}
                    >
                        <UserCircle size={18} />
                        Se connecter pour réserver
                    </button>
                ) : (
                    <button
                        className="btn-primary"
                        onClick={handleBook}
                        disabled={isPaying || isSelfBooking}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            opacity: isPaying || isSelfBooking ? 0.7 : 1,
                            cursor: isPaying || isSelfBooking ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isPaying ? (
                            <>
                                <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                                Paiement en cours...
                            </>
                        ) : (
                            <>
                                <CreditCard size={18} />
                                Payer et Réserver ({totalPrice.toFixed(2)} €)
                            </>
                        )}
                    </button>
                )}
            </div>
        </>
    )
}

// ────────────────────── MapView Component ────────────────────
export default function MapView() {
    const navigate = useNavigate()
    const { profile, isHost, refreshProfile, loading: profileLoading } = useHostProfile()
    const [hosts, setHosts] = useState<Host[]>([])
    const [selectedHost, setSelectedHost] = useState<Host | null>(null)
    const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [filterCharging, setFilterCharging] = useState(false)
    const [filterCheap, setFilterCheap] = useState(false)
    const [locateRequest, setLocateRequest] = useState(0)

    const needsRoleSelect = !!user && !profileLoading && !profile?.role

    const filteredHosts = hosts.filter(h =>
        (!filterCharging || (h.has_charging === true)) &&
        (!filterCheap || (Number(h.price_per_hour) < 2))
    )

    // Fetch Session & Hosts
    useEffect(() => {
        let isMounted = true
        let authSubscription: { unsubscribe: () => void } | null = null

        async function loadInitialData() {
            setLoading(true)

            // 1. Get Session
            const { data: authData } = await supabase.auth.getSession()
            if (isMounted) {
                setUser(authData.session?.user || null)
            }

            if (authData.session?.user) {
                await supabase.rpc('expire_pending_bookings')
            }

            // Listen for auth changes
            const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
                if (isMounted) {
                    setUser(session?.user || null)
                }
            })
            authSubscription = authListener.subscription

            // 2. Fetch hosts
            const { data: hostsData, error: err } = await supabase
                .from('hosts')
                .select('*')

            if (err) {
                if (isMounted) {
                    setError(err.message)
                }
                console.error('Supabase error:', err)
            } else {
                if (isMounted) {
                    setHosts(hostsData ?? [])
                }
            }

            if (isMounted) {
                setLoading(false)
            }
        }

        loadInitialData()

        return () => {
            isMounted = false
            authSubscription?.unsubscribe()
        }
    }, [])

    async function handleSignOut() {
        await supabase.auth.signOut()
    }

    const visibleCount = filteredHosts.length
    const showBottomDock = !selectedHost

    return (
        <div style={{ position: 'relative', width: '100%', minHeight: 'var(--app-viewport-height)', height: '100%', flex: 1 }}>
            {/* Loading overlay */}
            {loading && (
                <div
                    style={{
                        position: 'absolute', inset: 0, zIndex: 999, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-dark)',
                    }}
                >
                    <div className="text-gradient" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        Chargement de la carte…
                    </div>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 999, padding: 16, borderRadius: 'var(--radius-md)', background: 'rgba(255,107,107,0.15)', color: 'var(--color-danger)', fontSize: '0.9rem', textAlign: 'center' }}>
                    Erreur : {error}
                </div>
            )}

            {/* Map */}
            <MapContainer
                center={TOULOUSE_CENTER}
                zoom={DEFAULT_ZOOM}
                style={{ width: '100%', minHeight: '100%', height: '100%', zIndex: 1 }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                <EnsureMapLayout />
                <FlyToUser locateRequest={locateRequest} />
                <MapClickClose onClose={() => setSelectedHost(null)} />

                <FlyToMarker
                    position={
                        selectedHost
                            ? [selectedHost.latitude, selectedHost.longitude]
                            : null
                    }
                />

                {filteredHosts.map((host) => (
                    <Marker
                        key={host.id}
                        position={[host.latitude, host.longitude]}
                        icon={createMarkerIcon(host.has_charging ?? false)}
                        eventHandlers={{
                            click: () => setSelectedHost(host),
                        }}
                    >
                        <Popup>
                            <strong>{host.name}</strong>
                            <br />
                            {Number(host.price_per_hour).toFixed(2)} €/h
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Top Bar */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 500,
                    padding: '14px 14px 0',
                    paddingTop: 'max(14px, env(safe-area-inset-top))',
                    background: 'linear-gradient(to bottom, rgba(15,15,26,0.82), rgba(15,15,26,0))',
                    display: 'grid',
                    gap: 10,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 10,
                    }}
                >
                    <div
                        className="glass-card"
                        style={{
                            padding: '10px 12px',
                            background: 'rgba(15,15,26,0.74)',
                            maxWidth: 'min(64vw, 320px)',
                        }}
                    >
                        <h1 className="text-gradient" style={{ fontSize: '1.08rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                            ScootSafe
                        </h1>
                        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 3, lineHeight: 1.35 }}>
                            Carte publique, connexion optionnelle.
                        </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <button
                            onClick={() => navigate('/cgu')}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 11px',
                                borderRadius: '999px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(26,26,46,0.72)',
                                color: 'var(--color-text-secondary)',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            CGU
                        </button>
                        {user ? (
                            <button
                                onClick={handleSignOut}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '8px 11px',
                                    background: 'rgba(255,107,107,0.12)',
                                    border: '1px solid rgba(255,107,107,0.2)',
                                    borderRadius: '999px',
                                    color: 'var(--color-danger)',
                                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                                }}
                            >
                                <UserCircle size={14} />
                                Déconnexion
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowAuthModal(true)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '8px 11px',
                                    background: 'rgba(108,92,231,0.18)',
                                    border: '1px solid rgba(108,92,231,0.3)',
                                    borderRadius: '999px',
                                    color: 'var(--color-primary-light)',
                                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                                }}
                            >
                                <UserCircle size={14} />
                                Connexion
                            </button>
                        )}
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        gap: 8,
                        overflowX: 'auto',
                        paddingBottom: 2,
                        scrollbarWidth: 'none',
                    }}
                >
                    <button
                        onClick={() => setFilterCharging(f => !f)}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            padding: '9px 12px',
                            background: filterCharging ? 'rgba(0,206,201,0.18)' : 'rgba(15,15,26,0.72)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            border: filterCharging ? '1px solid rgba(0,206,201,0.35)' : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '999px',
                            color: filterCharging ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        ⚡ Recharge
                    </button>
                    <button
                        onClick={() => setFilterCheap(f => !f)}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            padding: '9px 12px',
                            background: filterCheap ? 'rgba(253,203,110,0.18)' : 'rgba(15,15,26,0.72)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            border: filterCheap ? '1px solid rgba(253,203,110,0.28)' : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '999px',
                            color: filterCheap ? 'var(--color-warning)' : 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        💰 Moins de 2€/h
                    </button>
                    <button
                        onClick={() => setLocateRequest((request) => request + 1)}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            padding: '9px 12px',
                            background: 'rgba(15,15,26,0.72)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '999px',
                            color: 'var(--color-text-primary)',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <Crosshair size={14} color="var(--color-accent)" />
                        Me localiser
                    </button>
                    <div
                        className="glass-card"
                        style={{
                            padding: '9px 12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: 'var(--color-text-muted)',
                            background: 'rgba(15,15,26,0.72)',
                            borderRadius: '999px',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <SlidersHorizontal size={14} color="var(--color-primary-light)" />
                        <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>{visibleCount} offre{visibleCount > 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>

            {showBottomDock && (
                <div
                    style={{
                        position: 'absolute',
                        left: 14,
                        right: 14,
                        bottom: 'max(20px, calc(env(safe-area-inset-bottom) + 24px))',
                        zIndex: 500,
                        display: 'grid',
                        gridTemplateColumns: isHost ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)',
                        gap: 10,
                        pointerEvents: 'auto',
                    }}
                >
                    <button
                        onClick={() => navigate('/bookings')}
                        aria-label="Mes Réservations"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                            padding: '14px 16px',
                            background: 'rgba(11,12,20,0.88)',
                            backdropFilter: 'blur(14px)',
                            WebkitBackdropFilter: 'blur(14px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '18px',
                            color: 'var(--color-text-primary)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 800,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.28)',
                        }}
                    >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                            <CalendarDays size={16} color="var(--color-primary-light)" />
                            Réservations
                        </span>
                        <ChevronRight size={16} color="var(--color-text-muted)" />
                    </button>
                    {isHost && (
                        <button
                            onClick={() => navigate('/host/dashboard')}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                                padding: '14px 16px',
                                background: 'linear-gradient(135deg, rgba(108,92,231,0.3), rgba(0,206,201,0.18))',
                                backdropFilter: 'blur(14px)',
                                WebkitBackdropFilter: 'blur(14px)',
                                border: '1px solid rgba(108,92,231,0.3)',
                                borderRadius: '18px',
                                color: 'var(--color-text-primary)',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: 800,
                                boxShadow: '0 10px 30px rgba(0,0,0,0.28)',
                            }}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                                <Shield size={16} color="var(--color-accent)" />
                                Espace Pro
                            </span>
                            <ChevronRight size={16} color="var(--color-text-primary)" />
                        </button>
                    )}
                </div>
            )}

            {/* Bottom Sheet */}
            {selectedHost && (
                <BottomSheet
                    host={selectedHost}
                    user={user}
                    onClose={() => setSelectedHost(null)}
                    onOpenAuth={() => setShowAuthModal(true)}
                />
            )}

            {/* Auth Modal */}
            {showAuthModal && (
                <AuthModal
                    onClose={() => setShowAuthModal(false)}
                    onSuccess={() => setShowAuthModal(false)}
                />
            )}

            {/* Role Selection Modal (post-Google OAuth) */}
            {needsRoleSelect && (
                <RoleSelectModal
                    userId={user.id}
                    onComplete={refreshProfile}
                />
            )}
        </div>
    )
}
