
import { useCallback } from 'react'
import { useAuthStore } from '@/features/auth/store/authStore'
import { PERMISSIONS, type Action, type Resource, type UserRole, SIDEBAR_MODULES } from '@/config/permissions'

export function usePermission() {
    const { user } = useAuthStore()
    const role = (user?.role as UserRole) || 'viewer'

    const can = useCallback((action: Action, resource: Resource): boolean => {
        const rolePermissions = PERMISSIONS[resource]
        if (!rolePermissions) return false

        const allowedActions = rolePermissions[role]
        if (!allowedActions) return false

        return allowedActions.includes(action)
    }, [role])

    const canAny = useCallback((actions: Action[], resource: Resource): boolean => {
        const rolePermissions = PERMISSIONS[resource]
        if (!rolePermissions) return false

        const allowedActions = rolePermissions[role]
        if (!allowedActions) return false

        return actions.some(action => allowedActions.includes(action))
    }, [role])

    const canAccessModule = useCallback((path: string): boolean => {
        const allowedModules = SIDEBAR_MODULES[role]
        if (!allowedModules) return false

        if (allowedModules.includes('*')) return true

        // Check for exact match or sub-path match (e.g. /customers/123 -> /customers)
        return allowedModules.some(module =>
            module === path || (module !== '/' && path.startsWith(module))
        )
    }, [role])

    return {
        role,
        isAdmin: role === 'admin' || role === 'super_admin',
        isSuperAdmin: role === 'super_admin',
        can,
        canAny,
        canAccessModule
    }
}
