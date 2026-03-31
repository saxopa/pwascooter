import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const OAUTH_CALLBACK_TIMEOUT_MS = 8000

function replaceWithHashRoute(targetPath: string) {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  const normalizedPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`
  const cleanUrl = `${window.location.origin}${basePath}/#${normalizedPath}`
  window.history.replaceState({}, document.title, cleanUrl)
}

async function withTimeout<T>(promise: Promise<T>, timeoutMessage: string) {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(timeoutMessage)), OAUTH_CALLBACK_TIMEOUT_MS)
    }),
  ])
}

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true

    async function finish(targetPath: string) {
      replaceWithHashRoute(targetPath)
      if (isMounted) {
        navigate(targetPath, { replace: true })
      }
    }

    async function bootstrapOAuthCallback() {
      const searchParams = new URLSearchParams(window.location.search)
      const authCode = searchParams.get('code')

      if (!authCode) {
        await finish('/map')
        return
      }

      try {
        const { error } = await withTimeout(
          supabase.auth.exchangeCodeForSession(authCode),
          'OAUTH_CALLBACK_TIMEOUT',
        )

        if (error) {
          console.error('OAuth callback exchange failed:', error)
        }
      } catch (error) {
        console.error('OAuth callback exchange timed out:', error)
      } finally {
        await finish('/map')
      }
    }

    void bootstrapOAuthCallback()

    return () => {
      isMounted = false
    }
  }, [navigate])

  return (
    <div
      style={{
        minHeight: 'var(--app-viewport-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-dark)',
        color: 'var(--color-text-secondary)',
        fontWeight: 600,
        padding: 24,
        textAlign: 'center',
      }}
    >
      Finalisation de la connexion Google…
    </div>
  )
}
