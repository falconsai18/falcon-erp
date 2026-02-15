import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

interface User {
    id: string
    email: string
    full_name: string
    role: string
    avatar_url?: string
    company_id?: string
}

interface AuthStore {
    user: User | null
    isLoading: boolean
    isAuthenticated: boolean
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
    logout: () => Promise<void>
    setUser: (user: User | null) => void
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
                        // Try to fetch profile, but don't fail if table doesn't exist
                        let profile = null
                        try {
                            const { data: profileData } = await supabase
                                .from('users')
                                .select('*')
                                .eq('id', data.user.id)
                                .single()
                            profile = profileData
                        } catch {
                            // users table might not exist yet - that's OK
                        }

                        const user: User = {
                            id: data.user.id,
                            email: data.user.email || '',
                            full_name: profile?.full_name || data.user.email?.split('@')[0] || 'Admin',
                            role: profile?.role || 'admin',
                            avatar_url: profile?.avatar_url,
                            company_id: profile?.company_id,
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
                            // OK if no profile yet
                        }

                        set({
                            user: {
                                id: session.user.id,
                                email: session.user.email || '',
                                full_name: profile?.full_name || session.user.email || 'Admin',
                                role: profile?.role || 'admin',
                                avatar_url: profile?.avatar_url,
                                company_id: profile?.company_id,
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