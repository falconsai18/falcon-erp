import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, createRecord, updateRecord, deleteRecord,
    type PaginationParams, type PaginatedResult,
} from './baseService'

export interface QualityCheckItem {
    id?: string
    quality_check_id?: string
    parameter_name: string
    specification: string
    method?: string
    min_value: number | null
    max_value: number | null
    actual_value: number | null
    unit?: string
    result: string  // pass, fail, pending
    notes: string
    product_id?: string // For UI use
    batch_id?: string // For UI use
    product_name?: string
    batch_number?: string
}

export interface QualityCheck {
    id?: string
    production_order_id?: string
    work_order_id?: string
    batch_id?: string
    batch_number?: string
    parameter: string
    expected_value: string
    actual_value: string
    result: string  // pending, pass, fail
    checked_by: string | null
    checked_at: string
    notes: string | null
    created_at?: string
    // UI Fields
    checked_by_name?: string
    items?: QualityCheckItem[]
}

export interface QualityCheckFormData {
    reference_type: string
    reference_id: string
    work_order_id?: string
    batch_id?: string
    checked_at: string
    notes: string
    items: QualityCheckItem[]
}

export const QC_STATUSES = [
    { value: 'pending', label: 'Pending', color: 'default' },
    { value: 'pass', label: 'Passed', color: 'success' },
    { value: 'fail', label: 'Failed', color: 'danger' },
]

export const QC_ITEM_RESULTS = [
    { value: 'pass', label: 'Pass', color: 'success' },
    { value: 'fail', label: 'Fail', color: 'danger' },
    { value: 'pending', label: 'Pending', color: 'default' },
]

export const EMPTY_QC_FORM: QualityCheckFormData = {
    reference_type: 'grn',
    reference_id: '',
    checked_at: new Date().toISOString().split('T')[0],
    notes: '',
    items: [],
}

// ============ CRUD ============
export async function getQualityChecks(
    params: PaginationParams,
    filters?: { status?: string; referenceType?: string; search?: string }
): Promise<PaginatedResult<QualityCheck>> {
    const filterArr = []
    if (filters?.status && filters.status !== 'all') filterArr.push({ column: 'result', value: filters.status })
    // reference_type not in schema, removing filter

    const result = await fetchPaginated<QualityCheck>('quality_checks', params, {
        select: '*',
        filters: filterArr,
        orderBy: { column: 'created_at', ascending: false },
    })

    result.data = result.data.map((qc: any) => ({
        ...qc,
        checked_by_name: qc.checked_by || 'System',
    }))

    return result
}

export async function getQualityCheckById(id: string): Promise<QualityCheck> {
    // 1. Fetch QC
    const { data: qc, error: qcError } = await supabase
        .from('quality_checks')
        .select('*')
        .eq('id', id)
        .single()

    if (qcError) throw qcError

    // 2. Fetch Items
    const { data: items, error: itemsError } = await supabase
        .from('quality_check_items')
        .select('*')
        .eq('quality_check_id', id)

    if (itemsError) throw itemsError

    return {
        ...qc,
        checked_by_name: qc.checked_by || 'System',
        items: (items || []).map((item: any) => ({
            ...item,
            checked_by_name: item.tested_by || '-',
        })),
    }
}

export async function createQualityCheck(data: QualityCheckFormData, userId?: string): Promise<QualityCheck> {
    // Create quality check
    const payload = {
        work_order_id: data.reference_type === 'production' ? data.reference_id : (data.work_order_id || null),
        batch_id: data.reference_type === 'batch' ? data.reference_id : (data.batch_id || null),
        batch_number: data.reference_type === 'batch' ? data.items[0]?.batch_number : null,
        parameter: data.items[0]?.parameter_name || 'General',
        expected_value: data.items[0]?.specification || '-',
        actual_value: data.items[0]?.actual_value?.toString() || '-',
        checked_by: userId || null,
        checked_at: data.checked_at,
        result: 'pending',
        notes: data.notes || null,
    }
    const { data: qc, error } = await supabase
        .from('quality_checks')
        .insert(payload)
        .select()
        .single()

    if (error) throw error

    // Create check items
    if (data.items.length > 0) {
        const items = data.items.map(item => ({
            quality_check_id: qc.id,
            parameter_name: item.parameter_name,
            specification: item.specification,
            method: item.method || null,
            min_value: item.min_value,
            max_value: item.max_value,
            actual_value: item.actual_value,
            unit: item.unit || null,
            result: item.result || 'pending',
            notes: item.notes || null,
        }))

        const { error: itemsError } = await supabase
            .from('quality_check_items')
            .insert(items)

        if (itemsError) throw itemsError
    }

    return qc
}

