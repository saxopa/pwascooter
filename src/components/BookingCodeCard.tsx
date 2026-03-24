import Code39Barcode from './Code39Barcode'

interface BookingCodeCardProps {
    code: string
    title?: string
    subtitle?: string
    compact?: boolean
}

export default function BookingCodeCard({
    code,
    title = 'Code de depot',
    subtitle = 'Montre ce code au commerçant pour valider la prise en charge.',
    compact = false,
}: BookingCodeCardProps) {
    const pickupCode = code.toUpperCase()

    return (
        <div
            className="glass-card"
            style={{
                padding: compact ? '12px 14px' : '16px 16px 14px',
                background: 'rgba(255,255,255,0.05)',
            }}
        >
            <div style={{ fontSize: compact ? '0.72rem' : '0.76rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}>
                {title}
            </div>
            <div
                style={{
                    marginTop: 6,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: compact ? '1.1rem' : '1.35rem',
                    fontWeight: 800,
                    letterSpacing: '0.18em',
                    color: 'white',
                }}
            >
                {pickupCode}
            </div>
            <div style={{ marginTop: 12, color: 'var(--color-text-primary)' }}>
                <Code39Barcode value={pickupCode} height={compact ? 42 : 56} />
            </div>
            <p style={{ marginTop: 10, fontSize: compact ? '0.75rem' : '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                {subtitle}
            </p>
        </div>
    )
}
