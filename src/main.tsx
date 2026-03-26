import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import PWAManager from './components/PWAManager'
import { HostProfileProvider } from './contexts/HostProfileContext'
import { HostsProvider } from './contexts/HostsContext'
import { registerSW } from 'virtual:pwa-register'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PWAManager />
    <HostProfileProvider>
      <HostsProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </HostsProvider>
    </HostProfileProvider>
  </StrictMode>,
)

if (import.meta.env.PROD) {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Affiche une notification de mise à jour à l'utilisateur
      const shouldUpdate = window.confirm(
        '📦 Une nouvelle version de ScootSafe est disponible. Mettre à jour maintenant ?'
      )
      if (shouldUpdate) {
        updateSW(true)
      }
    },
    onOfflineReady() {
      console.log('[ScootSafe] Application prête pour une utilisation hors-ligne.')
    },
    onRegistered(registration) {
      if (registration) {
        // Vérifie les mises à jour toutes les heures
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000)
      }
    },
    onRegisterError(error) {
      console.error('[ScootSafe] Échec enregistrement Service Worker:', error)
    },
    immediate: true,
  })
}
