import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, CalendarDays, MapPin, ShieldCheck, Zap } from 'lucide-react'
import AuthModal from './AuthModal'
import { supabase } from '../lib/supabaseClient'

const featureCardStyle: React.CSSProperties = {
    padding: '18px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
}

export default function LandingPage() {
    const navigate = useNavigate()
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [oauthError, setOauthError] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true

        async function restoreSession() {
            const params = new URLSearchParams(window.location.search)
            const authCode = params.get('code')
            const errorDescription = params.get('error_description')

            if (errorDescription && isMounted) {
                setOauthError(decodeURIComponent(errorDescription))
                return
            }

            if (authCode) {
                const { error } = await supabase.auth.exchangeCodeForSession(authCode)
                if (error) {
                    if (isMounted) {
                        setOauthError(error.message)
                    }
                    return
                }
            }

            const { data } = await supabase.auth.getSession()
            if (isMounted && data.session?.user) {
                navigate('/map', { replace: true })
            }
        }

        void restoreSession()

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                navigate('/map', { replace: true })
            }
        })

        return () => {
            isMounted = false
            listener.subscription.unsubscribe()
        }
    }, [navigate])

    function handleAuthSuccess() {
        setShowAuthModal(false)
        navigate('/map')
    }

    return (
        <div
            style={{
                minHeight: '100dvh',
                background: 'radial-gradient(circle at top, rgba(108,92,231,0.35), transparent 34%), linear-gradient(180deg, #141427 0%, #0f0f1a 48%, #0b0b14 100%)',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(135deg, rgba(0,206,201,0.08), transparent 40%, rgba(162,155,254,0.12) 100%)',
                    pointerEvents: 'none',
                }}
            />

            <div
                style={{
                    position: 'relative',
                    zIndex: 1,
                    width: 'min(1120px, 100%)',
                    margin: '0 auto',
                    padding: 'max(24px, env(safe-area-inset-top)) 20px max(28px, env(safe-area-inset-bottom))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 32,
                }}
            >
                <header
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 16,
                        paddingTop: 8,
                    }}
                >
                    <div>
                        <div className="text-gradient" style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                            ScootSafe
                        </div>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
                            Parking scooterise, réservation instantanée, espace commerçant.
                        </p>
                    </div>

                    <button
                        className="glass-card"
                        onClick={() => setShowAuthModal(true)}
                        style={{
                            padding: '10px 16px',
                            background: 'rgba(26,26,46,0.72)',
                            color: 'var(--color-text-primary)',
                            borderRadius: '999px',
                            cursor: 'pointer',
                            fontWeight: 600,
                        }}
                    >
                        Connexion
                    </button>
                </header>

                <section
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: 24,
                        alignItems: 'center',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                width: 'fit-content',
                                padding: '8px 12px',
                                borderRadius: '999px',
                                background: 'rgba(0,206,201,0.12)',
                                border: '1px solid rgba(0,206,201,0.2)',
                                color: 'var(--color-accent)',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                            }}
                        >
                            <ShieldCheck size={16} />
                            MVP mobile prêt a tester
                        </div>

                        <div>
                            <h1 style={{ fontSize: 'clamp(2.6rem, 7vw, 4.8rem)', lineHeight: 0.95, letterSpacing: '-0.06em', fontWeight: 900 }}>
                                Garez les trottinettes
                                <span className="text-gradient" style={{ display: 'block' }}>
                                    sans friction.
                                </span>
                            </h1>
                            <p style={{ marginTop: 16, color: 'var(--color-text-secondary)', fontSize: '1rem', maxWidth: 540, lineHeight: 1.6 }}>
                                Une carte temps reel pour reserver une place securisee en quelques secondes, avec un espace commerçant pour publier et gerer ses emplacements.
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            <button
                                className="btn-primary"
                                onClick={() => navigate('/map')}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                            >
                                Voir la carte
                                <ArrowRight size={17} />
                            </button>
                            <button
                                className="glass-card"
                                onClick={() => setShowAuthModal(true)}
                                style={{
                                    padding: '14px 22px',
                                    background: 'rgba(255,255,255,0.06)',
                                    color: 'var(--color-text-primary)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                Creer un compte
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            <span className="glass-card" style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontSize: '0.84rem' }}>
                                OAuth Google + email
                            </span>
                            <span className="glass-card" style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontSize: '0.84rem' }}>
                                Role utilisateur ou commerçant
                            </span>
                            <span className="glass-card" style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontSize: '0.84rem' }}>
                                Reservation anti-surbooking
                            </span>
                        </div>

                        {oauthError && (
                            <div
                                className="glass-card"
                                style={{
                                    padding: '12px 14px',
                                    background: 'rgba(255,107,107,0.12)',
                                    border: '1px solid rgba(255,107,107,0.24)',
                                    color: 'var(--color-danger)',
                                    fontSize: '0.9rem',
                                }}
                            >
                                Erreur de connexion Google : {oauthError}
                            </div>
                        )}
                    </div>

                    <div
                        className="glass-card"
                        style={{
                            padding: 22,
                            background: 'linear-gradient(180deg, rgba(26,26,46,0.82), rgba(14,14,26,0.92))',
                            display: 'grid',
                            gap: 14,
                        }}
                    >
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                            <div className="glass-card" style={featureCardStyle}>
                                <MapPin size={20} color="var(--color-primary-light)" />
                                <strong>Carte claire</strong>
                                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                    Recherche visuelle et filtres rapides pour trouver une place proche.
                                </span>
                            </div>
                            <div className="glass-card" style={featureCardStyle}>
                                <Zap size={20} color="var(--color-accent)" />
                                <strong>Recharge</strong>
                                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                    Mise en avant immediate des emplacements avec borne.
                                </span>
                            </div>
                            <div className="glass-card" style={featureCardStyle}>
                                <CalendarDays size={20} color="var(--color-warning)" />
                                <strong>Reservation</strong>
                                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                    Duree, total dynamique et suivi des reservations.
                                </span>
                            </div>
                            <div className="glass-card" style={featureCardStyle}>
                                <Building2 size={20} color="var(--color-primary-light)" />
                                <strong>Espace pro</strong>
                                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                    Publication des places et gestion des disponibilites commerçants.
                                </span>
                            </div>
                        </div>

                        <div
                            style={{
                                padding: '18px 18px 20px',
                                borderRadius: 'var(--radius-lg)',
                                background: 'linear-gradient(135deg, rgba(108,92,231,0.22), rgba(0,206,201,0.12))',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}
                        >
                            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}>
                                Flux principal
                            </div>
                            <div style={{ marginTop: 10, fontWeight: 700, fontSize: '1.1rem' }}>
                                Landing → Auth → Choix du role → Carte → Reservation
                            </div>
                            <p style={{ marginTop: 8, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
                                Le premier retour OAuth renvoie directement sur la carte et force la selection du role si le profil n’est pas encore initialise.
                            </p>
                        </div>
                    </div>
                </section>
            </div>

            {showAuthModal && (
                <AuthModal
                    onClose={() => setShowAuthModal(false)}
                    onSuccess={handleAuthSuccess}
                />
            )}
        </div>
    )
}
