import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, CalendarDays, MapPin, Scale, ShieldCheck, Sparkles, Store, Zap } from 'lucide-react'
import AuthModal from './AuthModal'
import { supabase } from '../lib/supabaseClient'
import LegalLinks from './LegalLinks'

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
                background: 'radial-gradient(circle at top left, rgba(0,206,201,0.2), transparent 28%), radial-gradient(circle at top right, rgba(108,92,231,0.3), transparent 34%), linear-gradient(180deg, #11121d 0%, #0d0e17 42%, #090a11 100%)',
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
                            Plateforme de mise en relation pour stationnement et prise en charge locale.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                            className="glass-card"
                            onClick={() => navigate('/cgu')}
                            style={{
                                padding: '10px 16px',
                                background: 'rgba(26,26,46,0.58)',
                                color: 'var(--color-text-secondary)',
                                borderRadius: '999px',
                                cursor: 'pointer',
                                fontWeight: 600,
                            }}
                        >
                            CGU
                        </button>
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
                    </div>
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
                            Service local, réservation rapide, responsabilité métier portée par l’offreur
                        </div>

                        <div>
                            <h1 style={{ fontSize: 'clamp(2.6rem, 7vw, 4.8rem)', lineHeight: 0.95, letterSpacing: '-0.06em', fontWeight: 900 }}>
                                Réservez une solution
                                <span className="text-gradient" style={{ display: 'block' }}>
                                    simple pour votre trottinette.
                                </span>
                            </h1>
                            <p style={{ marginTop: 16, color: 'var(--color-text-secondary)', fontSize: '1rem', maxWidth: 540, lineHeight: 1.6 }}>
                                ScootSafe aide un utilisateur à trouver un commerçant de proximité proposant un emplacement ou une prise en charge. La plateforme référence les offres, gère la réservation et le code de validation, tandis que la prestation sur le terrain reste assurée par le commerçant.
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
                                Connexion email + Google
                            </span>
                            <span className="glass-card" style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontSize: '0.84rem' }}>
                                Utilisateur ou commerçant
                            </span>
                            <span className="glass-card" style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontSize: '0.84rem' }}>
                                Réservation et validation par code
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
                            background: 'linear-gradient(180deg, rgba(20,22,34,0.92), rgba(10,12,20,0.96))',
                            display: 'grid',
                            gap: 14,
                        }}
                    >
                        <div
                            style={{
                                padding: '16px 18px',
                                borderRadius: 'var(--radius-lg)',
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <Sparkles size={18} color="var(--color-accent)" />
                                <strong style={{ fontSize: '1rem' }}>Le principe du service</strong>
                            </div>
                            <div style={{ display: 'grid', gap: 12 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'start' }}>
                                    <span style={{ color: 'var(--color-accent)', fontWeight: 900 }}>1</span>
                                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>Le commerçant publie une offre avec ses conditions, son prix et sa disponibilité.</p>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'start' }}>
                                    <span style={{ color: 'var(--color-accent)', fontWeight: 900 }}>2</span>
                                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>L’utilisateur réserve via la carte, reçoit un code, puis se présente chez l’offreur.</p>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'start' }}>
                                    <span style={{ color: 'var(--color-accent)', fontWeight: 900 }}>3</span>
                                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>Le commerçant valide la prise en charge. ScootSafe reste une couche d’intermédiation, pas l’exécutant de la prestation.</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                            <div className="glass-card" style={featureCardStyle}>
                                <MapPin size={20} color="var(--color-primary-light)" />
                                <strong>Découvrir</strong>
                                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                    Carte géolocalisée et filtres rapides pour repérer une offre active.
                                </span>
                            </div>
                            <div className="glass-card" style={featureCardStyle}>
                                <Store size={20} color="var(--color-accent)" />
                                <strong>Publier</strong>
                                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                    Le commerçant décrit sa place, son prix, sa capacité et ses options.
                                </span>
                            </div>
                            <div className="glass-card" style={featureCardStyle}>
                                <CalendarDays size={20} color="var(--color-warning)" />
                                <strong>Réserver</strong>
                                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                    Durée, total, anti-surbooking et preuve de réservation côté utilisateur.
                                </span>
                            </div>
                            <div className="glass-card" style={featureCardStyle}>
                                <Building2 size={20} color="var(--color-primary-light)" />
                                <strong>Valider</strong>
                                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                    Code de dépôt, validation commerçant et tableau de bord d’exploitation.
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
                                Positionnement plateforme
                            </div>
                            <div style={{ marginTop: 10, fontWeight: 700, fontSize: '1.1rem' }}>
                                ScootSafe organise la mise en relation, pas la garde du bien
                            </div>
                            <p style={{ marginTop: 8, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
                                Les CGU précisent que la prestation de stationnement, de dépôt, de surveillance ou de restitution est exécutée par le commerçant référencé, sous sa seule responsabilité, dans les limites permises par la loi.
                            </p>
                        </div>
                    </div>
                </section>

                <section
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: 16,
                    }}
                >
                    <div className="glass-card" style={{ padding: '18px 18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <Scale size={18} color="var(--color-warning)" />
                            <strong>Cadre contractuel</strong>
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.92rem' }}>
                            Contrat de plateforme distinct du contrat éventuel conclu entre l’utilisateur et le commerçant. ScootSafe fournit une interface, un référencement et des traces techniques.
                        </p>
                    </div>
                    <div className="glass-card" style={{ padding: '18px 18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <ShieldCheck size={18} color="var(--color-accent)" />
                            <strong>Responsabilités réparties</strong>
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.92rem' }}>
                            L’offreur est responsable de son annonce, de sa disponibilité, de ses assurances et de l’exécution matérielle de la prestation. L’utilisateur reste responsable des informations et consignes qu’il respecte.
                        </p>
                    </div>
                    <div className="glass-card" style={{ padding: '18px 18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <Zap size={18} color="var(--color-primary-light)" />
                            <strong>Information claire</strong>
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.92rem' }}>
                            Les CGU exposent le service, la nature des contrats, les paramètres de visibilité des offres et les modalités de règlement des litiges.
                        </p>
                    </div>
                </section>

                <footer
                    style={{
                        display: 'grid',
                        gap: 12,
                        padding: '6px 0 2px',
                    }}
                >
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', lineHeight: 1.6, maxWidth: 760 }}>
                        ScootSafe est présenté comme une plateforme de mise en relation. Les présentes informations ne remplacent pas une revue finale par un avocat avant mise en production commerciale, notamment pour compléter les mentions légales, la politique de confidentialité, la médiation et les informations société.
                    </div>
                    <LegalLinks align="left" />
                </footer>
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
