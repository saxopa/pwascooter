import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X, ShieldAlert, Package, Users } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Profile = {
    id: string
    email: string
    nom: string
    company_name: string | null
    role: string
    host_status: string
    created_at: string
}

export default function AdminDashboard() {
    const navigate = useNavigate()
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [stats, setStats] = useState({ hosts: 0, pending: 0, users: 0 })

    useEffect(() => {
        async function loadProfiles() {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })

            if (data) {
                setProfiles(data as Profile[])
                setStats({
                    hosts: data.filter(p => p.role === 'host' && p.host_status === 'approved').length,
                    pending: data.filter(p => p.host_status === 'pending').length,
                    users: data.length
                })
            }
        }
        void loadProfiles()
    }, [])

    async function handleStatusUpdate(userId: string, newStatus: 'approved' | 'rejected', newRole: 'host' | 'user') {
        const { error } = await supabase.rpc('admin_update_host_status', {
            p_user_id: userId,
            p_new_status: newStatus,
            p_new_role: newRole
        })

        if (!error) {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })

            if (data) {
                setProfiles(data as Profile[])
                setStats({
                    hosts: data.filter(p => p.role === 'host' && p.host_status === 'approved').length,
                    pending: data.filter(p => p.host_status === 'pending').length,
                    users: data.length
                })
            }
        } else {
            console.error(error)
            alert("Erreur lors de la mise à jour : " + error.message)
        }
    }

    const pendingRequests = profiles.filter(p => p.host_status === 'pending')
    const activeHosts = profiles.filter(p => p.role === 'host' && p.host_status === 'approved')

    return (
        <div style={{ minHeight: 'var(--app-viewport-height)', background: 'var(--color-bg-dark)', display: 'flex', flexDirection: 'column' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h1 className="text-gradient" style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                            Administration
                        </h1>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, padding: '20px 16px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                    <div className="glass-card" style={{ padding: '16px 14px', textAlign: 'center' }}>
                        <Users size={20} color="var(--color-primary-light)" style={{ margin: '0 auto 6px' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{stats.users}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Utilisateurs</div>
                    </div>
                    <div className="glass-card" style={{ padding: '16px 14px', textAlign: 'center' }}>
                        <ShieldAlert size={20} color="var(--color-warning)" style={{ margin: '0 auto 6px' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{stats.pending}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Demandes Hôte</div>
                    </div>
                    <div className="glass-card" style={{ padding: '16px 14px', textAlign: 'center' }}>
                        <Package size={20} color="var(--color-success)" style={{ margin: '0 auto 6px' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{stats.hosts}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Hôtes Actifs</div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Demandes en attente ({pendingRequests.length})</h2>
                </div>

                {pendingRequests.length === 0 && (
                    <div className="glass-card" style={{ padding: 24, textAlign: 'center', marginBottom: 24 }}>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Aucune demande en attente.</p>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                    {pendingRequests.map(p => (
                        <div key={p.id} className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'white' }}>{p.company_name || p.nom}</div>
                                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{p.email}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    onClick={() => handleStatusUpdate(p.id, 'approved', 'host')}
                                    style={{
                                        flex: 1, padding: '8px', background: 'rgba(0,184,148,0.15)', border: '1px solid rgba(0,184,148,0.3)',
                                        borderRadius: '6px', color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.85rem'
                                    }}>
                                    <Check size={16} /> Approuver
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate(p.id, 'rejected', 'user')}
                                    style={{
                                        flex: 1, padding: '8px', background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)',
                                        borderRadius: '6px', color: 'var(--color-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.85rem'
                                    }}>
                                    <X size={16} /> Rejeter
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Hôtes actifs ({activeHosts.length})</h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {activeHosts.map(p => (
                        <div key={p.id} className="glass-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>{p.company_name || p.nom}</div>
                                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{p.email}</div>
                            </div>
                            <button
                                onClick={() => handleStatusUpdate(p.id, 'rejected', 'user')}
                                style={{
                                    padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '6px', color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600
                                }}>
                                Révoquer
                            </button>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    )
}
