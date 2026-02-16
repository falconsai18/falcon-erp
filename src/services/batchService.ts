import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, createRecord, updateRecord, deleteRecord, generateNumber,
    type PaginationParams, type PaginatedResult,
} from './baseService'

export interface Batch {
    id: string
    batch_number: string
    product_id: string
    manufacturing_date: string
    expiry_date: string
    best_before_date: string | null
    produced_qty: number
    available_qty: number
    reserved_qty: number
    rejected_qty: number
    unit_cost: number
    total_cost: number
    quality_status: string  // pending, passed, failed, conditionally_passed
    grade: string | null  // A, B, C
    warehouse_id: string | null
    warehouse_location_id: string | null
    status: string
    manufacturing_notes: string | null
    is_expired: boolean
    is_near_expiry: boolean
    created_at: string
    updated_at: string
    product_name?: string
    product_sku?: string
    warehouse_name?: string
    location_code?: string
    work_order_id?: string
}

export interface BatchFormData {
    product_id: string
    produced_qty: number
    manufacturing_date: string
    manufacturing_notes?: string
}

export const BATCH_STATUSES = [
    { value: 'pending', label: 'Pending QC', color: 'warning' },
    { value: 'passed', label: 'Passed', color: 'success' },
    { value: 'failed', label: 'Failed', color: 'danger' },
    { value: 'conditionally_passed', label: 'Cond. Passed', color: 'info' },
]

export const QUALITY_GRADES = [
    { value: 'A', label: 'Grade A', color: 'success' },
    { value: 'B', label: 'Grade B', color: 'info' },
    { value: 'C', label: 'Grade C', color: 'warning' },
]

export const EMPTY_BATCH_FORM: BatchFormData = {
    product_id: '',
    produced_qty: 0,
    manufacturing_date: new Date().toISOString().split('T')[0],
    manufacturing_notes: '',
}

// ============ CRUD ============
export async function getBatches(
    params: PaginationParams,
    filters?: { status?: string; productId?: string; expiryFilter?: 'all' | 'expired' | 'near_expiry' | 'active'; search?: string }
): Promise<PaginatedResult<Batch>> {
    const filterArr = []
    if (filters?.status && filters.status !== 'all') filterArr.push({ column: 'quality_status', value: filters.status })
    if (filters?.productId && filters.productId !== 'all') filterArr.push({ column: 'product_id', value: filters.productId })

    let query = supabase
        .from('batches')
        .select('*, products(name, sku), warehouses(name), warehouse_locations(location_code)', { count: 'exact' })

    // Apply filters
    filterArr.forEach(f => {
        query = query.eq(f.column, f.value)
    })

    // Expiry filter
    if (filters?.expiryFilter === 'expired') {
        query = query.eq('is_expired', true)
    } else if (filters?.expiryFilter === 'near_expiry') {
        query = query.eq('is_near_expiry', true).eq('is_expired', false)
    } else if (filters?.expiryFilter === 'active') {
        query = query.eq('is_expired', false)
    }

    // Search
    if (filters?.search) {
        query = query.ilike('batch_number', `%${filters.search}%`)
    }

    // Pagination
    const from = (params.page - 1) * params.pageSize
    const to = from + params.pageSize - 1
    query = query.range(from, to).order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) throw error

    return {
        data: (data || []).map((b: any) => ({
            ...b,
            product_name: b.products?.name || '-',
            product_sku: b.products?.sku || '-',
            warehouse_name: b.warehouses?.name || '-',
            location_code: b.warehouse_locations?.location_code || '-',
        })),
        count: count || 0,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: Math.ceil((count || 0) / params.pageSize),
    }
}

export async function getBatchById(id: string): Promise<Batch> {
    const { data, error } = await supabase
        .from('batches')
        .select('*, products(name, sku), warehouses(name), warehouse_locations(location_code)')
        .eq('id', id)
        .single()

    if (error) throw error

    return {
        ...data,
        product_name: data.products?.name || '-',
        product_sku: data.products?.sku || '-',
        warehouse_name: data.warehouses?.name || '-',
        location_code: data.warehouse_locations?.location_code || '-',
    }
}

