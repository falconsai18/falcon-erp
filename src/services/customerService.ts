import { supabase } from '@/lib/supabase'
import {
    fetchPaginated,
    fetchById,
    createRecord,
    updateRecord,
    deleteRecord,
    type PaginationParams,
    type PaginatedResult,
} from './baseService'

export interface Customer {
    id: string
    name: string
    email: string | null
    phone: string | null
    alt_phone: string | null
    gst_number: string | null
    pan_number: string | null
    customer_type: string
    credit_limit: number
    credit_days: number
    outstanding_amount: number
    status: string
    notes: string | null
    address_line1: string | null
    address_line2: string | null
    city: string | null
    state: string | null
    pincode: string | null
    country: string | null
    created_at: string
    updated_at: string
}

export interface CustomerAddress {
    id: string
    customer_id: string
    address_type: string
    address_line1: string
    address_line2: string | null
    city: string
    state: string
    pincode: string | null
    is_default: boolean
    created_at: string
}

export interface CustomerFormData {
    name: string
    email: string
    phone: string
    alt_phone: string
    gst_number: string
    pan_number: string
    customer_type: string
    credit_limit: number
    credit_days: number
    status: string
    notes: string
    address_line1: string
    address_line2: string
    city: string
    state: string
    pincode: string
    country: string
}

export const EMPTY_CUSTOMER_FORM: CustomerFormData = {
    name: '',
    email: '',
    phone: '',
    alt_phone: '',
    gst_number: '',
    pan_number: '',
    customer_type: 'retail',
    credit_limit: 0,
    credit_days: 30,
    status: 'active',
    notes: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
}

export interface AddressFormData {
    address_type: string
    address_line1: string
    address_line2: string
    city: string
    state: string
    pincode: string
    is_default: boolean
}

export const EMPTY_ADDRESS_FORM: AddressFormData = {
    address_type: 'billing',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    is_default: false,
}

// ============ CUSTOMER CRUD ============

export async function getCustomers(
    params: PaginationParams,
    filters?: { status?: string; type?: string; search?: string }
): Promise<PaginatedResult<Customer>> {
    const filterArr = []
    if (filters?.status && filters.status !== 'all') {
        filterArr.push({ column: 'status', value: filters.status })
    }
    if (filters?.type && filters.type !== 'all') {
        filterArr.push({ column: 'customer_type', value: filters.type })
    }

    return fetchPaginated<Customer>('customers', params, {
        filters: filterArr,
        search: filters?.search ? { columns: ['name', 'email', 'phone', 'gst_number', 'city', 'state'], query: filters.search } : undefined,
        orderBy: { column: 'created_at', ascending: false },
    })
}

export async function getCustomerById(id: string): Promise<Customer> {
    return fetchById<Customer>('customers', id)
}

export async function createCustomer(data: CustomerFormData): Promise<Customer> {
    const payload: any = {
        name: data.name.trim(),
        email: data.email.trim() || null,
        phone: data.phone.trim() || null,
        alt_phone: data.alt_phone.trim() || null,
        gst_number: data.gst_number.trim().toUpperCase() || null,
        pan_number: data.pan_number.trim().toUpperCase() || null,
        customer_type: data.customer_type,
        credit_limit: Number(data.credit_limit),
        credit_days: Number(data.credit_days),
        status: data.status,
        notes: data.notes.trim() || null,
        address_line1: data.address_line1.trim() || null,
        address_line2: data.address_line2.trim() || null,
        city: data.city.trim() || null,
        state: data.state.trim() || null,
        pincode: data.pincode.trim() || null,
        country: data.country.trim() || null,
    }
    return createRecord<Customer>('customers', payload)
}

export async function updateCustomer(id: string, data: CustomerFormData): Promise<Customer> {
    const payload: any = {
        name: data.name.trim(),
        email: data.email.trim() || null,
        phone: data.phone.trim() || null,
        alt_phone: data.alt_phone.trim() || null,
        gst_number: data.gst_number.trim().toUpperCase() || null,
        pan_number: data.pan_number.trim().toUpperCase() || null,
        customer_type: data.customer_type,
        credit_limit: Number(data.credit_limit),
        credit_days: Number(data.credit_days),
        status: data.status,
        notes: data.notes.trim() || null,
        updated_at: new Date().toISOString(),
    }
    return updateRecord<Customer>('customers', id, payload)
}

export async function deleteCustomer(id: string): Promise<void> {
    return deleteRecord('customers', id)
}

// ============ ADDRESS CRUD ============

export async function getCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
    const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_default', { ascending: false })

    if (error) throw error
    return data || []
}

export async function createAddress(customerId: string, data: AddressFormData): Promise<CustomerAddress> {
    return createRecord<CustomerAddress>('customer_addresses', {
        customer_id: customerId,
        address_type: data.address_type,
        address_line1: data.address_line1.trim(),
        address_line2: data.address_line2.trim() || null,
        city: data.city.trim(),
        state: data.state.trim(),
        pincode: data.pincode.trim() || null,
        is_default: data.is_default,
    } as any)
}

export async function deleteAddress(id: string): Promise<void> {
    return deleteRecord('customer_addresses', id)
}

// ============ CUSTOMER STATS ============

export async function getCustomerStats(): Promise<{
    total: number
    active: number
    inactive: number
    blocked: number
    totalOutstanding: number
}> {
    const { data, error } = await supabase
        .from('customers')
        .select('status, outstanding_amount')

    if (error) throw error

    const customers = data || []
    return {
        total: customers.length,
        active: customers.filter(c => c.status === 'active').length,
        inactive: customers.filter(c => c.status === 'inactive').length,
        blocked: customers.filter(c => c.status === 'blocked').length,
        totalOutstanding: customers.reduce((sum, c) => sum + (c.outstanding_amount || 0), 0),
    }
}

export async function getCustomerLedger(customerId: string, fromDate?: string, toDate?: string) {
    const { data, error } = await supabase.rpc('get_customer_ledger', {
        p_customer_id: customerId,
        p_from_date: fromDate || null,
        p_to_date: toDate || null,
    })
    if (error) throw error
    return data
}
