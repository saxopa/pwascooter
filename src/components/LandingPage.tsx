import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CreditCard,
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
    title: 'Pour les clients',
    points: [
      'Repérer rapidement une solution de proximité.',
      'Réserver sans appeler ni négocier sur place.',
      'Conserver une trace horodatée du dépôt et de la restitution.',
    ],
    accent: 'rgba(0,206,201,0.14)',
  },
  {
    title: 'Pour les commerçants',
    points: [
      'Publier une ou plusieurs places avec prix, capacité et recharge.',
      'Valider le dépôt par code ou scanner sans outil externe.',
      'Suivre les statuts, créneaux et clôtures depuis un tableau de bord unique.',
    ],
    accent: 'rgba(108,92,231,0.16)',
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
              Plateforme de mise en relation pour dépôt et stationnement local de trottinettes.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              className="glass-card"
              onClick={() => navigate('/map')}
              style={{
                padding: '10px 16px',
                background: 'rgba(26,26,46,0.72)',
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
                background: 'rgba(26,26,46,0.78)',
                color: 'var(--color-text-primary)',
                borderRadius: '999px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Connexion
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
                Donnez à la
                <span className="text-gradient" style={{ display: 'block' }}>
                  trottinette urbaine
                </span>
                un vrai point d’arrivée.
              </h1>
              <p style={{ marginTop: 18, color: 'var(--color-text-secondary)', fontSize: '1rem', maxWidth: 620, lineHeight: 1.7 }}>
                ScootSafe aide un visiteur à trouver une solution de proximité, puis transforme cette découverte en réservation suivie, horodatée et validée sur place. La plateforme référence les offres, gère le parcours numérique et la traçabilité. La prestation physique reste exécutée par le commerçant qui accepte la prise en charge.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <button className="btn-primary" onClick={() => navigate('/map')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Explorer la carte sans compte
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
                  fontWeight: 700,
                }}
              >
                Créer un compte
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <span className="glass-card" style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontSize: '0.84rem' }}>
                Connexion email + Google
              </span>
              <span className="glass-card" style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontSize: '0.84rem' }}>
                CGU à accepter avant inscription
              </span>
              <span className="glass-card" style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontSize: '0.84rem' }}>
                Validation par code ou scanner
              </span>
              <span className="glass-card" style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontSize: '0.84rem' }}>
                Installable iPhone et Android
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
              padding: 22,
              background: 'linear-gradient(180deg, rgba(20,22,34,0.92), rgba(10,12,20,0.96))',
              display: 'grid',
              gap: 16,
            }}
          >
            <div
              style={{
                display: 'grid',
                gap: 10,
                padding: '16px 18px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}>
                    Parcours public
                  </div>
                  <strong style={{ display: 'block', marginTop: 6, fontSize: '1.05rem' }}>Voir les offres avant de s’inscrire</strong>
                </div>
                <Sparkles size={18} color="var(--color-accent)" />
              </div>
              <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.92rem' }}>
                La carte reste consultable sans session. Le compte devient nécessaire uniquement au moment de réserver, de publier une place ou de suivre des opérations horodatées.
              </p>
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

            <div
              style={{
                padding: '18px 18px 20px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, rgba(108,92,231,0.22), rgba(0,206,201,0.12))',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}>
                Positionnement juridique
              </div>
              <div style={{ marginTop: 10, fontWeight: 700, fontSize: '1.1rem' }}>
                ScootSafe orchestre la mise en relation et la preuve numérique.
              </div>
              <p style={{ marginTop: 10, color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.9rem' }}>
                La garde effective, la surveillance, les assurances métier, l’acceptation ou le refus de prise en charge et la restitution relèvent du commerçant référencé, dans les limites prévues par les CGU et la loi applicable.
              </p>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gap: 26 }}>
          <SectionTitle
            eyebrow="Mode d’emploi"
            title="Le service doit se comprendre immédiatement"
            body="La page d’accueil expose désormais le rôle de chaque partie, le moment où le compte devient requis, et le fait que la carte reste une vitrine consultable publiquement pour rassurer un visiteur avant inscription."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {audienceCards.map((card) => (
              <div key={card.title} className="glass-card" style={{ padding: '20px 18px', background: card.accent }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  {card.title.includes('clients') ? <Store size={18} color="var(--color-accent)" /> : <Building2 size={18} color="var(--color-primary-light)" />}
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
            eyebrow="Contrôle métier"
            title="Le flux ne se contente plus d’être joli, il devient traçable"
            body="Les réservations disposent d’un créneau affiché côté client et côté commerçant, d’un code de validation présenté sur place, d’une expiration automatique des pending, de règles d’annulation liées à l’heure de début et d’un journal d’audit des transitions de statut côté base."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div className="glass-card" style={{ padding: '18px 16px' }}>
              <CreditCard size={18} color="var(--color-primary-light)" />
              <div style={{ marginTop: 10, fontWeight: 800 }}>Réservation horodatée</div>
              <p style={{ marginTop: 8, color: 'var(--color-text-secondary)', lineHeight: 1.55, fontSize: '0.9rem' }}>
                Le client voit désormais de quelle heure à quelle heure le créneau est réservé.
              </p>
            </div>
            <div className="glass-card" style={{ padding: '18px 16px' }}>
              <TimerReset size={18} color="var(--color-warning)" />
              <div style={{ marginTop: 10, fontWeight: 800 }}>Pending auto-expiré</div>
              <p style={{ marginTop: 8, color: 'var(--color-text-secondary)', lineHeight: 1.55, fontSize: '0.9rem' }}>
                Une réservation jamais présentée sur place ne reste pas bloquée indéfiniment dans la capacité.
              </p>
            </div>
            <div className="glass-card" style={{ padding: '18px 16px' }}>
              <ShieldCheck size={18} color="var(--color-success)" />
              <div style={{ marginTop: 10, fontWeight: 800 }}>Validation par présentation</div>
              <p style={{ marginTop: 8, color: 'var(--color-text-secondary)', lineHeight: 1.55, fontSize: '0.9rem' }}>
                Le code n’est plus visible directement côté host dans la liste, pour éviter une validation sans client.
              </p>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gap: 24 }}>
          <SectionTitle
            eyebrow="Questions fréquentes"
            title="Les réponses qu’un visiteur, un commerçant ou un juriste poseront vite"
            body="Cette section allonge volontairement la page et répond aux objections les plus probables avant même le premier clic sur l’authentification."
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
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
            display: 'grid',
            gap: 16,
          }}
        >
          <SectionTitle
            eyebrow="Cadre"
            title="Un visiteur doit comprendre avant de cliquer sur créer un compte"
            body="La carte publique sert l’acquisition. L’adhésion aux CGU intervient avant toute inscription. Les CGU détaillent le rôle de la plateforme, la place du commerçant dans l’exécution réelle du service et les limites de responsabilité applicables."
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button className="btn-primary" onClick={() => navigate('/map')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Voir la carte maintenant
              <ArrowRight size={17} />
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
            <button
              className="glass-card"
              onClick={() => setShowAuthModal(true)}
              style={{
                padding: '14px 18px',
                background: 'rgba(108,92,231,0.18)',
                color: 'var(--color-primary-light)',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Ouvrir l’inscription
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
