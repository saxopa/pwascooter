import { Navigate } from 'react-router-dom'
import { useHostProfile } from '../hooks/useHostProfile'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
    children: React.ReactNode
    requiredRole: 'host' | 'admin'
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { user, profile, loading } = useHostProfile()

    if (loading) {
        return (
            <div
                style={{
                    minHeight: 'var(--app-viewport-height)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--color-bg-dark)',
                }}
            >
                <Loader2
                    size={32}
                    style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary-light)' }}
                />
            </div>
        )
    }

    if (!user || profile?.role !== requiredRole) {
        return <Navigate to="/map" replace />
    }

    return <>{children}</>
}
