import { supabase } from '@/lib/supabase'
import { UserRole } from '@/config/permissions'
import { logActivity, AUDIT_ACTIONS } from './auditService'

export interface User {
    id: string
    email: string
    full_name: string
    role: UserRole
    phone: string | null
    avatar_url: string | null
    company_id: string | null
    is_active: boolean
    last_login: string | null
    permissions: Record<string, unknown> | null
    department: string | null
    created_at: string
    updated_at: string
}

export async function getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
}

export const getUsers = getAllUsers

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabase
        .from('users')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId)

    if (error) throw error

    logActivity({
        action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
        entity_type: 'user',
        entity_id: userId,
        details: { new_role: role }
    })
}

export async function toggleUserStatus(userId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
        .from('users')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', userId)

    if (error) throw error

    logActivity({
        action: isActive ? AUDIT_ACTIONS.USER_ACTIVATED : AUDIT_ACTIONS.USER_DEACTIVATED,
        entity_type: 'user',
        entity_id: userId
    })
}

export async function updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
    const { error } = await supabase
        .from('users')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', userId)

    if (error) throw error
}

/**
 * Invite / Add User profile
 */
export async function inviteUser(email: string, role: UserRole, fullName: string, department?: string): Promise<void> {
    // Check if user already exists
    const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle()

    if (existing) {
        throw new Error('User with this email already exists in the system.')
    }

    // Attempting insert into users
    const { error } = await supabase.from('users').insert({
        email,
        full_name: fullName,
        role,
        department: department || null,
        is_active: true,
        permissions: {},
    })

    if (error) {
        console.error('Add user error:', error)
        if (error.code === '23505') throw new Error('Email already exists')
        if (error.code === '23503') throw new Error('Cannot create user record. Please create the user in Supabase Auth first.')
        throw error
    }
}
