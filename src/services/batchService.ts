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
    batch_size: number
    actual_yield: number | null
    produced_qty: number
    available_qty: number
    reserved_qty: number
    rejected_qty: number
    unit_cost: number
    total_cost: number
    quality_status: string
    grade: string | null
    warehouse_id: string | null
    warehouse_location_id: string | null
    status: string
    manufacturing_notes: string | null
    is_expired: boolean
    is_near_expiry: boolean
    shelf_life_months: number | null
    work_order_id: string | null
    unit: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    product_name?: string
    product_sku?: string
    warehouse_name?: string
    location_code?: string
    work_order_number?: string
    qc_count?: number
}

export interface BatchFormData {
    product_id: string
    produced_qty: number
    manufacturing_date: string
    manufacturing_notes?: string
}

export const BATCH_STATUSES = [
    { value: 'pending', label: 'Pending QC', color: 'warning' },
    { value: 'pass', label: 'Passed', color: 'success' },
    { value: 'fail', label: 'Failed', color: 'danger' },
]

export const BATCH_LIFECYCLE = [
    { value: 'quarantine', label: 'Quarantine', color: 'warning' },
    { value: 'available', label: 'Available', color: 'success' },
    { value: 'rejected', label: 'Rejected', color: 'danger' },
    { value: 'planned', label: 'Planned', color: 'info' },
    { value: 'consumed', label: 'Consumed', color: 'default' },
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

    filterArr.forEach(f => {
        query = query.eq(f.column, f.value)
    })

    if (filters?.expiryFilter === 'expired') {
        query = query.eq('is_expired', true)
    } else if (filters?.expiryFilter === 'near_expiry') {
        query = query.eq('is_near_expiry', true).eq('is_expired', false)
    } else if (filters?.expiryFilter === 'active') {
        query = query.eq('is_expired', false)
    }

    if (filters?.search) {
        query = query.ilike('batch_number', `%${filters.search}%`)
    }

    const from = (params.page - 1) * params.pageSize
    const to = from + params.pageSize - 1
    query = query.range(from, to).order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) throw error

    // Get QC counts for each batch
    const batchIds = (data || []).map((b: any) => b.id)
    let qcMap = new Map<string, number>()

    if (batchIds.length > 0) {
        const { data: qcData } = await supabase
            .from('quality_checks')
            .select('batch_id')
            .in('batch_id', batchIds)

        qcData?.forEach((qc: any) => {
            const current = qcMap.get(qc.batch_id) || 0
            qcMap.set(qc.batch_id, current + 1)
        })
    }

    return {
        data: (data || []).map((b: any) => ({
            ...b,
            product_name: b.products?.name || '-',
            product_sku: b.products?.sku || '-',
            warehouse_name: b.warehouses?.name || '-',
            location_code: b.warehouse_locations?.location_code || '-',
            qc_count: qcMap.get(b.id) || 0,
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
        .select('*, products(name, sku), warehouses(name), warehouse_locations(location_code), work_orders!batches_work_order_id_fkey(work_order_number)')
        .eq('id', id)
        .single()

    if (error) throw error

    // Get QC checks for this batch
    const { data: qcData } = await supabase
        .from('quality_checks')
        .select('id, result, checked_at')
        .or(`batch_id.eq.${id},batch_number.eq.${data.batch_number}`)
        .order('created_at', { ascending: false })

    return {
        ...data,
        product_name: data.products?.name || '-',
        product_sku: data.products?.sku || '-',
        warehouse_name: data.warehouses?.name || '-',
        location_code: data.warehouse_locations?.location_code || '-',
        work_order_number: data.work_orders?.work_order_number || null,
        qc_count: qcData?.length || 0,
    }
}

export async function createBatch(data: BatchFormData, userId?: string): Promise<Batch> {
    const batchNumber = await generateNumber('batch')

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
        status: 'quarantine',
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

    // Create inventory record
    await supabase.from('inventory').insert({
        product_id: data.product_id,
        batch_number: batchNumber,
        quantity: data.produced_qty,
        available_quantity: data.produced_qty,
        reserved_quantity: 0,
        manufacturing_date: data.manufacturing_date,
        expiry_date: expiryDate,
        status: 'quarantine',
    })

    // Auto-create QC check for this batch
    await supabase.from('quality_checks').insert({
        batch_id: batch.id,
        batch_number: batchNumber,
        parameter: 'Overall Quality',
        expected_value: 'Ayurvedic Pharmacopoeia Standards',
        actual_value: '-',
        result: 'pending',
        checked_by: userId || null,
        checked_at: new Date().toISOString(),
        notes: `Auto-generated QC for batch ${batchNumber}`,
    })

    // Auto-create QC checklist items
    const { data: qcCheck } = await supabase
        .from('quality_checks')
        .select('id')
        .eq('batch_id', batch.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (qcCheck) {
        await supabase.from('quality_check_items').insert([
            {
                quality_check_id: qcCheck.id,
                parameter_name: 'Appearance',
                specification: 'As per standard',
                method: 'Visual inspection',
                min_value: null,
                max_value: null,
                actual_value: null,
                unit: null,
                result: 'pending',
                notes: null,
            },
            {
                quality_check_id: qcCheck.id,
                parameter_name: 'Odor',
                specification: 'Characteristic',
                method: 'Sensory evaluation',
                min_value: null,
                max_value: null,
                actual_value: null,
                unit: null,
                result: 'pending',
                notes: null,
            },
            {
                quality_check_id: qcCheck.id,
                parameter_name: 'pH Level',
                specification: '5.5 - 7.5',
                method: 'pH meter',
                min_value: 5.5,
                max_value: 7.5,
                actual_value: null,
                unit: 'pH',
                result: 'pending',
                notes: null,
            },
            {
                quality_check_id: qcCheck.id,
                parameter_name: 'Moisture Content',
                specification: 'Not more than 10%',
                method: 'Loss on drying',
                min_value: 0,
                max_value: 10,
                actual_value: null,
                unit: '%',
                result: 'pending',
                notes: null,
            },
            {
                quality_check_id: qcCheck.id,
                parameter_name: 'Microbial Load',
                specification: 'Within limits',
                method: 'Total plate count',
                min_value: 0,
                max_value: 1000,
                actual_value: null,
                unit: 'CFU/g',
                result: 'pending',
                notes: null,
            },
        ])
    }

    return batch
}

export async function updateBatchStatus(
    id: string,
    qualityStatus: string,
    grade?: string,
    notes?: string,
): Promise<void> {
    const updates: any = {
        quality_status: qualityStatus,
        status: qualityStatus === 'pass' ? 'available' : qualityStatus === 'fail' ? 'rejected' : 'quarantine',
        updated_at: new Date().toISOString(),
    }

    if (grade) updates.grade = grade
    if (notes) updates.manufacturing_notes = notes

    const { error } = await supabase
        .from('batches')
        .update(updates)
        .eq('id', id)

    if (error) throw error

    // Sync inventory status
    const batch = await getBatchById(id)
    if (qualityStatus === 'pass') {
        await supabase
            .from('inventory')
            .update({ status: 'available' })
            .eq('batch_number', batch.batch_number)
            .eq('product_id', batch.product_id)
    } else if (qualityStatus === 'fail') {
        await supabase
            .from('inventory')
            .update({ status: 'rejected' })
            .eq('batch_number', batch.batch_number)
            .eq('product_id', batch.product_id)
    }
}

export async function deleteBatch(id: string): Promise<void> {
    const batch = await getBatchById(id)

    await supabase
        .from('inventory')
        .delete()
        .eq('batch_number', batch.batch_number)
        .eq('product_id', batch.product_id)

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
        passed: batches.filter(b => b.quality_status === 'pass').length,
        failed: batches.filter(b => b.quality_status === 'fail').length,
        expired: batches.filter(b => b.is_expired).length,
        nearExpiry: batches.filter(b => b.is_near_expiry && !b.is_expired).length,
    }
}

// ============ DROPDOWNS ============
export async function getProductsForBatch(): Promise<{ id: string; name: string; sku: string; track_batches?: boolean }[]> {
    const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, track_batches')
        .eq('status', 'active')
        .order('name')

    if (error) throw error
    return data || []
}

export async function getWarehousesForBatch(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('status', 'active')
        .order('name')

    if (error) throw error
    return data || []
}

export async function getLocationsForWarehouse(warehouseId: string): Promise<{ id: string; location_code: string }[]> {
    const { data, error } = await supabase
        .from('warehouse_locations')
        .select('id, location_code')
        .eq('warehouse_id', warehouseId)
        .eq('is_active', true)
        .order('location_code')

    if (error) throw error
    return data || []
}

// ============ SMART BATCH SELECTION (FEFO/FIFO) ============
export async function getSmartBatchSelection(
    productId: string,
    requiredQuantity: number
): Promise<{
    batches: Array<{
        batch_number: string;
        available_qty: number;
        expiry_date: string | null;
        manufacturing_date: string | null;
        allocated_qty: number;
    }>;
    totalAllocated: number;
    fullyAllocated: boolean;
    shortfall: number;
}> {
    // Fetch available batches sorted FEFO (expiry first, then manufacturing date)
    const { data: batches, error } = await supabase
        .from('batches')
        .select('batch_number, available_qty, expiry_date, manufacturing_date, product_id, status, quality_status')
        .eq('product_id', productId)
        .eq('status', 'available')
        .eq('quality_status', 'pass')
        .gt('available_qty', 0)
        .order('expiry_date', { ascending: true, nullsFirst: false })
        .order('manufacturing_date', { ascending: true })

    if (error) throw error

    // FEFO allocation logic
    let remainingQty = requiredQuantity
    const allocatedBatches = []

    for (const batch of batches || []) {
        if (remainingQty <= 0) break

        const allocateQty = Math.min(batch.available_qty, remainingQty)
        allocatedBatches.push({
            batch_number: batch.batch_number,
            available_qty: batch.available_qty,
            expiry_date: batch.expiry_date,
            manufacturing_date: batch.manufacturing_date,
            allocated_qty: allocateQty
        })

        remainingQty -= allocateQty
    }

    const totalAllocated = requiredQuantity - remainingQty

    return {
        batches: allocatedBatches,
        totalAllocated,
        fullyAllocated: remainingQty <= 0,
        shortfall: Math.max(remainingQty, 0)
    }
}