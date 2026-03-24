import { useState } from 'react'
import { X, Mail, Lock, User, LogIn, UserPlus, Building2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type AuthMode = 'login' | 'register'

interface AuthModalProps {
    onClose: () => void
    onSuccess: () => void
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
    const [mode, setMode] = useState<AuthMode>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [nom, setNom] = useState('')
    const [isHost, setIsHost] = useState(false)
    const [companyName, setCompanyName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        try {
            if (mode === 'register') {
                const metadata: Record<string, string> = {
                    nom,
                    role: isHost ? 'host' : 'user',
                }
                if (isHost && companyName.trim()) {
                    metadata.company_name = companyName.trim()
                }

                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: metadata },
                })
                if (signUpError) throw signUpError
                setMessage('Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse.')
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
                if (signInError) throw signInError
                onSuccess()
                onClose()
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Une erreur est survenue.'
            if (msg.includes('Invalid login credentials')) {
                setError('Email ou mot de passe incorrect.')
            } else if (msg.includes('User already registered')) {
                setError('Un compte existe déjà avec cet email.')
            } else if (msg.includes('Password should be at least')) {
                setError('Le mot de passe doit contenir au moins 6 caractères.')
            } else {
                setError(msg)
            }
        } finally {
            setLoading(false)
        }
    }

    async function handleGoogle() {
        setError(null)
        setLoading(true)
        const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}${basePath}/map`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        })
        if (error) {
            setError(error.message)
            setLoading(false)
        }
    }

    const GoogleIcon = () => (
        <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.003 24.003 0 0 0 0 21.56l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
    )

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px 14px 12px 40px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--color-text-primary)',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'border-color 0.2s',
        fontFamily: 'var(--font-sans)',
    }

    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.65)',
                    zIndex: 2000,
                    animation: 'fade-in 0.2s ease forwards',
                }}
            />

            {/* Modal */}
            <div
                className="glass-card"
                style={{
                    position: 'fixed',
                    bottom: 0, left: 0, right: 0,
                    zIndex: 2001,
                    padding: '28px 24px',
                    paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
                    borderTopLeftRadius: 'var(--radius-xl)',
                    borderTopRightRadius: 'var(--radius-xl)',
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                    animation: 'slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    maxHeight: '92dvh',
                    overflowY: 'auto',
                }}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    aria-label="Fermer"
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

                {/* Handle */}
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-text-muted)', margin: '0 auto 20px' }} />

                {/* Title */}
                <h2 className="text-gradient" style={{ fontSize: '1.4rem', fontWeight: 800, textAlign: 'center', marginBottom: 6 }}>
                    {mode === 'login' ? 'Connexion' : 'Créer un compte'}
                </h2>
                <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: 24 }}>
                    {mode === 'login' ? 'Accède à tes réservations ScootSafe' : 'Rejoins ScootSafe gratuitement'}
                </p>

                {/* Google OAuth */}
                <button
                    onClick={handleGoogle}
                    style={{
                        width: '100%', padding: '12px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                        marginBottom: 20,
                        transition: 'background 0.2s',
                    }}
                >
                    {loading ? (
                        <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--color-primary-light)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                    ) : (
                        <GoogleIcon />
                    )}
                    {loading ? 'Redirection…' : 'Continuer avec Google'}
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>ou par email</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* Host toggle (register only) */}
                    {mode === 'register' && (
                        <button
                            type="button"
                            onClick={() => setIsHost(v => !v)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 14px',
                                background: isHost ? 'rgba(108,92,231,0.15)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${isHost ? 'rgba(108,92,231,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: 'var(--radius-sm)',
                                color: isHost ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
                                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                transition: 'all 0.2s',
                            }}
                        >
                            <Building2 size={16} />
                            Je suis un commerçant
                            <span style={{
                                marginLeft: 'auto',
                                width: 36, height: 20, borderRadius: 10,
                                background: isHost ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                                position: 'relative', transition: 'background 0.2s',
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    top: 2, left: isHost ? 18 : 2,
                                    width: 16, height: 16, borderRadius: '50%',
                                    background: 'white',
                                    transition: 'left 0.2s',
                                }} />
                            </span>
                        </button>
                    )}

                    {/* Company name (host register only) */}
                    {mode === 'register' && isHost && (
                        <div style={{ position: 'relative' }}>
                            <Building2 size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                            <input
                                type="text"
                                placeholder="Nom de l'entreprise"
                                value={companyName}
                                onChange={e => setCompanyName(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                    )}

                    {/* Nom (register only) */}
                    {mode === 'register' && (
                        <div style={{ position: 'relative' }}>
                            <User size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                            <input
                                type="text"
                                placeholder="Ton prénom"
                                value={nom}
                                onChange={e => setNom(e.target.value)}
                                required
                                style={inputStyle}
                            />
                        </div>
                    )}

                    {/* Email */}
                    <div style={{ position: 'relative' }}>
                        <Mail size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                        <input
                            type="email"
                            placeholder="ton@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            style={inputStyle}
                        />
                    </div>

                    {/* Password */}
                    <div style={{ position: 'relative' }}>
                        <Lock size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                        <input
                            type="password"
                            placeholder="Mot de passe (6+ caractères)"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            minLength={6}
                            style={inputStyle}
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            padding: '10px 14px',
                            background: 'rgba(255,107,107,0.15)',
                            border: '1px solid rgba(255,107,107,0.25)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--color-danger)',
                            fontSize: '0.85rem',
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Success message */}
                    {message && (
                        <div style={{
                            padding: '10px 14px',
                            background: 'rgba(0,184,148,0.15)',
                            border: '1px solid rgba(0,184,148,0.25)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--color-success)',
                            fontSize: '0.85rem',
                        }}>
                            {message}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{
                            width: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {mode === 'login'
                            ? <><LogIn size={17} /> {loading ? 'Connexion…' : 'Se connecter'}</>
                            : <><UserPlus size={17} /> {loading ? 'Création…' : 'Créer mon compte'}</>
                        }
                    </button>
                </form>

                {/* Toggle mode */}
                <button
                    onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(null); setMessage(null); setIsHost(false) }}
                    style={{
                        marginTop: 18, width: '100%', background: 'none', border: 'none',
                        color: 'var(--color-primary-light)', fontSize: '0.85rem',
                        cursor: 'pointer', fontWeight: 600,
                    }}
                >
                    {mode === 'login'
                        ? "Pas encore de compte ? Créer un compte"
                        : "Déjà un compte ? Se connecter"}
                </button>
            </div>
        </>
    )
}
