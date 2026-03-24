const CODE39_PATTERNS: Record<string, string> = {
    '0': 'nnnwwnwnn',
    '1': 'wnnwnnnnw',
    '2': 'nnwwnnnnw',
    '3': 'wnwwnnnnn',
    '4': 'nnnwwnnnw',
    '5': 'wnnwwnnnn',
    '6': 'nnwwwnnnn',
    '7': 'nnnwnnwnw',
    '8': 'wnnwnnwnn',
    '9': 'nnwwnnwnn',
    A: 'wnnnnwnnw',
    B: 'nnwnnwnnw',
    C: 'wnwnnwnnn',
    D: 'nnnnwwnnw',
    E: 'wnnnwwnnn',
    F: 'nnwnwwnnn',
    G: 'nnnnnwwnw',
    H: 'wnnnnwwnn',
    I: 'nnwnnwwnn',
    J: 'nnnnwwwnn',
    K: 'wnnnnnnww',
    L: 'nnwnnnnww',
    M: 'wnwnnnnwn',
    N: 'nnnnwnnww',
    O: 'wnnnwnnwn',
    P: 'nnwnwnnwn',
    Q: 'nnnnnnwww',
    R: 'wnnnnnwwn',
    S: 'nnwnnnwwn',
    T: 'nnnnwnwwn',
    U: 'wwnnnnnnw',
    V: 'nwwnnnnnw',
    W: 'wwwnnnnnn',
    X: 'nwnnwnnnw',
    Y: 'wwnnwnnnn',
    Z: 'nwwnwnnnn',
    '-': 'nwnnnnwnw',
    '.': 'wwnnnnwnn',
    ' ': 'nwwnnnwnn',
    '*': 'nwnnwnwnn',
}

interface Code39BarcodeProps {
    value: string
    height?: number
}

export default function Code39Barcode({ value, height = 56 }: Code39BarcodeProps) {
    const encodedValue = `*${value.toUpperCase()}*`
    const narrow = 2
    const wide = 5
    const gap = 3
    const quietZone = 12
    let cursor = quietZone
    const bars: React.ReactNode[] = []

    for (const char of encodedValue) {
        const pattern = CODE39_PATTERNS[char]
        if (!pattern) continue

        for (let index = 0; index < pattern.length; index += 1) {
            const unit = pattern[index] === 'w' ? wide : narrow
            const isBar = index % 2 === 0

            if (isBar) {
                bars.push(
                    <rect
                        key={`${char}-${index}-${cursor}`}
                        x={cursor}
                        y={0}
                        width={unit}
                        height={height}
                        rx={0.4}
                        fill="currentColor"
                    />
                )
            }

            cursor += unit
        }

        cursor += gap
    }

    cursor += quietZone

    return (
        <svg
            viewBox={`0 0 ${cursor} ${height}`}
            width="100%"
            height={height}
            aria-label={`Code barre ${value}`}
            role="img"
            style={{
                display: 'block',
                background: 'white',
                color: '#111',
                borderRadius: 10,
                padding: '6px 8px',
            }}
            shapeRendering="crispEdges"
        >
            {bars}
        </svg>
    )
}