export async function createBatch(data: BatchFormData, userId?: string): Promise<Batch> {
    // 1. Auto-generate batch number
    const batchNumber = await generateNumber('batch')

    // 2. Fetch product details for shelf life
    const { data: product } = await supabase
        .from('products')
        .select('shelf_life_days')
        .eq('id', data.product_id)
        .single()

    const shelfLife = product?.shelf_life_days || 365
    const mfgDate = new Date(data.manufacturing_date)
    const expiryDate = new Date(mfgDate.getTime() + (shelfLife * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

    const insertData: any = {
        batch_number: batchNumber,
        product_id: data.product_id,
        produced_qty: data.produced_qty,
        available_qty: data.produced_qty,
        batch_size: data.produced_qty,
        manufacturing_date: data.manufacturing_date,
        expiry_date: expiryDate,
        status: 'planned',
        quality_status: 'pending',
        grade: 'A',
        manufacturing_notes: data.manufacturing_notes || null,
        created_by: userId || null,
    }

    const { data: batch, error } = await supabase
        .from('batches')
        .insert(insertData)
        .select()
        .single()

    if (error) throw error

    // Create inventory record for this batch
    await supabase.from('inventory').insert({
        product_id: data.product_id,
        batch_number: batchNumber,
        quantity: data.produced_qty,
        available_quantity: data.produced_qty,
        manufacturing_date: data.manufacturing_date,
        expiry_date: expiryDate,
        status: 'quarantine',
    })

    return batch
}

export async function updateBatchStatus(
    id: string,
    status: string,
    grade?: string,
    notes?: string,
    userId?: string
): Promise<void> {
    const updates: any = {
        quality_status: status,
        status: (status === 'passed' || status === 'conditionally_passed') ? 'available' : status === 'failed' ? 'rejected' : 'quarantine',
        updated_at: new Date().toISOString(),
    }

    if (grade) updates.grade = grade
    if (notes) updates.manufacturing_notes = notes

    const { error } = await supabase
        .from('batches')
        .update(updates)
        .eq('id', id)

    if (error) throw error

    // Update inventory status if passed
    if (status === 'passed' || status === 'conditionally_passed') {
        const batch = await getBatchById(id)
        await supabase
            .from('inventory')
            .update({ status: 'available' })
            .eq('batch_number', batch.batch_number)
            .eq('product_id', batch.product_id)
    }
}

export async function deleteBatch(id: string): Promise<void> {
    const batch = await getBatchById(id)

    // Delete inventory record
    await supabase
        .from('inventory')
        .delete()
        .eq('batch_number', batch.batch_number)
        .eq('product_id', batch.product_id)

    // Delete batch
    return deleteRecord('batches', id)
}

// ============ STATS ============
export async function getBatchStats() {
    const { data, error } = await supabase.from('batches').select('quality_status, is_expired, is_near_expiry')
    if (error) throw error

    const batches = data || []
    return {
        total: batches.length,
        pending: batches.filter(b => b.quality_status === 'pending').length,
        passed: batches.filter(b => b.quality_status === 'passed').length,
        failed: batches.filter(b => b.quality_status === 'failed').length,
        expired: batches.filter(b => b.is_expired).length,
        nearExpiry: batches.filter(b => b.is_near_expiry && !b.is_expired).length,
    }
}

// ============ GET PRODUCTS FOR BATCH ============
export async function getProductsForBatch(): Promise<{ id: string; name: string; sku: string; track_batches: boolean }[]> {
    const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, track_batches')
        .eq('status', 'active')
        .order('name')

    if (error) throw error

    return data || []
}

// ============ GET WAREHOUSES FOR BATCH ============
export async function getWarehousesForBatch(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('status', 'active')
        .order('name')

    if (error) throw error

    return data || []
}

// ============ GET LOCATIONS FOR WAREHOUSE ============
export async function getLocationsForWarehouse(warehouseId: string): Promise<{ id: string; code: string }[]> {
    const { data, error } = await supabase
        .from('warehouse_locations')
        .select('id, code')
        .eq('warehouse_id', warehouseId)
        .order('code')

    if (error) throw error

    return data || []
}
