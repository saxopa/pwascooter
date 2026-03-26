import { useNavigate } from 'react-router-dom'
import {
    ArrowLeft,
    Coins,
    Store,
    Smartphone,
    Leaf,
    Shield, // used as an alternative generic icon for the insurance block
    User,
} from 'lucide-react'
import LegalLinks from './LegalLinks'

export default function BecomeHost() {
    const navigate = useNavigate()

    return (
        <div
            style={{
                minHeight: 'var(--app-viewport-height)',
                background:
                    'radial-gradient(circle at top right, rgba(0,206,201,0.12), transparent 40%), linear-gradient(180deg, #11121d 0%, #0d0e17 40%, #090a11 100%)',
                color: 'var(--color-text-primary)',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '16px 20px',
                    paddingTop: 'max(20px, env(safe-area-inset-top))',
                    background: 'linear-gradient(to bottom, rgba(15,15,26,0.98), rgba(15,15,26,0.85))',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                }}
            >
                <button
                    onClick={() => navigate(-1)}
                    aria-label="Retour"
                    style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '50%',
                        width: 38,
                        height: 38,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--color-text-primary)',
                        flexShrink: 0,
                    }}
                >
                    <ArrowLeft size={18} />
                </button>
                <div style={{ flex: 1 }}>
                    <h1 className="text-gradient" style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                        ScootSafe
                    </h1>
                </div>
                <button
                    onClick={() => navigate('/map')}
                    style={{
                        padding: '8px 14px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '999px',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                    }}
                >
                    Voir la carte
                </button>
            </div>

            <main style={{ flex: 1, padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 64, width: 'min(1180px, 100%)', margin: '0 auto' }}>
                
                {/* 1. Hero Section */}
                <section style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
                    <div style={{ display: 'inline-block', padding: '8px 16px', background: 'rgba(0,206,201,0.15)', color: 'var(--color-accent)', borderRadius: '999px', fontWeight: 700, fontSize: '0.85rem', marginBottom: 24 }}>
                        Devenir Partenaire
                    </div>
                    <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 24 }}>
                        Rentabilisez vos espaces vides avec <span className="text-gradient">ScootSafe</span>
                    </h1>
                    <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: 680, margin: '0 auto' }}>
                        Commerçants ou particuliers : accueillez des trottinettes électriques la journée et générez des revenus passifs sans effort.
                    </p>
                </section>

                {/* 2. Pourquoi devenir hôte ? */}
                <section>
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Pourquoi devenir hôte ?</h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(0,206,201,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
                                <Coins size={24} />
                            </div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Revenus 100% passifs</h3>
                            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                                Une place = environ 2€/jour. Bloquez un espace pour 5 trottinettes, c'est jusqu'à <strong>200€ à 300€/mois</strong> juste pour ouvrir une porte.
                            </p>
                        </div>
                        
                        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(108,92,231,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-light)' }}>
                                <Store size={24} />
                            </div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Trafic en boutique</h3>
                            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                                L'utilisateur vient déposer sa trottinette le matin et la récupère le soir. C'est un client potentiel qui entre deux fois par jour chez vous.
                            </p>
                        </div>

                        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(0,184,148,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
                                <Smartphone size={24} />
                            </div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Zéro gestion</h3>
                            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                                Tout se passe sur l'application. Réservation et paiement en ligne, aucune paperasse ni espèces à gérer.
                            </p>
                        </div>

                        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(253,203,110,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-warning)' }}>
                                <Leaf size={24} />
                            </div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Image éco-responsable</h3>
                            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                                Devenez un acteur engagé de la mobilité douce au cœur de votre quartier et simplifiez la vie des usagers.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 3. Administratif et Assurance */}
                <section>
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>Administratif et Assurance</h2>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>C'est très simple.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
                        {/* Entreprises */}
                        <div className="glass-card" style={{ padding: '32px 24px', borderTop: '4px solid var(--color-primary-light)' }}>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Store size={24} color="var(--color-primary-light)" />
                                Entreprises
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div>
                                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', marginBottom: 8 }}>Administratif</h4>
                                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                                        Aucune structure à créer ! Il suffit d'une simple adjonction d'activité (consigne/location d'espace) gratuite et rapide en ligne sur le guichet unique de l'INPI pour mettre à jour votre Kbis.
                                    </p>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', marginBottom: 8 }}>Assurance</h4>
                                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                                        Conservez votre RC Pro et Multirisque. Il vous suffit d'informer votre assureur que vous stockez des trottinettes (et leurs batteries) pour le compte de tiers. C'est souvent inclus sans surcoût.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Particuliers */}
                        <div className="glass-card" style={{ padding: '32px 24px', borderTop: '4px solid var(--color-accent)' }}>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <User size={24} color="var(--color-accent)" />
                                Particuliers
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div>
                                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', marginBottom: 8 }}>Administratif</h4>
                                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                                        Aucune entreprise à créer. La location d'espace entre particuliers est 100% légale. Il suffit de déclarer ces revenus annuellement sur votre déclaration d'impôts, comme pour du covoiturage.
                                    </p>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', marginBottom: 8 }}>Assurance</h4>
                                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                                        Vérifiez simplement auprès de votre Assurance Multirisque Habitation (MRH) que la location d'une partie de votre domicile ne modifie pas vos garanties.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. La Vision ScootSafe */}
                <section style={{ 
                    marginTop: 20, 
                    padding: '32px 24px', 
                    background: 'linear-gradient(135deg, rgba(108,92,231,0.2), rgba(0,206,201,0.1))',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: '50%', marginBottom: 16 }}>
                            <Shield size={32} color="var(--color-primary-light)" />
                        </div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 16, color: 'white' }}>
                            Bientôt : Une assurance 100% intégrée
                        </h2>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem', lineHeight: 1.6 }}>
                            Pour notre phase de lancement (Beta), nous vous demandons de vérifier vos propres assurances. 
                            Mais très prochainement, ScootSafe intégrera une assurance partenaire automatique ! 
                            Chaque réservation couvrira directement votre local contre tout dommage. Vous n'aurez plus à vous poser la moindre question.
                        </p>
                    </div>
                </section>

                <div style={{ marginTop: 40, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24 }}>
                    <LegalLinks compact={false} align="center" />
                </div>
            </main>
        </div>
    )
}
