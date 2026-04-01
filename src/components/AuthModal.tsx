import { useMemo, useState } from 'react'
import { Building2, CheckCircle2, Lock, LogIn, Mail, ShieldCheck, User, UserPlus, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type AuthMode = 'login' | 'register'

interface AuthModalProps {
    onClose: () => void
    onSuccess: () => void
}

const quickPoints = [
    'Accès immédiat à la carte, aux réservations et au suivi.',
    'Connexion email ou Google selon le contexte le plus simple.',
    'Demande d’accès hôte distincte et validée manuellement.',
] as const

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
    const [termsAccepted, setTermsAccepted] = useState(false)

    const termsHref = `${window.location.origin}${import.meta.env.BASE_URL}#/cgu`
    const submitDisabled = loading || (mode === 'register' && !termsAccepted)
    const googleLabel = loading ? 'Redirection…' : 'Continuer avec Google'
    const submitLabel = mode === 'login'
        ? (loading ? 'Connexion…' : 'Se connecter')
        : (loading ? 'Création…' : 'Créer mon compte')

    const helperCopy = useMemo(() => {
        if (mode === 'login') {
            return 'Retrouve tes réservations, ton suivi et tes accès sans repasser par la carte.'
        }

        if (isHost) {
            return 'Tu crées un compte standard et ta demande d’accès pro part ensuite en validation manuelle.'
        }

        return 'Le compte utilisateur sert uniquement quand tu veux réserver, suivre un dépôt ou gérer ton historique.'
    }, [isHost, mode])

    function resetTransientState(nextMode: AuthMode) {
        setMode(nextMode)
        setError(null)
        setMessage(null)
        if (nextMode === 'login') {
            setIsHost(false)
            setCompanyName('')
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        try {
            if (mode === 'register') {
                if (!termsAccepted) {
                    throw new Error('Tu dois accepter les CGU avant de créer un compte.')
                }

                const metadata: Record<string, string> = {
                    nom,
                    role: 'user',
                    terms_accepted_at: new Date().toISOString(),
                }

                if (isHost && companyName.trim()) {
                    metadata.company_name = companyName.trim()
                    metadata.requested_role = 'host'
                    metadata.host_status = 'pending'
                }

                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: metadata },
                })

                if (signUpError) throw signUpError

                setMessage(
                    isHost
                        ? 'Compte créé. Vérifie ton email pour confirmer ton adresse, puis nous traiterons ta demande d’accès hôte.'
                        : 'Compte créé. Vérifie ton email pour confirmer ton adresse.'
                )
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

        if (!termsAccepted) {
            setError('Tu dois accepter les CGU avant de continuer avec Google.')
            setLoading(false)
            return
        }

        window.sessionStorage.setItem('scootsafe_terms_accepted_at', new Date().toISOString())

        const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}${basePath}/`,
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
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.003 24.003 0 0 0 0 21.56l7.98-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
    )

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '13px 14px 13px 42px',
        background: 'rgba(9,11,20,0.7)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '14px',
        color: 'var(--color-text-primary)',
        fontSize: '0.96rem',
        outline: 'none',
        transition: 'border-color 0.2s, background 0.2s',
        fontFamily: 'var(--font-sans)',
    }

    return (
        <>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(3,5,12,0.78)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    zIndex: 2000,
                    animation: 'fade-in 0.2s ease forwards',
                }}
            />

            <div
                style={{
                    position: 'fixed',
                    inset: 'auto 0 0',
                    zIndex: 2001,
                    display: 'flex',
                    justifyContent: 'center',
                    padding: '20px 14px max(18px, env(safe-area-inset-bottom))',
                }}
            >
                <div
                    className="glass-card"
                    style={{
                        position: 'relative',
                        width: 'min(560px, 100%)',
                        padding: '24px 20px 22px',
                        background: 'linear-gradient(180deg, rgba(17,18,29,0.96), rgba(8,10,18,0.98))',
                        borderTopLeftRadius: '30px',
                        borderTopRightRadius: '30px',
                        borderBottomLeftRadius: '24px',
                        borderBottomRightRadius: '24px',
                        animation: 'slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                        maxHeight: '92dvh',
                        overflowY: 'auto',
                    }}
                >
                    <button
                        onClick={onClose}
                        aria-label="Fermer"
                        style={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            background: 'rgba(255,255,255,0.08)',
                            border: 'none',
                            borderRadius: '50%',
                            width: 34,
                            height: 34,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--color-text-secondary)',
                        }}
                    >
                        <X size={18} />
                    </button>

                    <div style={{ width: 42, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.16)', margin: '0 auto 18px' }} />

                    <div
                        style={{
                            display: 'grid',
                            gap: 16,
                            padding: '16px 16px 18px',
                            marginBottom: 18,
                            borderRadius: '22px',
                            background: 'linear-gradient(135deg, rgba(108,92,231,0.24), rgba(0,206,201,0.1))',
                            border: '1px solid rgba(255,255,255,0.09)',
                        }}
                    >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content', padding: '6px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', color: 'var(--color-text-primary)', fontSize: '0.76rem', fontWeight: 800 }}>
                            <ShieldCheck size={14} color="var(--color-accent)" />
                            Entrée sécurisée ScootSafe
                        </div>

                        <div>
                            <h2 style={{ fontSize: '1.55rem', lineHeight: 1.02, letterSpacing: '-0.05em', fontWeight: 900 }}>
                                {mode === 'login' ? 'Reprendre ton accès sans détour.' : 'Créer un accès clair dès le premier écran.'}
                            </h2>
                            <p style={{ marginTop: 10, color: 'rgba(255,255,255,0.82)', fontSize: '0.93rem', lineHeight: 1.6 }}>
                                {helperCopy}
                            </p>
                        </div>

                        <div style={{ display: 'grid', gap: 8 }}>
                            {quickPoints.map((point) => (
                                <div key={point} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                    <CheckCircle2 size={16} color="var(--color-accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                                    <span style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.86rem', lineHeight: 1.5 }}>{point}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            gap: 8,
                            padding: 6,
                            marginBottom: 18,
                            borderRadius: '18px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => resetTransientState('login')}
                            style={{
                                padding: '12px 12px',
                                borderRadius: '14px',
                                border: 'none',
                                background: mode === 'login' ? 'rgba(255,255,255,0.12)' : 'transparent',
                                color: mode === 'login' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                fontWeight: 800,
                                cursor: 'pointer',
                            }}
                        >
                            Connexion
                        </button>
                        <button
                            type="button"
                            onClick={() => resetTransientState('register')}
                            style={{
                                padding: '12px 12px',
                                borderRadius: '14px',
                                border: 'none',
                                background: mode === 'register' ? 'rgba(255,255,255,0.12)' : 'transparent',
                                color: mode === 'register' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                fontWeight: 800,
                                cursor: 'pointer',
                            }}
                        >
                            Créer un compte
                        </button>
                    </div>

                    <label
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            padding: '12px 14px',
                            marginBottom: 16,
                            borderRadius: '16px',
                            background: 'rgba(255,255,255,0.04)',
                            border: `1px solid ${termsAccepted ? 'rgba(0,206,201,0.28)' : 'rgba(255,255,255,0.08)'}`,
                            cursor: 'pointer',
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(event) => setTermsAccepted(event.target.checked)}
                            style={{ marginTop: 2 }}
                        />
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', lineHeight: 1.55 }}>
                            J’ai lu et j’accepte les{' '}
                            <a href={termsHref} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-light)', fontWeight: 700 }}>
                                CGU de ScootSafe
                            </a>
                            . Cette validation reste requise avant toute création de compte ou première connexion Google.
                        </span>
                    </label>

                    <button
                        onClick={handleGoogle}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '13px 16px',
                            background: '#f8fafc',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '16px',
                            color: '#0f172a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            cursor: loading ? 'wait' : 'pointer',
                            fontWeight: 800,
                            fontSize: '0.94rem',
                            marginBottom: 18,
                            boxShadow: '0 18px 34px rgba(15,23,42,0.22)',
                            opacity: loading ? 0.85 : 1,
                        }}
                    >
                        {loading ? (
                            <span style={{ width: 18, height: 18, border: '2px solid rgba(15,23,42,0.15)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                        ) : (
                            <GoogleIcon />
                        )}
                        {googleLabel}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>ou par email</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
                        {mode === 'register' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setIsHost(false)}
                                    style={{
                                        padding: '14px 14px',
                                        display: 'grid',
                                        gap: 6,
                                        textAlign: 'left',
                                        borderRadius: '16px',
                                        border: isHost ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,206,201,0.28)',
                                        background: isHost ? 'rgba(255,255,255,0.04)' : 'rgba(0,206,201,0.12)',
                                        color: isHost ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <User size={18} color={isHost ? 'var(--color-text-secondary)' : 'var(--color-accent)'} />
                                    <strong style={{ fontSize: '0.92rem' }}>Compte utilisateur</strong>
                                    <span style={{ fontSize: '0.77rem', lineHeight: 1.45 }}>Réserver, suivre un dépôt, consulter l’historique.</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsHost(true)}
                                    style={{
                                        padding: '14px 14px',
                                        display: 'grid',
                                        gap: 6,
                                        textAlign: 'left',
                                        borderRadius: '16px',
                                        border: isHost ? '1px solid rgba(108,92,231,0.34)' : '1px solid rgba(255,255,255,0.08)',
                                        background: isHost ? 'rgba(108,92,231,0.16)' : 'rgba(255,255,255,0.04)',
                                        color: isHost ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Building2 size={18} color={isHost ? 'var(--color-primary-light)' : 'var(--color-text-secondary)'} />
                                    <strong style={{ fontSize: '0.92rem' }}>Demande hôte</strong>
                                    <span style={{ fontSize: '0.77rem', lineHeight: 1.45 }}>Publier des places après validation manuelle.</span>
                                </button>
                            </div>
                        )}

                        {mode === 'register' && isHost && (
                            <div style={{ display: 'grid', gap: 10, padding: '14px 14px', borderRadius: '16px', background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.16)' }}>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                    <ShieldCheck size={16} color="var(--color-primary-light)" style={{ marginTop: 2, flexShrink: 0 }} />
                                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', lineHeight: 1.55 }}>
                                        La création du compte reste immédiate, mais l’accès hôte ne s’active qu’après validation manuelle.
                                    </p>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Building2 size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                                    <input
                                        type="text"
                                        placeholder="Nom du commerce ou de l’entreprise"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        autoComplete="organization"
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                        )}

                        {mode === 'register' && (
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                                <input
                                    type="text"
                                    placeholder="Prénom ou nom d’usage"
                                    value={nom}
                                    onChange={(e) => setNom(e.target.value)}
                                    required
                                    autoComplete="given-name"
                                    style={inputStyle}
                                />
                            </div>
                        )}

                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                            <input
                                type="email"
                                placeholder="ton@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                            <input
                                type="password"
                                placeholder={mode === 'login' ? 'Mot de passe' : 'Mot de passe (6+ caractères)'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                style={inputStyle}
                            />
                        </div>

                        {error && (
                            <div style={{ padding: '11px 14px', background: 'rgba(255,107,107,0.14)', border: '1px solid rgba(255,107,107,0.22)', borderRadius: '14px', color: 'var(--color-danger)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                {error}
                            </div>
                        )}

                        {message && (
                            <div style={{ padding: '11px 14px', background: 'rgba(0,184,148,0.14)', border: '1px solid rgba(0,184,148,0.22)', borderRadius: '14px', color: 'var(--color-success)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={submitDisabled}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                opacity: submitDisabled ? 0.7 : 1,
                                cursor: submitDisabled ? 'not-allowed' : 'pointer',
                                marginTop: 2,
                            }}
                        >
                            {mode === 'login'
                                ? <><LogIn size={17} /> {submitLabel}</>
                                : <><UserPlus size={17} /> {submitLabel}</>}
                        </button>
                    </form>

                    <button
                        type="button"
                        onClick={() => resetTransientState(mode === 'login' ? 'register' : 'login')}
                        style={{
                            marginTop: 16,
                            width: '100%',
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-primary-light)',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            fontWeight: 700,
                        }}
                    >
                        {mode === 'login'
                            ? 'Pas encore de compte ? Créer un accès'
                            : 'Déjà un compte ? Revenir à la connexion'}
                    </button>
                </div>
            </div>
        </>
    )
}
