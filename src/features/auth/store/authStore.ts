import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import { localAuth } from '@/lib/localAuth'
import { UserRole } from '@/config/permissions'

interface AuthUser {
    id: string
    email: string
    full_name: string
    role: UserRole
    phone?: string
    avatar_url?: string
    company_id?: string
    is_active: boolean
    department?: string
    permissions: Record<string, unknown>
}

interface AuthStore {
    user: AuthUser | null
    isLoading: boolean
    isAuthenticated: boolean
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
    logout: () => Promise<void>
    setUser: (user: AuthUser | null) => void
    checkSession: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            user: null,
            isLoading: true,
            isAuthenticated: false,
 
            login: async (email: string, password: string) => {
                try {
                    set({ isLoading: true })
 
                    const result = await localAuth.signIn(email, password)
 
                    if (result.error) {
                        set({ isLoading: false })
                        return { success: false, error: result.error.message }
                    }
 
                    if (result.data?.user) {
                        // Fetch the real session ID from the SAME supabase instance
                        const { data: { session } } = await supabase.auth.getSession()
                        const userId = session?.user?.id || result.data.user.id

                        // Fetch full profile from public.users (was 'user_profiles')
                        let profile = null
                        try {
                            const { data: profileData, error: profileError } = await supabase
                                .from('users')
                                .select('*')
                                .eq('id', userId)
                                .single()
 
                            if (profileError) throw profileError
                            profile = profileData
                        } catch (err) {
                            console.error('[AuthStore] Error fetching user profile:', err)
                        }
 
                        if (profile && !profile.is_active) {
                            await localAuth.signOut()
                            set({ isLoading: false, user: null })
                            return { success: false, error: 'Account is deactivated. Contact administrator.' }
                        }
 
                        // Update last_login timestamp in users
                        await supabase
                            .from('users')
                            .update({ last_login: new Date().toISOString() })
                            .eq('id', userId)
 
                        const user: AuthUser = {
                            id: userId,
                            email: result.data.user.email || '',
                            full_name: profile?.full_name || result.data.user.email?.split('@')[0] || 'User',
                            role: (profile?.role as UserRole) || 'viewer',
                            phone: profile?.phone,
                            avatar_url: profile?.avatar_url,
                            company_id: profile?.company_id,
                            is_active: profile?.is_active ?? true,
                            department: profile?.department,
                            permissions: profile?.permissions || {},
                        }
 
                        set({ user, isAuthenticated: true, isLoading: false })
                        return { success: true }
                    }
 
                    set({ isLoading: false })
                    return { success: false, error: 'Unknown error' }
                } catch (err: any) {
                    set({ isLoading: false })
                    return { success: false, error: err.message }
                }
            },
 
            logout: async () => {
                await localAuth.signOut()
                set({ user: null, isAuthenticated: false })
            },
 
            setUser: (user) => {
                set({ user, isAuthenticated: !!user })
            },
 
            checkSession: async () => {
                try {
                    set({ isLoading: true })
 
                    const { data } = await localAuth.getSession()
 
                    if (data?.session?.user) {
                        const { data: { session: currentSession } } = await supabase.auth.getSession()
                        const userId = currentSession?.user?.id || data.session.user.id

                        // Fetch full profile from Supabase (users table)
                        let profile = null
                        try {
                            if (!userId) throw new Error('No user ID')
                            const { data: profileData, error: profileError } = await supabase
                                .from('users')
                                .select('*')
                                .eq('id', userId)
                                .single()
                            
                            if (profileError) {
                                const status = (profileError as any).status || 0
                                if (profileError.code === 'PGRST116' || status === 406) {
                                    console.warn('[AuthStore] User profile not found in database for ID:', userId)
                                } else {
                                    throw profileError
                                }
                            }
                            profile = profileData
                        } catch (err) {
                            console.error('[AuthStore] Session check profile error:', err)
                        }
 
                        if (profile && !profile.is_active) {
                            await localAuth.signOut()
                            set({ user: null, isAuthenticated: false, isLoading: false })
                            return
                        }
 
                        set({
                            user: {
                                id: userId,
                                email: data.session.user.email || '',
                                full_name: profile?.full_name || 'User',
                                role: (profile?.role as UserRole) || 'viewer',
                                phone: profile?.phone,
                                avatar_url: profile?.avatar_url,
                                company_id: profile?.company_id,
                                is_active: profile?.is_active ?? true,
                                department: profile?.department,
                                permissions: profile?.permissions || {},
                            },
                            isAuthenticated: true,
                            isLoading: false,
                        })
                    } else {
                        set({ user: null, isAuthenticated: false, isLoading: false })
                    }
                } catch {
                    set({ user: null, isAuthenticated: false, isLoading: false })
                }
            },
        }),
        {
            name: 'falcon-auth',
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        }
    )
)