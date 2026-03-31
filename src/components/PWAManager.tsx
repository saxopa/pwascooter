import { useEffect, useState } from 'react'
import { Download, WifiOff, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

export default function PWAManager() {
  const [isIOS] = useState(() => {
    const ua = navigator.userAgent
    return /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
  })
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches

    // Helper pour capturer SecurityError sur iOS Private Browsing
    const safeStorage = {
      get: (key: string): string | null => {
        try { return localStorage.getItem(key) } catch { return null }
      },
      set: (key: string, value: string): void => {
        try { localStorage.setItem(key, value) } catch { /* silent */ }
      }
    }

    // Vérifie si déjà installé ou si banner déjà refusé
    const dismissedAt = safeStorage.get('scootsafe_install_dismissed')
    const alreadyDismissed = dismissedAt
      ? Date.now() - parseInt(dismissedAt, 10) < 7 * 24 * 60 * 60 * 1000 // 7 jours
      : false

    if (!isStandalone && !alreadyDismissed) {
      if (isIOS) {
        // Sur iOS, montrer le guide après 30s
        const timer = setTimeout(() => setShowInstallBanner(true), 30000)
        return () => clearTimeout(timer)
      }
    }
  }, [isIOS])

  useEffect(() => {
    // Capture l'événement beforeinstallprompt (Chrome/Android)
    let bannerTimer: number | null = null

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      // Montre la bannière après 60 secondes de navigation
      if (bannerTimer !== null) {
        window.clearTimeout(bannerTimer)
      }
      bannerTimer = window.setTimeout(() => setShowInstallBanner(true), 60000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => {
      if (bannerTimer !== null) {
        window.clearTimeout(bannerTimer)
      }
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  useEffect(() => {
    // Détection connexion réseau
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function handleInstallClick() {
    if (isIOS) {
      setShowIOSGuide(true)
      return
    }
    if (!installPrompt) return

    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice

    if (outcome === 'accepted') {
      setInstallPrompt(null)
      setShowInstallBanner(false)
    }
  }

  function handleDismiss() {
    try { localStorage.setItem('scootsafe_install_dismissed', Date.now().toString()) } catch { /* silent */ }
    setShowInstallBanner(false)
    setIsDismissed(true)
  }

  if (isDismissed) return null

  return (
    <>
      {/* Bandeau Offline */}
      <div className={`offline-banner ${isOffline ? 'visible' : ''}`}>
        <WifiOff size={14} style={{ display: 'inline', marginRight: 6 }} />
        Mode hors-ligne — La carte peut être indisponible
      </div>

      {/* Bannière d'installation */}
      {showInstallBanner && !isOffline && (
        <div className="pwa-install-banner" role="banner" aria-label="Installer ScootSafe">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <Download size={20} />
            <div>
              <div style={{ fontSize: '0.9rem' }}>Installer ScootSafe</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.85, fontWeight: 400 }}>
                Accès rapide depuis votre écran d'accueil
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={handleInstallClick}
              style={{
                padding: '8px 14px',
                background: 'white',
                color: '#6C5CE7',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.82rem',
              }}
            >
              Installer
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Fermer"
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Guide installation iOS */}
      {showIOSGuide && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              padding: '28px 24px',
              paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
              borderTopLeftRadius: 'var(--radius-xl)',
              borderTopRightRadius: 'var(--radius-xl)',
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              animation: 'slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-text-muted)', margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16, textAlign: 'center' }}>
              Installer ScootSafe sur iOS
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { step: '1', text: 'Appuie sur l\'icône Partager en bas de Safari (rectangle avec flèche)' },
                { step: '2', text: 'Fais défiler et appuie sur "Sur l\'écran d\'accueil"' },
                { step: '3', text: 'Appuie sur "Ajouter" en haut à droite' },
              ].map(({ step, text }) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.9rem', flexShrink: 0,
                  }}>
                    {step}
                  </div>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>{text}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="btn-primary"
              style={{ width: '100%', marginTop: 24 }}
            >
              Compris !
            </button>
          </div>
        </div>
      )}
    </>
  )
}
