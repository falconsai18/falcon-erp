import { supabase } from '@/lib/supabase'

// ============ COMPANY (from companies table) ============
export interface CompanyInfo {
    id: string
    name: string
    short_name: string
    website: string
    email: string
    phone: string
    gst_number: string
    pan_number: string
    drug_license: string
    fssai_number: string
    address_line1: string
    address_line2: string
    city: string
    state: string
    pincode: string
    logo_url: string
}

export async function getCompanyInfo(): Promise<CompanyInfo | null> {
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
        .single()
    if (error) {
        console.error('getCompanyInfo error:', error)
        return null
    }
    return data
}

export async function updateCompanyInfo(id: string, updates: Partial<CompanyInfo>) {
    const { data, error } = await supabase
        .from('companies')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    if (error) throw error
    return data
}

// ============ SETTINGS (key-value from settings table) ============
export interface SettingRow {
    id: string
    key: string
    value: string
    description: string
}

export async function getAllSettings(): Promise<SettingRow[]> {
    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('key')
    if (error) throw error
    return (data || []).map((s: any) => ({
        ...s,
        value: typeof s.value === 'string' ? s.value : JSON.stringify(s.value).replace(/^"|"$/g, ''),
    }))
}

export async function updateSetting(id: string, value: string) {
    const { error } = await supabase
        .from('settings')
        .update({ value: value, updated_at: new Date().toISOString() })
        .eq('id', id)
    if (error) throw error
}

export async function upsertSetting(key: string, value: string, description: string) {
    // Check if exists
    const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', key)
        .single()

    if (existing) {
        const { error } = await supabase
            .from('settings')
            .update({ value, description, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
        if (error) throw error
    } else {
        const { error } = await supabase
            .from('settings')
            .insert([{ key, value, description }])
        if (error) throw error
    }
}

// ============ NUMBER SEQUENCES ============
export interface NumberSequence {
    id: string
    entity_type: string
    prefix: string
    current_number: number
    padding: number
}

export async function getNumberSequences(): Promise<NumberSequence[]> {
    const { data, error } = await supabase
        .from('number_sequences')
        .select('*')
        .order('entity_type')
    if (error) throw error
    return data || []
}

export async function updateNumberSequence(id: string, prefix: string, current_number: number, padding: number) {
    const { error } = await supabase
        .from('number_sequences')
        .update({ prefix, current_number, padding, updated_at: new Date().toISOString() })
        .eq('id', id)
    if (error) throw error
}

// ============ BANK ACCOUNTS ============
export interface BankAccount {
    id: string
    account_name: string
    bank_name: string
    account_number: string
    ifsc_code: string
    branch: string
    account_type: string
    opening_balance: number
    current_balance: number
    is_default: boolean
    is_active: boolean
}

export async function getBankAccounts(): Promise<BankAccount[]> {
    const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('is_default', { ascending: false })
    if (error) throw error
    return data || []
}

export async function updateBankAccount(id: string, updates: Partial<BankAccount>) {
    const { error } = await supabase
        .from('bank_accounts')
        .update(updates)
        .eq('id', id)
    if (error) throw error
}

// ============ USER PROFILE ============
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, phone, role, avatar_url, is_active, last_login')
        .eq('id', user.id)
        .single()

    if (error) {
        // Fallback to auth user
        return {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || '',
            phone: '',
            role: 'admin',
            avatar_url: '',
        }
    }
    return data
}

export async function updateUserProfile(updates: { full_name?: string; phone?: string }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
    if (error) throw error
}

export async function changePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
}

// ============ SYSTEM STATS ============
export async function getSystemStats() {
    const tables = ['products', 'customers', 'suppliers', 'sales_orders', 'invoices',
        'purchase_orders', 'raw_materials', 'production_orders', 'inventory', 'payments',
        'quotations', 'warehouses']

    const results = await Promise.all(
        tables.map(t => supabase.from(t).select('id', { count: 'exact', head: true }))
    )

    const stats: Record<string, number> = {}
    tables.forEach((t, i) => { stats[t] = results[i].count || 0 })
    return stats
}
