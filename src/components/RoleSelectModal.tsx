import { useState } from 'react'
import { Building2, User, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

interface RoleSelectModalProps {
    userId: string
    onComplete: () => Promise<void> | void
}

export default function RoleSelectModal({ userId, onComplete }: RoleSelectModalProps) {
    const [selectedRole, setSelectedRole] = useState<'user' | 'host' | null>(null)
    const [companyName, setCompanyName] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleConfirm() {
        if (!selectedRole) return
        setSaving(true)
        setError(null)

        try {
            const metadata: Record<string, string> = { role: selectedRole }
            if (selectedRole === 'host' && companyName.trim()) {
                metadata.company_name = companyName.trim()
            }

            const { data: authUserData, error: getUserErr } = await supabase.auth.getUser()
            if (getUserErr) throw getUserErr

            const authUser = authUserData.user
            if (!authUser) {
                throw new Error('Session utilisateur introuvable. Reconnecte-toi puis réessaie.')
            }

            const { error: updateAuthErr } = await supabase.auth.updateUser({
                data: metadata,
            })
            if (updateAuthErr) throw updateAuthErr

            const fallbackName =
                authUser.user_metadata?.nom ??
                authUser.user_metadata?.full_name ??
                authUser.user_metadata?.name ??
                authUser.email?.split('@')[0] ??
                'Utilisateur'

            const { error: updateProfileErr } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    email: authUser.email ?? '',
                    nom: String(fallbackName),
                    role: selectedRole,
                    company_name: selectedRole === 'host' ? (companyName.trim() || null) : null,
                }, { onConflict: 'id' })

            if (updateProfileErr) throw updateProfileErr

            await onComplete()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Impossible d’enregistrer votre rôle.')
        } finally {
            setSaving(false)
        }
    }

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px 14px 12px 40px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--color-text-primary)',
        fontSize: '0.95rem',
        outline: 'none',
        fontFamily: 'var(--font-sans)',
    }

    return (
        <>
            <div
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    zIndex: 3000,
                    animation: 'fade-in 0.2s ease forwards',
                }}
            />
            <div
                className="glass-card"
                style={{
                    position: 'fixed',
                    bottom: 0, left: 0, right: 0,
                    zIndex: 3001,
                    padding: '32px 24px',
                    paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
                    borderTopLeftRadius: 'var(--radius-xl)',
                    borderTopRightRadius: 'var(--radius-xl)',
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                    animation: 'slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                }}
            >
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-text-muted)', margin: '0 auto 20px' }} />

                <h2 className="text-gradient" style={{ fontSize: '1.3rem', fontWeight: 800, textAlign: 'center', marginBottom: 6 }}>
                    Bienvenue sur ScootSafe !
                </h2>
                <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: 24 }}>
                    Comment souhaitez-vous utiliser l'application ?
                </p>

                <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                    <button
                        type="button"
                        onClick={() => setSelectedRole('user')}
                        style={{
                            flex: 1, padding: '18px 14px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                            background: selectedRole === 'user' ? 'rgba(0,206,201,0.12)' : 'rgba(255,255,255,0.04)',
                            border: `2px solid ${selectedRole === 'user' ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 'var(--radius-md)',
                            color: selectedRole === 'user' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                            cursor: 'pointer', transition: 'all 0.2s',
                        }}
                    >
                        <User size={28} />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Utilisateur</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            Je cherche un parking
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedRole('host')}
                        style={{
                            flex: 1, padding: '18px 14px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                            background: selectedRole === 'host' ? 'rgba(108,92,231,0.15)' : 'rgba(255,255,255,0.04)',
                            border: `2px solid ${selectedRole === 'host' ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 'var(--radius-md)',
                            color: selectedRole === 'host' ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
                            cursor: 'pointer', transition: 'all 0.2s',
                        }}
                    >
                        <Building2 size={28} />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Commerçant</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            Je propose des places
                        </span>
                    </button>
                </div>

                {selectedRole === 'host' && (
                    <div style={{ position: 'relative', marginBottom: 16 }}>
                        <Building2 size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                        <input
                            type="text"
                            placeholder="Nom de votre commerce/entreprise"
                            value={companyName}
                            onChange={e => setCompanyName(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                )}

                {error && (
                    <div style={{
                        padding: '10px 14px', marginBottom: 14,
                        background: 'rgba(255,107,107,0.15)',
                        border: '1px solid rgba(255,107,107,0.25)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-danger)', fontSize: '0.85rem',
                    }}>
                        {error}
                    </div>
                )}

                <button
                    className="btn-primary"
                    disabled={!selectedRole || saving}
                    onClick={handleConfirm}
                    style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        opacity: !selectedRole || saving ? 0.5 : 1,
                        cursor: !selectedRole || saving ? 'not-allowed' : 'pointer',
                    }}
                >
                    {saving ? (
                        <><Loader2 size={17} style={{ animation: 'spin 0.6s linear infinite' }} /> Enregistrement…</>
                    ) : (
                        'Confirmer'
                    )}
                </button>
            </div>
        </>
    )
}
