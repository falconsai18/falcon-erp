import { supabase } from '@/lib/supabase'
import {
    fetchPaginated,
    createRecord,
    updateRecord,
    deleteRecord,
    type PaginationParams,
    type PaginatedResult,
} from './baseService'

export interface Supplier {
    id: string
    name: string
    email: string | null
    phone: string | null
    contact_person: string | null
    gst_number: string | null
    pan_number: string | null
    supplier_type: string
    payment_terms: number
    rating: number
    address_line1: string | null
    address_line2: string | null
    city: string | null
    state: string | null
    pincode: string | null
    status: string
    notes: string | null
    created_at: string
    updated_at: string
}

export interface SupplierFormData {
    name: string
    email: string
    phone: string
    contact_person: string
    gst_number: string
    pan_number: string
    supplier_type: string
    payment_terms: number
    rating: number
    address_line1: string
    address_line2: string
    city: string
    state: string
    pincode: string
    status: string
    notes: string
}

export const EMPTY_SUPPLIER_FORM: SupplierFormData = {
    name: '',
    email: '',
    phone: '',
    contact_person: '',
    gst_number: '',
    pan_number: '',
    supplier_type: 'raw_material',
    payment_terms: 30,
    rating: 3,
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    status: 'active',
    notes: '',
}

export async function getSuppliers(
    params: PaginationParams,
    filters?: { status?: string; type?: string; search?: string }
): Promise<PaginatedResult<Supplier>> {
    const filterArr = []
    if (filters?.status && filters.status !== 'all') filterArr.push({ column: 'status', value: filters.status })
    if (filters?.type && filters.type !== 'all') filterArr.push({ column: 'supplier_type', value: filters.type })

    return fetchPaginated<Supplier>('suppliers', params, {
        filters: filterArr,
        search: filters?.search ? { columns: ['name', 'email', 'phone', 'contact_person'], query: filters.search } : undefined,
        orderBy: { column: 'created_at', ascending: false },
    })
}

export async function createSupplier(data: SupplierFormData): Promise<Supplier> {
    return createRecord<Supplier>('suppliers', {
        name: data.name.trim(),
        email: data.email.trim() || null,
        phone: data.phone.trim() || null,
        contact_person: data.contact_person.trim() || null,
        gst_number: data.gst_number.trim().toUpperCase() || null,
        pan_number: data.pan_number.trim().toUpperCase() || null,
        supplier_type: data.supplier_type,
        payment_terms: Number(data.payment_terms),
        rating: Number(data.rating),
        address_line1: data.address_line1.trim() || null,
        address_line2: data.address_line2.trim() || null,
        city: data.city.trim() || null,
        state: data.state.trim() || null,
        pincode: data.pincode.trim() || null,
        status: data.status,
        notes: data.notes.trim() || null,
    } as any)
}

export async function updateSupplier(id: string, data: SupplierFormData): Promise<Supplier> {
    return updateRecord<Supplier>('suppliers', id, {
        name: data.name.trim(),
        email: data.email.trim() || null,
        phone: data.phone.trim() || null,
        contact_person: data.contact_person.trim() || null,
        gst_number: data.gst_number.trim().toUpperCase() || null,
        pan_number: data.pan_number.trim().toUpperCase() || null,
        supplier_type: data.supplier_type,
        payment_terms: Number(data.payment_terms),
        rating: Number(data.rating),
        address_line1: data.address_line1.trim() || null,
        address_line2: data.address_line2.trim() || null,
        city: data.city.trim() || null,
        state: data.state.trim() || null,
        pincode: data.pincode.trim() || null,
        status: data.status,
        notes: data.notes.trim() || null,
        updated_at: new Date().toISOString(),
    } as any)
}

export async function deleteSupplier(id: string): Promise<void> {
    return deleteRecord('suppliers', id)
}

export async function getSupplierStats() {
    const { data, error } = await supabase.from('suppliers').select('status, rating')
    if (error) throw error
    const suppliers = data || []
    return {
        total: suppliers.length,
        active: suppliers.filter(s => s.status === 'active').length,
        inactive: suppliers.filter(s => s.status === 'inactive').length,
        avgRating: suppliers.length ? +(suppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / suppliers.length).toFixed(1) : 0,
    }
}
