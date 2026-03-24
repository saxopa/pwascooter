import { useState, useEffect } from 'react'
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
    MapPin,
    Zap,
    Clock,
    X,
    CreditCard,
    Battery,
    Package,
    UserCircle,
    CheckCircle2,
    Loader2,
    CalendarDays,
} from 'lucide-react'
import ReactDOMServer from 'react-dom/server'
import { supabase } from '../lib/supabaseClient'
import type { Tables } from '../types/supabase'
import AuthModal from './AuthModal'

type Host = Tables<'hosts'>


// ────────────────────── Toulouse Center ──────────────────────
const TOULOUSE_CENTER: [number, number] = [43.6047, 1.4442]
const DEFAULT_ZOOM = 14

// ────────────────────── Custom Marker Icon ───────────────────
function createMarkerIcon(hasCharging: boolean) {
    const iconHtml = ReactDOMServer.renderToStaticMarkup(
        <div
            style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: hasCharging
                    ? 'linear-gradient(135deg, #6C5CE7, #00CEC9)'
                    : 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid rgba(255,255,255,0.9)',
                boxShadow: '0 4px 15px rgba(108,92,231,0.5)',
            }}
        >
            {hasCharging ? (
                <Zap size={18} color="white" fill="white" />
            ) : (
                <MapPin size={18} color="white" fill="white" />
            )}
        </div>
    )

    return L.divIcon({
        html: iconHtml,
        className: 'custom-marker-icon', // Animation styles from index.css
        iconSize: [40, 40],
        iconAnchor: [20, 40], // Point of the pin is at bottom-center
        popupAnchor: [0, -42], // Popup opens just above the pin
    })
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

// ────────────────────── Fly-to User ──────────────────────────
function FlyToUser() {
    const map = useMap()
    useEffect(() => {
        if (!navigator.geolocation) return
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                map.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { duration: 1 })
            },
            () => {
                // Permission denied or unavailable: stay on Toulouse
            }
        )
    }, [map])
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
    user: any
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

    const totalPrice = Number(host.price_per_hour) * selectedDuration

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

            // 3. Appel RPC anti-surbooking
            const { data: rpcData, error: rpcError } = await supabase.rpc('book_parking_spot', {
                p_host_id: host.id,
                p_user_id: user.id,
                p_start_time: startTime.toISOString(),
                p_end_time: endTime.toISOString(),
                p_total_price: Number(totalPrice.toFixed(2)),
            })

            if (rpcError) throw rpcError

            // 4. Vérifier le résultat métier
            if (!rpcData?.success) {
                if (rpcData?.error === 'PARKING_FULL') {
                    setError('Ce parking est complet pour ce créneau. Essaie une autre heure ou un autre parking.')
                } else {
                    throw new Error(rpcData?.error ?? 'Erreur lors de la réservation.')
                }
                return
            }

            // 5. Succès !
            setSuccess(true)
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Une erreur est survenue lors du paiement.')
        } finally {
            setIsPaying(false)
        }
    }

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
                        disabled={isPaying}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            opacity: isPaying ? 0.7 : 1, cursor: isPaying ? 'not-allowed' : 'pointer'
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
    const [hosts, setHosts] = useState<Host[]>([])
    const [selectedHost, setSelectedHost] = useState<Host | null>(null)
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [filterCharging, setFilterCharging] = useState(false)
    const [filterCheap, setFilterCheap] = useState(false)

    const filteredHosts = hosts.filter(h =>
        (!filterCharging || (h.has_charging === true)) &&
        (!filterCheap || (Number(h.price_per_hour) < 2))
    )

    // Fetch Session & Hosts
    useEffect(() => {
        async function loadInitialData() {
            setLoading(true)

            // 1. Get Session
            const { data: authData } = await supabase.auth.getSession()
            setUser(authData.session?.user || null)

            // Listen for auth changes
            const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
                setUser(session?.user || null)
            })

            // 2. Fetch hosts
            const { data: hostsData, error: err } = await supabase
                .from('hosts')
                .select('*')

            if (err) {
                setError(err.message)
                console.error('Supabase error:', err)
            } else {
                setHosts(hostsData ?? [])
            }

            setLoading(false)

            return () => {
                authListener.subscription.unsubscribe()
            }
        }

        loadInitialData()
    }, [])

    async function handleSignOut() {
        await supabase.auth.signOut()
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', flex: 1 }}>
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
                style={{ width: '100%', height: '100%', zIndex: 1 }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                <FlyToUser />
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

            {/* Filter Buttons */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 'max(20px, env(safe-area-inset-bottom))',
                    left: 16,
                    zIndex: 500,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}
            >
                <button
                    onClick={() => setFilterCharging(f => !f)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '10px 14px',
                        background: filterCharging ? 'rgba(0,206,201,0.25)' : 'rgba(26,26,46,0.85)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: filterCharging ? '1px solid rgba(0,206,201,0.5)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 'var(--radius-md)',
                        color: filterCharging ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                        transition: 'all 0.2s',
                    }}
                >
                    ⚡ Recharge
                </button>
                <button
                    onClick={() => setFilterCheap(f => !f)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '10px 14px',
                        background: filterCheap ? 'rgba(253,203,110,0.2)' : 'rgba(26,26,46,0.85)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: filterCheap ? '1px solid rgba(253,203,110,0.4)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 'var(--radius-md)',
                        color: filterCheap ? 'var(--color-warning)' : 'var(--color-text-secondary)',
                        cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                        transition: 'all 0.2s',
                    }}
                >
                    💰 Moins de 2€/h
                </button>
            </div>

            {/* Header overlay */}
            <div
                style={{
                    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 500,
                    padding: '16px 20px', paddingTop: 'max(16px, env(safe-area-inset-top))',
                    background: 'linear-gradient(to bottom, rgba(15,15,26,0.9), transparent)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                }}
            >
                <div style={{ pointerEvents: 'none' }}>
                    <h1 className="text-gradient" style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                        ⚡ ScootSafe
                    </h1>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                        Trouvez un parking sécurisé pour votre trottinette
                    </p>
                </div>
                <button
                    onClick={() => navigate('/bookings')}
                    aria-label="Mes Réservations"
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px',
                        background: 'rgba(26,26,46,0.85)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        flexShrink: 0,
                        pointerEvents: 'auto',
                    }}
                >
                    <CalendarDays size={15} color="var(--color-primary-light)" />
                    Mes réservations
                </button>
                {/* Auth state button */}
                {user ? (
                    <button
                        onClick={handleSignOut}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 12px',
                            background: 'rgba(255,107,107,0.12)',
                            border: '1px solid rgba(255,107,107,0.2)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--color-danger)',
                            cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                            flexShrink: 0, pointerEvents: 'auto', marginTop: 6,
                        }}
                    >
                        <UserCircle size={14} />
                        Déconnexion
                    </button>
                ) : (
                    <button
                        onClick={() => setShowAuthModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 12px',
                            background: 'rgba(108,92,231,0.18)',
                            border: '1px solid rgba(108,92,231,0.3)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--color-primary-light)',
                            cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                            flexShrink: 0, pointerEvents: 'auto', marginTop: 6,
                        }}
                    >
                        <UserCircle size={14} />
                        Connexion
                    </button>
                )}
            </div>

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
        </div>
    )
}
