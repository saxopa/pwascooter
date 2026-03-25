import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, ScanLine, X } from 'lucide-react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'

interface BarcodeScannerModalProps {
  open: boolean
  onClose: () => void
  onDetected: (rawValue: string) => void
}

export default function BarcodeScannerModal({
  open,
  onClose,
  onDetected,
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [initializing, setInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let isMounted = true
    let hasDetected = false
    const codeReader = new BrowserMultiFormatReader()

    async function startScanner() {
      setInitializing(true)
      setError(null)

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('CAMERA_UNAVAILABLE')
        }

        const video = videoRef.current
        if (!video) throw new Error('VIDEO_UNAVAILABLE')

        await codeReader.decodeFromConstraints(
          {
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          },
          video,
          (result, err) => {
            if (!isMounted || hasDetected) return

            if (result) {
              const rawValue = result.getText().trim()
              if (rawValue) {
                hasDetected = true
                onDetected(rawValue)
              }
            }

            if (err && !(err instanceof NotFoundException)) {
              // Ignore NotFoundException (thrown continuously when no code is found in frame).
              // Other errors can be ignored safely while stream stabilizes.
            }
          }
        )

      } catch (scannerError) {
        if (!isMounted) return

        const message = scannerError instanceof Error ? scannerError.message : String(scannerError)

        if (message.includes('Permission') || message.includes('NotAllowedError')) {
          setError('Accès caméra refusé. Autorise la caméra puis réessaie.')
        } else if (
          message === 'CAMERA_UNAVAILABLE' ||
          message.includes('NotFoundError') ||
          message.includes('devices')
        ) {
          setError('La caméra n’est pas disponible sur cet appareil.')
        } else {
          setError('Impossible de démarrer le scanner pour le moment.')
        }
      } finally {
        if (isMounted) {
          setInitializing(false)
        }
      }
    }

    void startScanner()

    return () => {
      isMounted = false
      codeReader.reset() // Stops the camera stream properly
    }
  }, [onDetected, open])

  if (!open) {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(8,10,18,0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
      }}
    >
      <div
        className="glass-card"
        data-testid="scanner-modal"
        style={{
          width: 'min(100%, 440px)',
          padding: '18px 16px 16px',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(15,15,26,0.96)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(0,206,201,0.14)',
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ScanLine size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>Scanner le code</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Présente le code-barres ou le QR code du client face à la caméra.
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fermer le scanner"
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.06)',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            marginTop: 16,
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            position: 'relative',
            background: 'rgba(0,0,0,0.42)',
            border: '1px solid rgba(255,255,255,0.08)',
            aspectRatio: '3 / 4',
          }}
        >
          <video
            ref={videoRef}
            data-testid="scanner-video"
            muted
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '20% 10%',
              border: '2px solid rgba(0,206,201,0.9)',
              borderRadius: 18,
              boxShadow: '0 0 0 9999px rgba(8,10,18,0.18)',
            }}
          />
          {initializing && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(8,10,18,0.48)',
                color: 'white',
                gap: 10,
                fontWeight: 700,
              }}
            >
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Initialisation caméra…
            </div>
          )}
        </div>

        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text-secondary)', fontSize: '0.84rem' }}>
          <Camera size={16} />
          Le scan lance automatiquement la validation dès qu’un code est détecté.
        </div>

        {error && (
          <div
            data-testid="scanner-error"
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,107,107,0.14)',
              color: 'var(--color-danger)',
              fontSize: '0.84rem',
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
