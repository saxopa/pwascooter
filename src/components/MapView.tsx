import 'leaflet/dist/leaflet.css'
import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react'
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
    Navigation,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { Tables } from '../types/supabase'
import AuthModal from './AuthModal'
import RoleSelectModal from './RoleSelectModal'
import { useHostProfile } from '../hooks/useHostProfile'
import { useHosts } from '../contexts/HostsContext'
import BookingCodeCard from './BookingCodeCard'
import { resolveBookingPickupCode } from '../lib/bookingCode'
import { sendBookingNotification } from '../lib/bookingNotifications'
import { invokeAuthedFunction } from '../lib/invokeAuthedFunction'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import CheckoutForm, { type ConfirmedBookingPayload } from './CheckoutForm'

type Host = Tables<'hosts'>

// Chargement lazy de Stripe — uniquement quand le paiement est requis
let stripePromiseCache: ReturnType<typeof loadStripe> | null = null
function getStripePromise() {
    const key = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined
    
    // DEBUG: Log la clé Stripe (masquée)
    console.log('[DEBUG] VITE_STRIPE_PUBLIC_KEY exists:', !!key)
    console.log('[DEBUG] VITE_STRIPE_PUBLIC_KEY length:', key?.length ?? 0)
    if (key && key.length > 8) {
        console.log('[DEBUG] VITE_STRIPE_PUBLIC_KEY prefix:', key.substring(0, 8) + '...' + key.substring(key.length - 4))
    }
    
    if (!key || key.trim() === '') {
        console.error('[DEBUG] VITE_STRIPE_PUBLIC_KEY is empty or undefined!')
        return null
    }
    if (!stripePromiseCache) {
        console.log('[DEBUG] Calling loadStripe()...')
        stripePromiseCache = loadStripe(key)
        console.log('[DEBUG] loadStripe() returned:', stripePromiseCache)
    }
    return stripePromiseCache
}
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

// ────────────────────── User Location Marker ───────────────────
let userMarkerIcon: L.DivIcon | null = null

