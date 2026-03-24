import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, ScanLine, X } from 'lucide-react'

const REQUESTED_FORMATS = ['code_39', 'code_128', 'qr_code'] as const

type DetectorFormat = typeof REQUESTED_FORMATS[number]

interface DetectedBarcode {
  rawValue?: string
}

interface BarcodeDetectorInstance {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>
}

interface BarcodeDetectorConstructor {
  new(options?: { formats?: DetectorFormat[] }): BarcodeDetectorInstance
  getSupportedFormats?: () => Promise<string[]>
}

type WindowWithBarcodeDetector = Window & {
  BarcodeDetector?: BarcodeDetectorConstructor
}

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
    let stream: MediaStream | null = null
    let scanTimer: number | null = null
    let isDetecting = false
    let hasDetected = false

    async function stopScanner() {
      if (scanTimer !== null) {
        window.clearInterval(scanTimer)
      }

      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      const video = videoRef.current
      if (video) {
        video.pause()
        video.srcObject = null
      }
    }

    async function startScanner() {
      setInitializing(true)
      setError(null)

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('CAMERA_UNAVAILABLE')
        }

        const BarcodeDetector = (window as WindowWithBarcodeDetector).BarcodeDetector

        if (!BarcodeDetector) {
          throw new Error('DETECTOR_UNAVAILABLE')
        }

        const supportedFormats = BarcodeDetector.getSupportedFormats
          ? await BarcodeDetector.getSupportedFormats()
          : [...REQUESTED_FORMATS]

        const enabledFormats = REQUESTED_FORMATS.filter((format) => supportedFormats.includes(format))

        if (enabledFormats.length === 0) {
          throw new Error('FORMAT_UNAVAILABLE')
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        })

        if (!isMounted) {
          await stopScanner()
          return
        }

        const video = videoRef.current
        if (!video) {
          throw new Error('VIDEO_UNAVAILABLE')
        }

        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        await video.play()

        const detector = new BarcodeDetector({ formats: enabledFormats })

        scanTimer = window.setInterval(async () => {
          if (!videoRef.current || isDetecting || hasDetected) return

          isDetecting = true

          try {
            const detectedBarcodes = await detector.detect(videoRef.current)
            const rawValue = detectedBarcodes.find((barcode) => barcode.rawValue?.trim())?.rawValue?.trim()

            if (rawValue && isMounted) {
              hasDetected = true
              onDetected(rawValue)
            }
          } catch {
            // Ignore transient detector failures while the camera stream stabilizes.
          } finally {
            isDetecting = false
          }
        }, 350)
      } catch (scannerError) {
        if (!isMounted) return

        const message = scannerError instanceof Error ? scannerError.message : 'UNKNOWN'

        if (message === 'CAMERA_UNAVAILABLE') {
          setError('La caméra n’est pas disponible dans ce navigateur.')
        } else if (message === 'DETECTOR_UNAVAILABLE' || message === 'FORMAT_UNAVAILABLE') {
          setError('Le scan caméra n’est pas pris en charge ici. Utilise la saisie manuelle du code.')
        } else if (message === 'NotAllowedError') {
          setError('Accès caméra refusé. Autorise la caméra puis réessaie.')
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
      void stopScanner()
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
