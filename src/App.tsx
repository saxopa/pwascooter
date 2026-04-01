import { Suspense, lazy, useCallback, useEffect, useState, useRef, type ReactNode } from 'react'
import { Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { useHostProfile } from './contexts/HostProfileContext'

const LandingPage = lazy(() => import('./components/LandingPage'))
const MapView = lazy(() => import('./components/MapView'))
const BookingsList = lazy(() => import('./components/BookingsList'))
const HostDashboard = lazy(() => import('./components/HostDashboard'))
const TermsPage = lazy(() => import('./components/TermsPage'))
const BecomeHost = lazy(() => import('./components/BecomeHost'))

function AppShellLoader() {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 'var(--app-viewport-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-dark)',
        color: 'var(--color-text-secondary)',
        fontWeight: 600,
      }}
    >
      Chargement…
    </div>
  )
}

function AppRoutes() {
  return (
    <Suspense fallback={<AppShellLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/cgu" element={<TermsPage />} />
        <Route path="/devenir-hote" element={<BecomeHost />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/bookings" element={<BookingsList />} />
        <Route
          path="/host/dashboard"
          element={
            <ProtectedRoute requiredRole="host">
              <HostDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/map" replace />} />
      </Routes>
    </Suspense>
  )
}

function AppBootstrap({ onReady }: { onReady: () => void }) {
  const navigate = useNavigate()
  const { loading: profileLoading } = useHostProfile()

  useEffect(() => {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
    const searchParams = new URLSearchParams(window.location.search)
    const authCode = searchParams.get('code')

    if (authCode) {
      window.history.replaceState({}, document.title, `${window.location.origin}${basePath}/#/map`)
      navigate('/map', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    if (!profileLoading) {
      onReady()
      return
    }

    const fallbackTimer = window.setTimeout(() => {
      onReady()
    }, 1500)

    return () => {
      window.clearTimeout(fallbackTimer)
    }
  }, [profileLoading, onReady])

  return null
}

function AppFrame({ children }: { children: ReactNode }) {
  const location = useLocation()
  const isFullscreenRoute = location.pathname === '/map'

  return (
    <div
      style={{
        width: '100%',
        minHeight: 'var(--app-viewport-height)',
        height: isFullscreenRoute ? 'var(--app-viewport-height)' : 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  )
}

function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const updateViewportHeight = () => {
      root.style.setProperty('--app-viewport-height', `${window.innerHeight}px`)
    }

    updateViewportHeight()
    window.addEventListener('resize', updateViewportHeight)
    window.addEventListener('orientationchange', updateViewportHeight)

    return () => {
      window.removeEventListener('resize', updateViewportHeight)
      window.removeEventListener('orientationchange', updateViewportHeight)
    }
  }, [])

  const hasCalledReady = useRef(false)
  const handleReady = useCallback(() => {
    if (hasCalledReady.current) return
    hasCalledReady.current = true
    setReady(true)
  }, [])

  return (
    <AppFrame>
      <AppBootstrap onReady={handleReady} />
      {!ready ? (
        <AppShellLoader />
      ) : (
        <AppRoutes />
      )}
    </AppFrame>
  )
}

export default App
