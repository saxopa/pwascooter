import { ArrowLeft, AlertTriangle, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const sections = [
  {
    title: '1. Nature du service',
    body: [
      'ScootSafe est une plateforme technique de mise en relation entre utilisateurs recherchant une solution de stationnement ou de prise en charge de leur trottinette et commerçants publiant des offres accessibles via l’application.',
      'ScootSafe n’exploite pas elle-même les emplacements proposés, n’assure pas la garde matérielle des trottinettes, n’exécute pas la prestation de stationnement ou de dépôt, et n’est pas partie au contrat conclu entre l’utilisateur et le commerçant, sauf mention expresse contraire sur une fonctionnalité donnée.',
    ],
  },
  {
    title: '2. Référencement, classement et déréférencement',
    body: [
      'Les offres visibles sur la carte dépendent notamment de leur état actif, de leur géolocalisation, des filtres choisis par l’utilisateur et, le cas échéant, des paramètres techniques d’affichage de la carte.',
      'Aucun classement sponsorisé ni priorité payante n’est appliqué à ce stade. ScootSafe peut suspendre ou déréférencer toute offre en cas de contenu inexact, indisponibilité répétée, manquement aux présentes CGU, suspicion de fraude, risque pour les utilisateurs ou obligation légale.',
    ],
  },
  {
    title: '3. Qualité des parties',
    body: [
      'Les commerçants publient leurs offres sous leur seule responsabilité et déclarent agir en qualité de professionnel lorsqu’ils proposent des services dans le cadre de leur activité.',
      'Chaque utilisateur ou commerçant demeure seul responsable de l’exactitude des informations qu’il renseigne, de sa capacité juridique, du respect de la réglementation qui lui est applicable et de toute assurance utile à son activité ou à ses biens.',
    ],
  },
  {
    title: '4. Contrats conclus via la plateforme',
    body: [
      'Toute réservation effectuée via ScootSafe matérialise une mise en relation et peut conduire à la conclusion d’un contrat distinct entre l’utilisateur et le commerçant portant sur l’occupation d’un emplacement, la prise en charge ou le dépôt temporaire d’un bien.',
      'Les conditions concrètes d’exécution de cette prestation, incluant accès, horaires, surveillance, remise du bien, refus de prise en charge, dommages, perte, vol, assurances et responsabilité du dépositaire, relèvent exclusivement de la relation entre l’utilisateur et le commerçant.',
    ],
  },
  {
    title: '5. Paiement et frais',
    body: [
      'Sauf mention contraire affichée au moment de la commande, ScootSafe agit comme interface technique de réservation. Le prix affiché correspond à l’offre publiée par le commerçant et/ou au calcul communiqué sur la plateforme.',
      'Lorsque ScootSafe intégrerait un prestataire de paiement, l’encaissement, le cantonnement des fonds, les remboursements et la sécurité des transactions pourront être opérés par un tiers spécialisé soumis à ses propres conditions contractuelles.',
    ],
  },
  {
    title: '6. Absence de garde par la plateforme',
    body: [
      'ScootSafe ne prend jamais possession physique des trottinettes, accessoires, batteries, cadenas, sacs, casques ou autres biens des utilisateurs.',
      'En conséquence, ScootSafe n’assume aucune obligation de dépositaire, gardien, transporteur, assureur, conservateur ou surveillant des biens remis, stationnés ou confiés à un commerçant référencé sur la plateforme.',
    ],
  },
  {
    title: '7. Limitation de responsabilité',
    body: [
      'Dans les limites permises par la loi, ScootSafe ne pourra être tenue responsable des dommages indirects, pertes d’exploitation, pertes de chance, pertes de données, pertes de clientèle, atteintes à l’image ou tout préjudice résultant de la relation contractuelle ou extracontractuelle entre l’utilisateur et le commerçant.',
      'ScootSafe ne garantit ni la disponibilité effective d’un emplacement, ni la qualité d’exécution du service par le commerçant, ni l’absence de vol, de dégradation, d’erreur humaine, de refus de prise en charge, de retard ou de litige entre les parties.',
      'Aucune clause des présentes ne limite toutefois la responsabilité de ScootSafe en cas de fraude, faute lourde, violation d’une obligation légale d’ordre public ou lorsque la loi interdit une telle limitation.',
    ],
  },
  {
    title: '8. Obligations des commerçants',
    body: [
      'Le commerçant s’engage à publier des informations exactes, à maintenir la disponibilité réelle des places, à respecter la réglementation applicable à son activité, à disposer des autorisations et assurances nécessaires, et à assumer seul la garde, la surveillance et la restitution des biens lorsqu’il accepte une prise en charge.',
      'Le commerçant garantit ScootSafe contre toute réclamation, action, condamnation, coût ou dommage résultant d’une inexécution de ses obligations, d’un manquement réglementaire, d’une atteinte aux droits de tiers ou d’un incident survenu pendant l’exécution de sa prestation.',
    ],
  },
  {
    title: '9. Obligations des utilisateurs',
    body: [
      'L’utilisateur s’engage à fournir des informations exactes, à respecter les consignes d’accès, les horaires, les règles de sécurité et les conditions fixées par le commerçant.',
      'L’utilisateur demeure responsable de l’état, de la conformité, du verrouillage, des accessoires laissés avec son bien et, plus généralement, de tout dommage causé au commerçant, aux lieux ou à des tiers du fait de son comportement ou de son matériel.',
    ],
  },
  {
    title: '10. Litiges',
    body: [
      'Les litiges relatifs à l’exécution de la prestation réservée, à la garde du bien, à sa restitution, à son état, à sa disparition, à sa dégradation ou au refus de prise en charge doivent être traités en priorité entre l’utilisateur et le commerçant.',
      'ScootSafe peut, sans y être tenue, transmettre des informations techniques de réservation ou d’horodatage utiles à la résolution du litige, sans assumer de mission d’arbitrage, d’expertise ou de garantie de résultat.',
    ],
  },
  {
    title: '11. Contenus illicites et comptes',
    body: [
      'ScootSafe peut suspendre ou supprimer tout compte, offre ou contenu manifestement illicite, frauduleux, trompeur, contraire aux présentes CGU ou portant atteinte à la sécurité de la plateforme ou de ses utilisateurs.',
      'Les utilisateurs peuvent signaler un contenu ou une offre litigieuse à l’adresse de contact indiquée dans les mentions légales ou le support de la plateforme.',
    ],
  },
  {
    title: '12. Données et preuve',
    body: [
      'Les journaux techniques, validations de réservation, horodatages, codes de retrait, confirmations de connexion et traces d’usage conservés par ScootSafe ou ses prestataires techniques peuvent être utilisés comme éléments de preuve, sous réserve des dispositions légales applicables.',
      'Le traitement des données personnelles est régi par la politique de confidentialité du service et par la réglementation applicable, notamment le RGPD.',
    ],
  },
  {
    title: '13. Droit applicable',
    body: [
      'Les présentes CGU sont soumises au droit français.',
      'Sous réserve des règles impératives applicables, tout litige relevant de la plateforme elle-même pourra être soumis à la juridiction compétente du ressort du siège de l’éditeur ou à toute juridiction autrement désignée par la loi.',
    ],
  },
] as const

export default function TermsPage() {
  const navigate = useNavigate()

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(180deg, #10111d 0%, #0a0b12 100%)',
      }}
    >
      <div
        style={{
          width: 'min(980px, 100%)',
          margin: '0 auto',
          padding: 'max(20px, env(safe-area-inset-top)) 20px max(28px, env(safe-area-inset-bottom))',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 26,
          }}
        >
          <button
            onClick={() => navigate(-1)}
            aria-label="Retour"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.06)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ textAlign: 'right' }}>
            <div className="text-gradient" style={{ fontWeight: 800, letterSpacing: '-0.03em', fontSize: '1.15rem' }}>
              Conditions Générales d’Utilisation
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginTop: 4 }}>
              Version plateforme de mise en relation
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: '22px 20px',
            background: 'linear-gradient(135deg, rgba(255,107,107,0.12), rgba(253,203,110,0.08))',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <AlertTriangle size={18} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 800, color: 'white', marginBottom: 8 }}>
                Positionnement juridique du service
              </div>
              <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.65, fontSize: '0.94rem' }}>
                ScootSafe est conçu comme une interface technique de mise en relation. La plateforme ne prend pas possession des biens, n’assure pas leur garde et n’exécute pas la prestation proposée par le commerçant. Toute relation matérielle de dépôt, stationnement ou surveillance se forme directement entre l’utilisateur et le commerçant concerné.
              </p>
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: '22px 20px',
            marginBottom: 22,
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <ShieldCheck size={18} color="var(--color-accent)" />
            <strong style={{ fontSize: '1rem' }}>Informations réglementaires essentielles</strong>
          </div>
          <div style={{ display: 'grid', gap: 10, color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.92rem' }}>
            <p>Le service permet la mise en relation entre utilisateurs et commerçants pour la réservation d’un emplacement ou d’une prise en charge locale d’une trottinette.</p>
            <p>Le référencement n’est pas sponsorisé à ce stade. La visibilité dépend de l’état actif de l’offre, de sa présence sur la carte et des filtres choisis par l’utilisateur.</p>
            <p>Les commerçants sont responsables de leurs offres, de la prestation fournie, de leurs obligations professionnelles, fiscales, assurantielles et réglementaires.</p>
            <p>En cas de litige sur la prestation réservée, la résolution doit intervenir d’abord entre l’utilisateur et le commerçant. ScootSafe peut uniquement transmettre des données techniques de réservation lorsqu’elles existent.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          {sections.map((section) => (
            <section
              key={section.title}
              className="glass-card"
              style={{
                padding: '20px 18px',
                background: 'rgba(255,255,255,0.04)',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 10 }}>{section.title}</h2>
              <div style={{ display: 'grid', gap: 10 }}>
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    style={{
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.7,
                      fontSize: '0.93rem',
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
