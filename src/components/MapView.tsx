import 'leaflet/dist/leaflet.css'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    MapContainer,
    TileLayer,
    Marker,
    useMap,
    useMapEvents,
} from 'react-leaflet'
import {
    CalendarDays,
    Crosshair,
    SlidersHorizontal,
    Shield,
    ShieldAlert,
    ChevronRight,
    UserCircle,
} from 'lucide-react'
import type { Tables } from '../types/supabase'
import AuthModal from './AuthModal'
import RoleSelectModal from './RoleSelectModal'
import { useHostProfile } from '../hooks/useHostProfile'
import { useHosts } from '../contexts/HostsContext'
import { useExpirePendingBookings } from '../hooks/useExpirePendingBookings'
import HostMarker, { getUserMarkerIcon } from './map/HostMarker'
import BottomSheet from './booking/BottomSheet'

type Host = Tables<'hosts'>

const TOULOUSE_CENTER: [number, number] = [43.6047, 1.4442]
const DEFAULT_ZOOM = 14

// ─── Map helpers ──────────────────────────────────────────────
function FlyToMarker({ position }: { position: [number, number] | null }) {
    const map = useMap()
    useEffect(() => {
        if (position) map.flyTo(position, 16, { duration: 0.8 })
    }, [position, map])
    return null
}

function EnsureMapLayout() {
    const map = useMap()
    useEffect(() => {
        const invalidate = () => window.requestAnimationFrame(() => map.invalidateSize())
        invalidate()
        const timer = window.setTimeout(invalidate, 250)
        window.addEventListener('resize', invalidate)
        document.addEventListener('visibilitychange', () => { if (!document.hidden) invalidate() })
        return () => {
            window.clearTimeout(timer)
            window.removeEventListener('resize', invalidate)
        }
    }, [map])
    return null
}

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
    const hostsRef = useRef(hosts)
    const callbackRef = useRef(onNearestFound)

    useEffect(() => { hostsRef.current = hosts; callbackRef.current = onNearestFound }, [hosts, onNearestFound])

    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371, toRad = (x: number) => x * Math.PI / 180
        const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1)
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }

    useEffect(() => {
        if (!locateRequest || !navigator.geolocation) return
        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude: lat, longitude: lng } = pos.coords
            map.flyTo([lat, lng], 15, { duration: 1 })
            const current = hostsRef.current
            if (current.length > 0) {
                const closest = current.reduce((best, h) =>
                    haversine(lat, lng, h.latitude, h.longitude) < haversine(lat, lng, best.latitude, best.longitude) ? h : best
                )
                setTimeout(() => callbackRef.current(closest), 400)
            }
        }, () => {})
    }, [locateRequest, map])

    return null
}

function UserLocationMarker() {
    const [position, setPosition] = useState<[number, number] | null>(null)
    useEffect(() => {
        if (!navigator.geolocation) return
        let lastUpdate = 0
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const now = Date.now()
                if (now - lastUpdate >= 3000) { setPosition([pos.coords.latitude, pos.coords.longitude]); lastUpdate = now }
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        )
        return () => navigator.geolocation.clearWatch(watchId)
    }, [])
    if (!position) return null
    return <Marker position={position} icon={getUserMarkerIcon()} zIndexOffset={100} />
}

function MapClickClose({ onClose }: { onClose: () => void }) {
    useMapEvents({ click: onClose })
    return null
}

