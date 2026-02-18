import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
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

                    const { data, error } = await supabase.auth.signInWithPassword({
                        email,
                        password,
                    })

                    if (error) {
                        set({ isLoading: false })
                        return { success: false, error: error.message }
                    }

                    if (data.user) {
                        // Fetch full profile from public.users
                        let profile = null
                        try {
                            const { data: profileData, error: profileError } = await supabase
                                .from('users')
                                .select('*')
                                .eq('id', data.user.id)
                                .single()

                            if (profileError) throw profileError
                            profile = profileData
                        } catch (err) {
                            console.error('Error fetching user profile:', err)
                            // Fallback if profile doesn't exist yet, but enforce strict typing later
                        }

                        if (profile && !profile.is_active) {
                            await supabase.auth.signOut()
                            set({ isLoading: false, user: null })
                            return { success: false, error: 'Account is deactivated. Contact administrator.' }
                        }

                        const user: AuthUser = {
                            id: data.user.id,
                            email: data.user.email || '',
                            full_name: profile?.full_name || data.user.email?.split('@')[0] || 'User',
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
                await supabase.auth.signOut()
                set({ user: null, isAuthenticated: false })
            },

            setUser: (user) => {
                set({ user, isAuthenticated: !!user })
            },

            checkSession: async () => {
                try {
                    set({ isLoading: true })
                    const { data: { session } } = await supabase.auth.getSession()

                    if (session?.user) {
                        let profile = null
                        try {
                            const { data: profileData } = await supabase
                                .from('users')
                                .select('*')
                                .eq('id', session.user.id)
                                .single()
                            profile = profileData
                        } catch {
                            // User might not exist in public.users yet
                        }

                        if (profile && !profile.is_active) {
                            await supabase.auth.signOut()
                            set({ user: null, isAuthenticated: false, isLoading: false })
                            return
                        }

                        set({
                            user: {
                                id: session.user.id,
                                email: session.user.email || '',
                                full_name: profile?.full_name || session.user.email || 'User',
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