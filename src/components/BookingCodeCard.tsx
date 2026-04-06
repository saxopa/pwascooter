import { useRef, useState } from 'react'
import { Download, Share2 } from 'lucide-react'
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
    const svgRef = useRef<SVGSVGElement>(null)
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        const svg = svgRef.current
        if (!svg || saving) return
        setSaving(true)

        try {
            const svgData = new XMLSerializer().serializeToString(svg)
            const vb = svg.viewBox.baseVal
            const scale = 2
            const textAreaHeight = 60

            const canvas = document.createElement('canvas')
            canvas.width = vb.width * scale
            canvas.height = vb.height * scale + textAreaHeight

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // White background
            ctx.fillStyle = 'white'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Draw SVG onto canvas
            const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
            const url = URL.createObjectURL(blob)

            await new Promise<void>((resolve, reject) => {
                const img = new Image()
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvas.width, vb.height * scale)
                    URL.revokeObjectURL(url)
                    resolve()
                }
                img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG load failed')) }
                img.src = url
            })

            // Code text below barcode
            ctx.fillStyle = '#111111'
            ctx.font = `bold ${Math.round(28 * scale / 2)}px ui-monospace, SFMono-Regular, Menlo, monospace`
            ctx.textAlign = 'center'
            ctx.fillText(pickupCode, canvas.width / 2, vb.height * scale + textAreaHeight - 14)

            // Export as PNG
            await new Promise<void>((resolve) => {
                canvas.toBlob(async (pngBlob) => {
                    if (!pngBlob) { resolve(); return }
                    const filename = `scootsafe-${pickupCode}.png`
                    const file = new File([pngBlob], filename, { type: 'image/png' })

                    if (navigator.share && navigator.canShare?.({ files: [file] })) {
                        try {
                            await navigator.share({
                                title: `Code ScootSafe ${pickupCode}`,
                                text: `Mon code de dépôt ScootSafe : ${pickupCode}`,
                                files: [file],
                            })
                        } catch (err) {
                            // User cancelled share — not an error
                            if (err instanceof Error && err.name !== 'AbortError') {
                                console.error('Share failed:', err)
                            }
                        }
                    } else {
                        const objectUrl = URL.createObjectURL(pngBlob)
                        const a = document.createElement('a')
                        a.href = objectUrl
                        a.download = filename
                        a.click()
                        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
                    }
                    resolve()
                }, 'image/png')
            })
        } catch (err) {
            console.error('handleSave error:', err)
        } finally {
            setSaving(false)
        }
    }

    const canShare = typeof navigator !== 'undefined' && 'share' in navigator

    return (
        <div
            className="glass-card"
            data-testid="booking-code-card"
            style={{
                padding: compact ? '12px 14px' : '16px 16px 14px',
                background: 'rgba(255,255,255,0.05)',
            }}
        >
            <div style={{ fontSize: compact ? '0.72rem' : '0.76rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}>
                {title}
            </div>
            <div
                data-testid="booking-code-value"
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
                <Code39Barcode ref={svgRef} value={pickupCode} height={compact ? 42 : 56} />
            </div>
            <p style={{ marginTop: 10, fontSize: compact ? '0.75rem' : '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                {subtitle}
            </p>

            {/* Save / Share button */}
            <button
                onClick={handleSave}
                disabled={saving}
                style={{
                    marginTop: 10,
                    width: '100%',
                    padding: '10px',
                    background: saving ? 'rgba(255,255,255,0.04)' : 'rgba(0,206,201,0.12)',
                    border: `1px solid ${saving ? 'rgba(255,255,255,0.08)' : 'rgba(0,206,201,0.2)'}`,
                    borderRadius: 'var(--radius-sm)',
                    color: saving ? 'var(--color-text-muted)' : 'var(--color-accent)',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.2s',
                    opacity: saving ? 0.6 : 1,
                }}
            >
                {canShare
                    ? <><Share2 size={15} /> {saving ? 'Préparation…' : 'Partager le code'}</>
                    : <><Download size={15} /> {saving ? 'Préparation…' : 'Enregistrer le code'}</>
                }
            </button>
        </div>
    )
}
