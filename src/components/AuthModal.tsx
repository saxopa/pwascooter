import { useState } from 'react'
import { X, Mail, Lock, User, LogIn, UserPlus, Chrome } from 'lucide-react'
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
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { nom },
                    },
                })
                if (signUpError) throw signUpError
                setMessage('Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse.')
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
                if (signInError) throw signInError
                onSuccess()
                onClose()
            }
        } catch (err: any) {
            // Translate common Supabase errors to French
            const msg: string = err.message ?? 'Une erreur est survenue.'
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
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        })
        if (error) setError(error.message)
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
                    <Chrome size={18} color="#EA4335" />
                    Continuer avec Google
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>ou par email</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

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
                    onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(null); setMessage(null) }}
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
