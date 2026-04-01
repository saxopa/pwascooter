import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  LogIn,
  MapPin,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Store,
  TimerReset,
} from 'lucide-react'
import AuthModal from './AuthModal'
import { supabase } from '../lib/supabaseClient'
import LegalLinks from './LegalLinks'

const serviceSteps = [
  {
    title: '1. Explorer la carte librement',
    body: 'Le visiteur peut consulter les points actifs, les zones pratiques, les tarifs et les offres avec recharge sans créer de compte.',
    icon: <MapPin size={18} color="var(--color-accent)" />,
  },
  {
    title: '2. Réserver un créneau précis',
    body: 'Une fois connecté, le client choisit une durée, obtient un créneau horodaté et reçoit un code de validation à présenter sur place.',
    icon: <CalendarClock size={18} color="var(--color-primary-light)" />,
  },
  {
    title: '3. Valider la prise en charge chez le commerçant',
    body: 'Le commerçant scanne ou saisit le code présenté par le client. Le dépôt est ensuite suivi avec un statut métier clair.',
    icon: <ScanLine size={18} color="var(--color-success)" />,
  },
] as const

const audienceCards = [
  {
    title: 'Découvrir sans friction',
    points: [
      'La carte reste publique pour voir les points actifs avant toute inscription.',
      'La connexion n’arrive qu’au moment utile: réserver, suivre un dépôt, publier une place.',
      'La promesse produit se comprend en quelques secondes, sans scroller dans tous les sens.',
    ],
    accent: 'rgba(0,206,201,0.14)',
  },
  {
    title: 'Tracer l’opération réelle',
    points: [
      'Créneau horodaté, code de validation, statut métier et expiration automatique.',
      'Le commerçant valide la prise en charge sur place par code ou scanner.',
      'La plateforme gère la preuve numérique, pas la garde physique à la place du commerçant.',
    ],
    accent: 'rgba(108,92,231,0.16)',
  },
] as const

const heroFacts = [
  'Carte publique consultable sans compte',
  'Connexion email + Google',
  'Validation terrain par code ou scanner',
  'Installable sur iPhone et Android',
] as const

const trustPillars = [
  {
    title: 'Carte ouverte',
    body: 'Un visiteur peut vérifier l’offre disponible avant toute création de compte.',
    icon: <MapPin size={18} color="var(--color-accent)" />,
  },
  {
    title: 'Réservation suivie',
    body: 'Le parcours numérique crée une trace horodatée du dépôt jusqu’à la restitution.',
    icon: <CreditCard size={18} color="var(--color-primary-light)" />,
  },
  {
    title: 'Validation terrain',
    body: 'Le commerçant garde la main sur l’acceptation réelle et la restitution physique.',
    icon: <ShieldCheck size={18} color="var(--color-success)" />,
  },
] as const

const trustBlocks = [
  'ScootSafe agit comme plateforme de mise en relation et d’orchestration technique.',
  'La garde matérielle, la surveillance et la restitution relèvent du commerçant qui accepte la prise en charge.',
  'Les CGU détaillent le rôle de la plateforme, les responsabilités respectives et le traitement des litiges.',
] as const

const faqItems = [
  {
    q: 'Faut-il créer un compte pour voir les offres ?',
    a: 'Non. La carte reste accessible publiquement pour permettre à un visiteur de comprendre l’offre disponible avant de s’inscrire.',
  },
  {
    q: 'Quand les CGU doivent-elles être acceptées ?',
    a: 'Avant toute création de compte email et avant toute première poursuite du flux Google. L’adhésion est désormais bloquante côté interface.',
  },
  {
    q: 'Le commerçant voit-il le code du client à l’avance ?',
    a: 'Non. Le code n’est plus affiché dans la liste commerçant. Il doit être présenté par le client puis scanné ou saisi pour valider le dépôt.',
  },
  {
    q: 'Que devient une réservation pending jamais présentée ?',
    a: 'Elle expire automatiquement après le début du créneau, avec journal d’audit côté base pour tracer la transition.',
  },
] as const