export async function updateQualityCheckStatus(
    id: string,
    status: string,
    notes?: string,
    userId?: string
): Promise<void> {
    // 1. Update QC result
    const { error } = await supabase
        .from('quality_checks')
        .update({ result: status })
        .eq('id', id)

    if (error) throw error

    // 2. Get the full QC record to find linked batch
    const { data: qc } = await supabase
        .from('quality_checks')
        .select('batch_id, batch_number, work_order_id')
        .eq('id', id)
        .single()

    if (!qc) return

    // 3. Update batch status based on QC result
    const batchUpdate: any = {
        quality_status: status,
        status: status === 'pass' ? 'available' : status === 'fail' ? 'rejected' : 'quarantine',
        updated_at: new Date().toISOString(),
    }

    // Try batch_id first (most reliable), then batch_number
    if (qc.batch_id) {
        await supabase
            .from('batches')
            .update(batchUpdate)
            .eq('id', qc.batch_id)

        // Also sync inventory
        const { data: batch } = await supabase
            .from('batches')
            .select('batch_number, product_id')
            .eq('id', qc.batch_id)
            .single()

        if (batch) {
            await supabase
                .from('inventory')
                .update({ status: status === 'pass' ? 'available' : status === 'fail' ? 'rejected' : 'quarantine' })
                .eq('batch_number', batch.batch_number)
                .eq('product_id', batch.product_id)
        }
    } else if (qc.batch_number) {
        await supabase
            .from('batches')
            .update(batchUpdate)
            .eq('batch_number', qc.batch_number)

        // Also sync inventory
        await supabase
            .from('inventory')
            .update({ status: status === 'pass' ? 'available' : status === 'fail' ? 'rejected' : 'quarantine' })
            .eq('batch_number', qc.batch_number)
    }

    // 4. If QC linked to work order, also find batch via work_order_id
    if (qc.work_order_id && !qc.batch_id && !qc.batch_number) {
        await supabase
            .from('batches')
            .update(batchUpdate)
            .eq('work_order_id', qc.work_order_id)
    }
}

export async function updateQualityCheckItem(
    itemId: string,
    actualValue: number | null,
    result: string,
    notes?: string
): Promise<void> {
    const { error } = await supabase
        .from('quality_check_items')
        .update({
            actual_value: actualValue,
            result: result,
            notes: notes || null,
        })
        .eq('id', itemId)

    if (error) throw error
}

export async function passAllQCItems(id: string): Promise<void> {
    // 1. Update all items to 'pass'
    const { error: itemsError } = await supabase
        .from('quality_check_items')
        .update({ result: 'pass' })
        .eq('quality_check_id', id)

    if (itemsError) throw itemsError

    // 2. Update parent status to 'pass'
    await updateQualityCheckStatus(id, 'pass')
}

export async function failAllQCItems(id: string): Promise<void> {
    // 1. Update all items to 'fail'
    const { error: itemsError } = await supabase
        .from('quality_check_items')
        .update({ result: 'fail' })
        .eq('quality_check_id', id)

    if (itemsError) throw itemsError

    // 2. Update parent status to 'fail'
    await updateQualityCheckStatus(id, 'fail')
}

export async function deleteQualityCheck(id: string): Promise<void> {
    // Items auto-delete via CASCADE
    return deleteRecord('quality_checks', id)
}

// ============ GET REFERENCE ITEMS FOR QC ============
export async function getGRNItemsForQC(grnId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('grn_items')
        .select('*, products(name, sku), batches(batch_number)')
        .eq('grn_id', grnId)

    if (error) throw error

    return (data || []).map((item: any) => ({
        product_id: item.product_id,
        batch_id: item.batch_id,
        product_name: item.products?.name || '-',
        batch_number: item.batches?.batch_number || '-',
        received_qty: item.received_quantity,
        accepted_qty: item.accepted_quantity,
    }))
}

export async function getBatchForQC(batchId: string): Promise<any> {
    const { data, error } = await supabase
        .from('batches')
        .select('*, products(name, sku)')
        .eq('id', batchId)
        .single()

    if (error) throw error

    return {
        product_id: data.product_id,
        batch_id: data.id,
        product_name: data.products?.name || '-',
        batch_number: data.batch_number,
        produced_qty: data.produced_qty,
    }
}

// ============ STATS ============
export async function getQCStats() {
    const { data, error } = await supabase.from('quality_checks').select('result')
    if (error) throw error

    const checks = data || []
    return {
        total: checks.length,
        pending: checks.filter(c => c.result === 'pending').length,
        passed: checks.filter(c => c.result === 'pass').length,
        failed: checks.filter(c => c.result === 'fail').length,
    }
}