function getUserMarkerIcon() {
    if (userMarkerIcon) return userMarkerIcon

    const iconHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
            <div style="position: absolute; width: 28px; height: 28px; background: rgba(0, 122, 255, 0.4); border-radius: 50%; animation: marker-pulse 2s ease-in-out infinite;"></div>
            <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background: #007AFF; border: 2.5px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>
        </div>
    `

    userMarkerIcon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    })

    return userMarkerIcon
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
function FlyToUser({
    locateRequest,
    hosts,
    onNearestFound,
}: {
    locateRequest: number
    hosts: Host[]
    onNearestFound: (host: Host) => void
}) {
    const map = useMap()
    
    // Prevent infinite loops by keeping refs to rapidly changing arrays/functions
    const hostsRef = useRef(hosts)
    const callbackRef = useRef(onNearestFound)

    useEffect(() => {
        hostsRef.current = hosts
        callbackRef.current = onNearestFound
    }, [hosts, onNearestFound])

    // Haversine formula
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371
        const dLat = (lat2 - lat1) * (Math.PI / 180)
        const dLon = (lon2 - lon1) * (Math.PI / 180)
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    // GPS continuous tracking is now fully handled by UserLocationMarker
    // No watchPosition here — prevents re-render cascade

    // Wait for locate request
    useEffect(() => {
        if (!locateRequest || !navigator.geolocation) return

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude
                const lng = pos.coords.longitude
                
                // Fly to the user
                map.flyTo([lat, lng], 15, { duration: 1 })
                
                // Find nearest host
                const currentHosts = hostsRef.current
                if (currentHosts.length > 0) {
                    let closest = currentHosts[0]
                    let minDist = getDistance(lat, lng, currentHosts[0].latitude, currentHosts[0].longitude)
                    
                    for (let i = 1; i < currentHosts.length; i++) {
                        const dist = getDistance(lat, lng, currentHosts[i].latitude, currentHosts[i].longitude)
                        if (dist < minDist) {
                            minDist = dist
                            closest = currentHosts[i]
                        }
                    }
                    
                    // Show nearest spot's info automatically
                    setTimeout(() => callbackRef.current(closest), 400)
                }
            },
            () => {}
        )
    }, [locateRequest, map])

    return null
}

// ────────────────────── Isolated User Location Marker ────────
// FIX A: GPS updates are completely isolated here — they never
// trigger a re-render of the parent MapView or host markers.
function UserLocationMarker() {
    const [position, setPosition] = useState<[number, number] | null>(null)

    useEffect(() => {
        if (!navigator.geolocation) return
        let lastUpdate = 0
        const MIN_UPDATE_INTERVAL = 3000

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const now = Date.now()
                if (now - lastUpdate >= MIN_UPDATE_INTERVAL) {
                    setPosition([pos.coords.latitude, pos.coords.longitude])
                    lastUpdate = now
                }
            },
            () => { /* ignore */ },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        )
        return () => navigator.geolocation.clearWatch(watchId)
    }, [])

    if (!position) return null
    return <Marker position={position} icon={getUserMarkerIcon()} zIndexOffset={100} />
}

// ────────────────────── Memoized Host Marker ─────────────────
// FIX D: eventHandlers are created once per host, not on every render.
const HostMarkerMemo = memo(function HostMarkerMemo({
    host,
    onSelect,
}: {
    host: Host
    onSelect: (host: Host) => void
}) {
    const handlers = useMemo(() => ({
        click: () => onSelect(host),
    }), [host, onSelect])

    return (
        <Marker
            position={[host.latitude, host.longitude]}
            icon={createMarkerIcon(host.has_charging ?? false)}
            eventHandlers={handlers}
        >
            <Popup>
                <strong>{host.name}</strong>
                <br />
                {Number(host.price_per_hour).toFixed(2)} €/h
            </Popup>
        </Marker>
    )
})

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
    const isMountedRef = useRef(true)
    useEffect(() => {
        return () => { isMountedRef.current = false }
    }, [])

    const [selectedDuration, setSelectedDuration] = useState(1) // par défaut 1h
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
            // 1. Préparer les dates
            const startTime = new Date()
            const endTime = new Date()
            endTime.setHours(endTime.getHours() + selectedDuration)
            setConfirmedStartTime(startTime.toISOString())
            setConfirmedEndTime(endTime.toISOString())

            // DEBUG: Log avant appel Edge Function
            console.log('[DEBUG] Calling create-payment-intent with hostId:', host.id)
            console.log('[DEBUG] startTime:', startTime.toISOString())
            console.log('[DEBUG] endTime:', endTime.toISOString())
            // 2. Initialiser Stripe Payment Intent avec calcul serveur autoritaire
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 8000)

            const { data: intentData, error: intentError } = await invokeAuthedFunction<{
                clientSecret?: string
                paymentIntentId?: string
            }>('create-payment-intent', {
                body: {
                    hostId: host.id,
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                },
                signal: controller.signal
            })

            clearTimeout(timeoutId)
            // DEBUG: Log réponse Edge Function
            console.log('[DEBUG] create-payment-intent response:', { intentData, intentError })

            if (intentError || !intentData?.clientSecret || !intentData?.paymentIntentId) {
                const invokeMessage = intentError?.message ?? ''
                if (invokeMessage.includes('AUTH_SESSION') || invokeMessage.includes('SESSION_EXPIRED_NEED_RELOGIN')) {
                    throw new Error('SESSION_EXPIRED_NEED_RELOGIN')
                }
                throw new Error('Erreur lors de l’initialisation du paiement sécurisé (Stripe).')
            }

            // 3. Enregistrer l'intention de paiement. La réservation ne sera créée qu'après confirmation serveur.
            console.log('[DEBUG] Payment intent created successfully:', intentData.paymentIntentId)
            setPaymentIntentId(intentData.paymentIntentId)
            setClientSecret(intentData.clientSecret)
        } catch (err: unknown) {
            console.error(err)
            if (isMountedRef.current) {
                const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue lors du paiement.'
                if (errorMessage === 'SESSION_EXPIRED_NEED_RELOGIN') {
                    setError('Votre session a expiré. Veuillez vous reconnecter.')
                    // Proposer un bouton de reconnexion
                } else {
                    setError(errorMessage)
                }
            }
        } finally {
            if (isMountedRef.current) setIsPaying(false)
        }
    }

    async function handlePaymentSuccess(payload: ConfirmedBookingPayload) {
        try {
            const bookingId = payload.bookingId
            const pickupCode = resolveBookingPickupCode(payload.pickupCode, bookingId)
            if (!isMountedRef.current) return
            setConfirmedBookingId(bookingId)
            setConfirmedPickupCode(pickupCode)
            void sendBookingNotification('booking_created', bookingId)

            // Stockage local de la réservation (sauvegarde hors ligne/cache)
            const saveToLocalStorage = (data: object) => {
                try {
                    localStorage.setItem('scootsafe_latest_booking', JSON.stringify(data))
                } catch {
                    // Silencieux — la sauvegarde locale est optionnelle
                    // Ne jamais laisser remonter cette erreur dans le flow paiement
                }
            }

            saveToLocalStorage({
                bookingId,
                pickupCode: pickupCode,
                hostName: host.name,
                hostLat: host.latitude,
                hostLng: host.longitude,
                startTime: confirmedStartTime,
                endTime: confirmedEndTime,
                totalPrice: Number(totalPrice.toFixed(2))
            })
            
            // CAS B: Déplace la génération QR pour libérer le main thread de Safari
            setTimeout(() => {
                if (isMountedRef.current) setSuccess(true)
            }, 0)
        } catch (err) {
            console.error(err)
            if (isMountedRef.current) {
                setError('Délai dépassé ou erreur réseau lors de la récupération du code.')
            }
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

    if (clientSecret && paymentIntentId && !success) {
        const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined
        const isKeyMissing = !stripeKey || stripeKey.trim() === ''

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
                            cursor: 'pointer', color: 'var(--color-text-secondary)', zIndex: 10
                        }}
                    >
                        <X size={18} />
                    </button>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>Paiement sécurisé</h2>
                    
                    {isKeyMissing ? (
                        <div style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', padding: 16, borderRadius: 8, fontSize: '0.9rem', marginBottom: 24 }}>
                            <strong>Erreur Critique</strong><br/>
                            La clé VITE_STRIPE_PUBLIC_KEY est introuvable.<br/>
                            Si vous déployez sur Vercel/Netlify/Vite, veuillez l'ajouter dans les variables de déploiement.
                        </div>
                    ) : (
                        <Elements stripe={getStripePromise()} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#6C5CE7', colorBackground: '#1a1a2e', colorText: '#ffffff', colorDanger: '#ff6b6b' } } }}>
                            <CheckoutForm paymentIntentId={paymentIntentId} onSuccess={handlePaymentSuccess} />
                        </Elements>
                    )}
                </div>
            </>
        )
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

                {isLegacyDemoHost && (
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: 16, padding: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)' }}>
                        Place de démonstration réaffichée pour la carte. La réservation est désactivée tant qu’aucun commerçant validé n’y est rattaché.
                    </div>
                )}

                {/* Auth / CTA Button & Itinerary */}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                        onClick={() => {
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${host.latitude},${host.longitude}`
                            window.open(url, '_blank')
                        }}
                        style={{
                            flex: '0 0 auto',
                            padding: '14px',
                            background: 'rgba(255,255,255,0.08)', color: 'white',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            cursor: 'pointer', fontWeight: 600,
                        }}
                        title="S'y rendre (Itinéraire Google Maps)"
                    >
                        <Navigation size={18} />
                    </button>

                    {isLegacyDemoHost ? (
                        <button
                            disabled
                            style={{
                                flex: 1, padding: '14px 20px',
                                background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)',
                                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                cursor: 'not-allowed', fontWeight: 600, whiteSpace: 'nowrap',
                            }}
                        >
                            <Package size={18} />
                            Place de démonstration
                        </button>
                    ) : !user ? (
                        <button
                            onClick={onOpenAuth}
                            style={{
                                flex: 1, padding: '14px 20px',
                                background: 'rgba(255,255,255,0.08)', color: 'white',
                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                cursor: 'pointer', fontWeight: 600,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <UserCircle size={18} />
                            Se connecter pour réserver
                        </button>
                    ) : (
                        <button
                            className="btn-primary"
                            onClick={handleBook}
                            disabled={isPaying || isSelfBooking || isLegacyDemoHost}
                            style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                opacity: isPaying || isSelfBooking || isLegacyDemoHost ? 0.7 : 1,
                                cursor: isPaying || isSelfBooking || isLegacyDemoHost ? 'not-allowed' : 'pointer',
                                padding: '14px 20px',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {isPaying ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                                    En cours...
                                </>
                            ) : (
                                <>
                                    <CreditCard size={18} />
                                    Payer ({totalPrice.toFixed(2)} €)
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </>
    )
}

// ────────────────────── MapView Component ────────────────────
export default function MapView() {
    const navigate = useNavigate()
    const { user, profile, isHost, refreshProfile, loading: profileLoading } = useHostProfile()
    const { hosts, loading: hostsLoading, error: hostsError, refreshHosts } = useHosts()
    const [selectedHost, setSelectedHost] = useState<Host | null>(null)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [filterCharging, setFilterCharging] = useState(false)
    const [filterCheap, setFilterCheap] = useState(false)
    const [locateRequest, setLocateRequest] = useState(0)
    const hostsRefreshKeyRef = useRef<string | null>(null)

    const needsRoleSelect = !!user && !profileLoading && !profile?.role

    // FIX D: memoize filteredHosts to avoid recalculation on every render
    const filteredHosts = useMemo(() => hosts.filter(h =>
        (!filterCharging || (h.has_charging === true)) &&
        (!filterCheap || (Number(h.price_per_hour) < 2))
    ), [hosts, filterCharging, filterCheap])

    // Stable callback for host selection (used by memoized markers)
    const handleSelectHost = useCallback((host: Host) => {
        setSelectedHost(host)
    }, [])

    // Expire pending bookings once on mount (if user is logged in)
    useEffect(() => {
        if (user) {
            void supabase.rpc('expire_pending_bookings')
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!user]) // only re-run when user goes from null->truthy or vice versa

    useEffect(() => {
        const refreshKey = user?.id ?? 'anonymous'
        if (hostsRefreshKeyRef.current === refreshKey) return
        hostsRefreshKeyRef.current = refreshKey
        void refreshHosts()
    }, [refreshHosts, user?.id])

    async function handleSignOut() {
        await supabase.auth.signOut()
    }

    const loading = hostsLoading
    const error = hostsError
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
                <FlyToUser
                    locateRequest={locateRequest}
                    hosts={filteredHosts}
                    onNearestFound={handleSelectHost}
                />
                <MapClickClose onClose={() => setSelectedHost(null)} />

                {/* FIX A: GPS isolated — only this sub-component re-renders on position change */}
                <UserLocationMarker />

                <FlyToMarker
                    position={
                        selectedHost
                            ? [selectedHost.latitude, selectedHost.longitude]
                            : null
                    }
                />

                {/* FIX D: Each marker is memoized — eventHandlers are stable */}
                {filteredHosts.map((host) => (
                    <HostMarkerMemo
                        key={host.id}
                        host={host}
                        onSelect={handleSelectHost}
                    />
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