function SectionTitle({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div style={{ display: 'grid', gap: 10, maxWidth: 760 }}>
      <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--color-text-muted)' }}>
        {eyebrow}
      </div>
      <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', lineHeight: 1, letterSpacing: '-0.05em', fontWeight: 900 }}>
        {title}
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.98rem' }}>
        {body}
      </p>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [oauthError] = useState<string | null>(() => {
    const errorDescription = new URLSearchParams(window.location.search).get('error_description')
    return errorDescription ? decodeURIComponent(errorDescription) : null
  })

  useEffect(() => {
    let isMounted = true

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && isMounted) {
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
        minHeight: 'var(--app-viewport-height)',
        background:
          'radial-gradient(circle at top left, rgba(0,206,201,0.16), transparent 28%), radial-gradient(circle at top right, rgba(108,92,231,0.22), transparent 34%), linear-gradient(180deg, #11121d 0%, #0d0e17 42%, #090a11 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, rgba(0,206,201,0.05), transparent 34%, rgba(162,155,254,0.08) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: 'min(1180px, 100%)',
          margin: '0 auto',
          padding: 'max(24px, env(safe-area-inset-top)) 20px max(36px, env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          gap: 64,
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            paddingTop: 8,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              ScootSafe
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem', marginTop: 4 }}>
              Dépôt et stationnement de trottinettes avec preuve numérique claire.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              className="glass-card"
              onClick={() => navigate('/map')}
              style={{
                padding: '10px 14px',
                background: 'rgba(26,26,46,0.56)',
                color: 'var(--color-text-primary)',
                borderRadius: '999px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Voir la carte
            </button>
            <button
              className="glass-card"
              onClick={() => navigate('/devenir-hote')}
              style={{
                padding: '10px 14px',
                background: 'rgba(26,26,46,0.56)',
                color: 'var(--color-primary-light)',
                borderRadius: '999px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Devenir Hôte
            </button>
            <button
              className="glass-card"
              onClick={() => navigate('/cgu')}
              style={{
                padding: '10px 14px',
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
              className="btn-primary"
              onClick={() => setShowAuthModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 18px',
                borderRadius: '999px',
                cursor: 'pointer',
                fontWeight: 800,
                boxShadow: '0 18px 40px rgba(108,92,231,0.28)',
              }}
            >
              <LogIn size={16} />
              Connexion / Inscription
            </button>
          </div>
        </header>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
            alignItems: 'stretch',
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
              Carte publique, réservation horodatée, validation terrain par commerçant
            </div>

            <div>
              <h1 style={{ fontSize: 'clamp(2.8rem, 8vw, 5.3rem)', lineHeight: 0.94, letterSpacing: '-0.07em', fontWeight: 900 }}>
                La connexion ne doit jamais
                <span className="text-gradient" style={{ display: 'block' }}>
                  cacher la valeur du service
                </span>
                avant la carte.
              </h1>
              <p style={{ marginTop: 18, color: 'var(--color-text-secondary)', fontSize: '1rem', maxWidth: 620, lineHeight: 1.7 }}>
                ScootSafe montre d’abord les points disponibles, puis transforme cette découverte en réservation horodatée, suivie et validée sur place. La carte reste publique. Le compte sert uniquement quand l’utilisateur décide d’agir.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <button
                className="btn-primary"
                onClick={() => setShowAuthModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 18px 44px rgba(108,92,231,0.3)' }}
              >
                Se connecter maintenant
                <ArrowRight size={17} />
              </button>
              <button
                className="glass-card"
                onClick={() => navigate('/map')}
                style={{
                  padding: '14px 22px',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Explorer la carte sans compte
              </button>
              <button
                className="glass-card"
                onClick={() => navigate('/devenir-hote')}
                style={{
                  padding: '14px 22px',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--color-primary-light)',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Je suis commerçant
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {heroFacts.map((fact) => (
                <span key={fact} className="glass-card" style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontSize: '0.84rem' }}>
                  {fact}
                </span>
              ))}
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

            <div style={{ display: 'grid', gap: 10 }}>
              {trustBlocks.map((block) => (
                <div key={block} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <CheckCircle2 size={16} color="var(--color-success)" style={{ marginTop: 3, flexShrink: 0 }} />
                  <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.55, fontSize: '0.92rem' }}>{block}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="glass-card"
            style={{
              padding: 24,
              background: 'linear-gradient(180deg, rgba(20,22,34,0.94), rgba(10,12,20,0.98))',
              display: 'grid',
              gap: 18,
            }}
          >
            <div
              style={{
                display: 'grid',
                gap: 10,
                padding: '18px 18px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, rgba(108,92,231,0.24), rgba(0,206,201,0.12))',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.7)' }}>
                    Commencer en 30 secondes
                  </div>
                  <strong style={{ display: 'block', marginTop: 6, fontSize: '1.15rem' }}>Le bon ordre: voir, décider, se connecter.</strong>
                </div>
                <Sparkles size={18} color="var(--color-accent)" />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.6, fontSize: '0.94rem' }}>
                La landing doit pousser un visiteur soit vers la carte publique, soit vers la connexion, sans l’égarer dans trop de sections avant le premier clic utile.
              </p>
              <button
                className="btn-primary"
                onClick={() => setShowAuthModal(true)}
                style={{ width: '100%', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <LogIn size={16} />
                Ouvrir la connexion
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {serviceSteps.map((step) => (
                <div
                  key={step.title}
                  className="glass-card"
                  style={{
                    padding: '16px 16px',
                    display: 'grid',
                    gridTemplateColumns: '22px 1fr auto',
                    gap: 12,
                    alignItems: 'start',
                  }}
                >
                  <div>{step.icon}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.96rem', marginBottom: 6 }}>{step.title}</div>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.55 }}>{step.body}</p>
                  </div>
                  <ChevronRight size={16} color="var(--color-text-muted)" />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {trustPillars.map((pillar) => (
                <div key={pillar.title} className="glass-card" style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '20px 1fr', gap: 12 }}>
                  <div>{pillar.icon}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: 4 }}>{pillar.title}</div>
                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.55, fontSize: '0.88rem' }}>{pillar.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gap: 26 }}>
          <SectionTitle
            eyebrow="Promesse"
            title="Une landing plus courte, plus lisible, plus orientée action"
            body="Au lieu d’empiler des explications longues, la page met en avant les décisions utiles: découvrir l’offre, se connecter, comprendre qui fait quoi dans l’exécution réelle du service."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {audienceCards.map((card) => (
              <div key={card.title} className="glass-card" style={{ padding: '20px 18px', background: card.accent }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  {card.title.includes('Découvrir') ? <Store size={18} color="var(--color-accent)" /> : <Building2 size={18} color="var(--color-primary-light)" />}
                  <strong>{card.title}</strong>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {card.points.map((point) => (
                    <p key={point} style={{ color: 'var(--color-text-secondary)', lineHeight: 1.55, fontSize: '0.92rem' }}>
                      {point}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: 'grid', gap: 24 }}>
          <SectionTitle
            eyebrow="Cadre clair"
            title="Ce que ScootSafe fait, et ce que ScootSafe ne fait pas"
            body="Le service référence les offres, gère la réservation et conserve une trace numérique. La garde matérielle, la surveillance et la restitution restent du ressort du commerçant qui prend physiquement en charge la trottinette."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div className="glass-card" style={{ padding: '18px 16px' }}>
              <CreditCard size={18} color="var(--color-primary-light)" />
              <div style={{ marginTop: 10, fontWeight: 800 }}>Réservation horodatée</div>
              <p style={{ marginTop: 8, color: 'var(--color-text-secondary)', lineHeight: 1.55, fontSize: '0.9rem' }}>
                Le client voit le créneau, le statut et son point d’arrivée avant de se déplacer.
              </p>
            </div>
            <div className="glass-card" style={{ padding: '18px 16px' }}>
              <TimerReset size={18} color="var(--color-warning)" />
              <div style={{ marginTop: 10, fontWeight: 800 }}>Expiration automatique</div>
              <p style={{ marginTop: 8, color: 'var(--color-text-secondary)', lineHeight: 1.55, fontSize: '0.9rem' }}>
                Une réservation non présentée ne doit pas bloquer la capacité plus longtemps que nécessaire.
              </p>
            </div>
            <div className="glass-card" style={{ padding: '18px 16px' }}>
              <ShieldCheck size={18} color="var(--color-success)" />
              <div style={{ marginTop: 10, fontWeight: 800 }}>Validation sur place</div>
              <p style={{ marginTop: 8, color: 'var(--color-text-secondary)', lineHeight: 1.55, fontSize: '0.9rem' }}>
                Le commerçant valide la prise en charge avec le client présent, pas depuis une simple liste.
              </p>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gap: 24 }}>
          <SectionTitle
            eyebrow="Questions fréquentes"
            title="Les objections les plus probables avant la connexion"
            body="La FAQ reste présente, mais elle passe après les CTA principaux pour ne pas diluer l’entrée dans le produit."
          />
          <div style={{ display: 'grid', gap: 12 }}>
            {faqItems.map((item) => (
              <div key={item.q} className="glass-card" style={{ padding: '18px 18px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', marginBottom: 8 }}>{item.q}</div>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.92rem' }}>{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          className="glass-card"
          style={{
            padding: '24px 22px',
            background: 'linear-gradient(135deg, rgba(108,92,231,0.2), rgba(0,206,201,0.08))',
            display: 'grid',
            gap: 16,
          }}
        >
          <SectionTitle
            eyebrow="Dernier Choix"
            title="Voir l’offre ou ouvrir la connexion: les deux chemins sont immédiats"
            body="La landing doit conclure proprement: soit l’utilisateur explore la carte, soit il ouvre la connexion sans avoir à remonter la page ni chercher le bon bouton."
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button className="btn-primary" onClick={() => setShowAuthModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <LogIn size={16} />
              Connexion / Inscription
              <ArrowRight size={17} />
            </button>
            <button
              className="glass-card"
              onClick={() => navigate('/map')}
              style={{
                padding: '14px 18px',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Voir la carte maintenant
            </button>
            <button
              className="glass-card"
              onClick={() => navigate('/devenir-hote')}
              style={{
                padding: '14px 18px',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--color-primary-light)',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Devenir Hôte
            </button>
            <button
              className="glass-card"
              onClick={() => navigate('/cgu')}
              style={{
                padding: '14px 18px',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Lire les CGU
            </button>
          </div>
          <LegalLinks compact align="left" />
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