// ─── MapView ──────────────────────────────────────────────────
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

    useExpirePendingBookings(user?.id)

    useEffect(() => {
        const key = user?.id ?? 'anonymous'
        if (hostsRefreshKeyRef.current === key) return
        hostsRefreshKeyRef.current = key
        void refreshHosts()
    }, [refreshHosts, user?.id])

    const filteredHosts = useMemo(() => hosts.filter(h =>
        (!filterCharging || (h.has_charging === true)) &&
        (!filterCheap || (Number(h.price_per_hour) < 2))
    ), [hosts, filterCharging, filterCheap])

    const handleSelectHost = useCallback((host: Host) => setSelectedHost(host), [])

    async function handleSignOut() {
        const { supabase } = await import('../lib/supabaseClient')
        await supabase.auth.signOut()
    }

    const visibleCount = filteredHosts.length

    return (
        <div style={{ position: 'relative', width: '100%', minHeight: 'var(--app-viewport-height)', height: '100%', flex: 1 }}>
            {hostsLoading && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-dark)' }}>
                    <div className="text-gradient" style={{ fontSize: '1.1rem', fontWeight: 600 }}>Chargement de la carte…</div>
                </div>
            )}

            {hostsError && (
                <div style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 999, padding: 16, borderRadius: 'var(--radius-md)', background: 'rgba(255,107,107,0.15)', color: 'var(--color-danger)', fontSize: '0.9rem', textAlign: 'center' }}>
                    Erreur : {hostsError}
                </div>
            )}

            <MapContainer center={TOULOUSE_CENTER} zoom={DEFAULT_ZOOM} style={{ width: '100%', minHeight: '100%', height: '100%', zIndex: 1 }} zoomControl={false}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <EnsureMapLayout />
                <FlyToUser locateRequest={locateRequest} hosts={filteredHosts} onNearestFound={handleSelectHost} />
                <MapClickClose onClose={() => setSelectedHost(null)} />
                <UserLocationMarker />
                <FlyToMarker position={selectedHost ? [selectedHost.latitude, selectedHost.longitude] : null} />
                {filteredHosts.map((host) => (
                    <HostMarker key={host.id} host={host} onSelect={handleSelectHost} />
                ))}
            </MapContainer>

            {/* Top Bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 500, padding: '14px 14px 0', paddingTop: 'max(14px, env(safe-area-inset-top))', background: 'linear-gradient(to bottom, rgba(15,15,26,0.82), rgba(15,15,26,0))', display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div className="glass-card" style={{ padding: '10px 12px', background: 'rgba(15,15,26,0.74)', maxWidth: 'min(64vw, 320px)' }}>
                        <h1 className="text-gradient" style={{ fontSize: '1.08rem', fontWeight: 800, letterSpacing: '-0.02em' }}>ScootSafe</h1>
                        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 3, lineHeight: 1.35 }}>Carte publique, connexion optionnelle.</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <button onClick={() => navigate('/cgu')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 11px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(26,26,46,0.72)', color: 'var(--color-text-secondary)', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>CGU</button>
                        {profile?.role === 'admin' && (
                            <button onClick={() => navigate('/admin')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 11px', borderRadius: '999px', border: '1px solid rgba(0,184,148,0.2)', background: 'rgba(0,184,148,0.1)', color: 'var(--color-success)', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>
                                <ShieldAlert size={14} /> Admin
                            </button>
                        )}
                        {user ? (
                            <button onClick={handleSignOut} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 11px', background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: '999px', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                                <UserCircle size={14} /> Déconnexion
                            </button>
                        ) : (
                            <button onClick={() => setShowAuthModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 11px', background: 'rgba(108,92,231,0.18)', border: '1px solid rgba(108,92,231,0.3)', borderRadius: '999px', color: 'var(--color-primary-light)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                                <UserCircle size={14} /> Connexion
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
                    {[
                        { label: '⚡ Recharge', active: filterCharging, color: 'var(--color-accent)', borderColor: 'rgba(0,206,201,0.35)', bg: 'rgba(0,206,201,0.18)', onClick: () => setFilterCharging(f => !f) },
                        { label: '💰 Moins de 2€/h', active: filterCheap, color: 'var(--color-warning)', borderColor: 'rgba(253,203,110,0.28)', bg: 'rgba(253,203,110,0.18)', onClick: () => setFilterCheap(f => !f) },
                    ].map(({ label, active, color, borderColor, bg, onClick }) => (
                        <button key={label} onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 12px', background: active ? bg : 'rgba(15,15,26,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: active ? `1px solid ${borderColor}` : '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', color: active ? color : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {label}
                        </button>
                    ))}
                    <button onClick={() => setLocateRequest(r => r + 1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 12px', background: 'rgba(15,15,26,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        <Crosshair size={14} color="var(--color-accent)" /> Me localiser
                    </button>
                    <div className="glass-card" style={{ padding: '9px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', background: 'rgba(15,15,26,0.72)', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                        <SlidersHorizontal size={14} color="var(--color-primary-light)" />
                        <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>{visibleCount} offre{visibleCount > 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Dock */}
            {!selectedHost && (
                <div style={{ position: 'absolute', left: 14, right: 14, bottom: 'max(20px, calc(env(safe-area-inset-bottom) + 24px))', zIndex: 500, display: 'grid', gridTemplateColumns: isHost ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)', gap: 10, pointerEvents: 'auto' }}>
                    <button onClick={() => navigate('/bookings')} aria-label="Mes Réservations" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px', background: 'rgba(11,12,20,0.88)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 800, boxShadow: '0 10px 30px rgba(0,0,0,0.28)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><CalendarDays size={16} color="var(--color-primary-light)" />Réservations</span>
                        <ChevronRight size={16} color="var(--color-text-muted)" />
                    </button>
                    {isHost && (
                        <button onClick={() => navigate('/host/dashboard')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px', background: 'linear-gradient(135deg, rgba(108,92,231,0.3), rgba(0,206,201,0.18))', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(108,92,231,0.3)', borderRadius: '18px', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 800, boxShadow: '0 10px 30px rgba(0,0,0,0.28)' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><Shield size={16} color="var(--color-accent)" />Espace Pro</span>
                            <ChevronRight size={16} color="var(--color-text-primary)" />
                        </button>
                    )}
                </div>
            )}

            {selectedHost && (
                <BottomSheet host={selectedHost} user={user} onClose={() => setSelectedHost(null)} onOpenAuth={() => setShowAuthModal(true)} />
            )}

            {showAuthModal && (
                <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} />
            )}

            {needsRoleSelect && (
                <RoleSelectModal userId={user.id} onComplete={refreshProfile} />
            )}
        </div>
    )
}
