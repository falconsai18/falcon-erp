
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store/authStore'
import { usePermission } from '@/hooks/usePermission'
import { type Action, type Resource } from '@/config/permissions'
import { toast } from 'sonner'
import { useEffect, useRef } from 'react'

interface ProtectedRouteProps {
    children: React.ReactNode
    requiredPermission?: {
        action: Action
        resource: Resource
    }
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuthStore()
    const { can } = usePermission()
    const location = useLocation()
    const toastShownRef = useRef(false)

    // Reset toast ref on location change
    useEffect(() => {
        toastShownRef.current = false
    }, [location.pathname])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 size={40} className="animate-spin text-brand-400 mx-auto" />
                    <p className="text-dark-500">Loading Falcon ERP...</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    if (requiredPermission) {
        if (!can(requiredPermission.action, requiredPermission.resource)) {
            // Prevent duplicate toasts in strict mode double-render
            if (!toastShownRef.current) {
                toast.error('Access Denied: Insufficient permissions')
                toastShownRef.current = true
            }
            return <Navigate to="/" replace />
        }
    }

    return <>{children}</>
}
