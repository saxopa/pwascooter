import { Link } from 'react-router-dom'

interface LegalLinksProps {
  compact?: boolean
  align?: 'left' | 'center' | 'right'
}

export default function LegalLinks({
  compact = false,
  align = 'center',
}: LegalLinksProps) {
  const justifyContent =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent,
        gap: compact ? 10 : 14,
        fontSize: compact ? '0.76rem' : '0.82rem',
      }}
    >
      <Link
        to="/cgu"
        style={{
          color: 'var(--color-text-muted)',
          textDecoration: 'none',
        }}
      >
        CGU
      </Link>
      <Link
        to="/map"
        style={{
          color: 'var(--color-text-muted)',
          textDecoration: 'none',
        }}
      >
        Carte
      </Link>
    </div>
  )
}
