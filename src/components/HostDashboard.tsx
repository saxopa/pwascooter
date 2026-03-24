import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ArrowLeft,
    MapPin,
    Plus,
    Zap,
    TrendingUp,
    CalendarDays,
    Package,
    Loader2,
    ToggleLeft,
    ToggleRight,
    Pencil,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useHostProfile } from '../hooks/useHostProfile'
import HostSpaceForm from './HostSpaceForm'
import type { Tables } from '../types/supabase'

type Host = Tables<'hosts'>

export default function HostDashboard() {
    const navigate = useNavigate()
    const { user, profile } = useHostProfile()
    const [spaces, setSpaces] = useState<Host[]>([])
    const [bookingsCount, setBookingsCount] = useState(0)
    const [revenue, setRevenue] = useState(0)
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingSpace, setEditingSpace] = useState<Host | null>(null)
    const [togglingId, setTogglingId] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        if (!user) return
        setLoading(true)

        const { data: spacesData } = await supabase
            .from('hosts')
            .select('*')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false })

        const hostSpaces = (spacesData ?? []) as Host[]
        setSpaces(hostSpaces)

        if (hostSpaces.length > 0) {
            const spaceIds = hostSpaces.map(s => s.id)
            const startOfMonth = new Date()
            startOfMonth.setDate(1)
            startOfMonth.setHours(0, 0, 0, 0)

            const { data: bookingsData } = await supabase
                .from('bookings')
                .select('total_price')
                .in('host_id', spaceIds)
                .gte('created_at', startOfMonth.toISOString())

            const bookings = bookingsData ?? []
            setBookingsCount(bookings.length)
            setRevenue(bookings.reduce((sum, b) => sum + Number(b.total_price), 0))
        }

        setLoading(false)
    }, [user])

    useEffect(() => {
        if (!user) return
        queueMicrotask(() => {
            void loadData()
        })
    }, [user, loadData])

    async function toggleActive(space: Host) {
        setTogglingId(space.id)
        const newActive = !space.is_active
        await supabase
            .from('hosts')
            .update({ is_active: newActive })
            .eq('id', space.id)

        setSpaces(prev => prev.map(s =>
            s.id === space.id ? { ...s, is_active: newActive } : s
        ))
        setTogglingId(null)
    }

    function handleFormSaved() {
        setShowForm(false)
        setEditingSpace(null)
        loadData()
    }

    if (showForm || editingSpace) {
        return (
            <HostSpaceForm
                space={editingSpace}
                onSaved={handleFormSaved}
                onCancel={() => { setShowForm(false); setEditingSpace(null) }}
            />
        )
    }

    const activeSpaces = spaces.filter(s => s.is_active !== false)

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div
                style={{
                    padding: '16px 20px',
                    paddingTop: 'max(20px, env(safe-area-inset-top))',
                    background: 'linear-gradient(to bottom, rgba(15,15,26,0.98), rgba(15,15,26,0.85))',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', gap: 12,
                    position: 'sticky', top: 0, zIndex: 10,
                    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                }}
            >
                <button
                    onClick={() => navigate('/map')}
                    aria-label="Retour à la carte"
                    style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '50%', width: 38, height: 38,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--color-text-primary)', flexShrink: 0,
                    }}
                >
                    <ArrowLeft size={18} />
                </button>
                <div style={{ flex: 1 }}>
                    <h1 className="text-gradient" style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                        Espace Pro
                    </h1>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 1 }}>
                        {profile?.company_name ?? '⚡ ScootSafe'}
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                        border: 'none', borderRadius: 'var(--radius-md)',
                        color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        boxShadow: '0 4px 15px rgba(108,92,231,0.4)',
                    }}
                >
                    <Plus size={15} />
                    Ajouter
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '20px 16px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary-light)' }} />
                    </div>
                ) : (
                    <>
                        {/* Stats cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                            <div className="glass-card" style={{ padding: '16px 14px', textAlign: 'center' }}>
                                <MapPin size={20} color="var(--color-primary-light)" style={{ margin: '0 auto 6px' }} />
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{activeSpaces.length}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Places actives</div>
                            </div>
                            <div className="glass-card" style={{ padding: '16px 14px', textAlign: 'center' }}>
                                <CalendarDays size={20} color="var(--color-accent)" style={{ margin: '0 auto 6px' }} />
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{bookingsCount}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Ce mois</div>
                            </div>
                            <div className="glass-card" style={{ padding: '16px 14px', textAlign: 'center' }}>
                                <TrendingUp size={20} color="var(--color-success)" style={{ margin: '0 auto 6px' }} />
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{revenue.toFixed(0)}€</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Revenus</div>
                            </div>
                        </div>

                        {/* Section title */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Mes places ({spaces.length})</h2>
                        </div>

                        {/* Empty state */}
                        {spaces.length === 0 && (
                            <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
                                <Package size={48} color="var(--color-text-muted)" style={{ margin: '0 auto 16px' }} />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>
                                    Aucune place créée
                                </h3>
                                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
                                    Ajoute ta première place de parking pour commencer à recevoir des réservations.
                                </p>
                                <button
                                    className="btn-primary"
                                    onClick={() => setShowForm(true)}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                                >
                                    <Plus size={17} />
                                    Ajouter une place
                                </button>
                            </div>
                        )}

                        {/* Spaces list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {spaces.map(space => {
                                const isActive = space.is_active !== false
                                return (
                                    <div
                                        key={space.id}
                                        className="glass-card"
                                        style={{
                                            padding: '16px 18px',
                                            borderRadius: 'var(--radius-md)',
                                            opacity: isActive ? 1 : 0.5,
                                            transition: 'opacity 0.2s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{space.name}</div>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                                        padding: '3px 8px', borderRadius: 6,
                                                        background: 'rgba(108,92,231,0.15)', color: 'var(--color-primary-light)',
                                                        fontSize: '0.75rem', fontWeight: 600,
                                                    }}>
                                                        {Number(space.price_per_hour).toFixed(2)}€/h
                                                    </span>
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                                        padding: '3px 8px', borderRadius: 6,
                                                        background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)',
                                                        fontSize: '0.75rem', fontWeight: 600,
                                                    }}>
                                                        <Package size={12} /> {space.capacity}
                                                    </span>
                                                    {space.has_charging && (
                                                        <span style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                                            padding: '3px 8px', borderRadius: 6,
                                                            background: 'rgba(0,206,201,0.15)', color: 'var(--color-accent)',
                                                            fontSize: '0.75rem', fontWeight: 600,
                                                        }}>
                                                            <Zap size={12} /> Recharge
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: 6,
                                                background: isActive ? 'rgba(0,184,148,0.15)' : 'rgba(108,108,128,0.15)',
                                                color: isActive ? 'var(--color-success)' : 'var(--color-text-muted)',
                                                fontSize: '0.72rem', fontWeight: 700,
                                            }}>
                                                {isActive ? 'Actif' : 'Inactif'}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => setEditingSpace(space)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 5,
                                                    padding: '6px 12px',
                                                    background: 'rgba(255,255,255,0.06)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    color: 'var(--color-text-secondary)',
                                                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                                                }}
                                            >
                                                <Pencil size={13} /> Modifier
                                            </button>
                                            <button
                                                onClick={() => toggleActive(space)}
                                                disabled={togglingId === space.id}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 5,
                                                    padding: '6px 12px',
                                                    background: isActive ? 'rgba(255,107,107,0.1)' : 'rgba(0,184,148,0.1)',
                                                    border: `1px solid ${isActive ? 'rgba(255,107,107,0.2)' : 'rgba(0,184,148,0.2)'}`,
                                                    borderRadius: 'var(--radius-sm)',
                                                    color: isActive ? 'var(--color-danger)' : 'var(--color-success)',
                                                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                                                    opacity: togglingId === space.id ? 0.5 : 1,
                                                }}
                                            >
                                                {isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                                                {isActive ? 'Désactiver' : 'Activer'}
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
