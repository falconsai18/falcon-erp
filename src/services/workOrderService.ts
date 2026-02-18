import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, createRecord, updateRecord, deleteRecord, generateNumber,
    type PaginationParams, type PaginatedResult,
} from './baseService'

export interface WorkOrderMaterial {
    id?: string
    work_order_id?: string
    raw_material_id: string
    batch_number_used: string | null
    required_quantity: number
    issued_quantity: number
    returned_quantity: number
    unit: string
    product_name?: string
    product_sku?: string
}

export interface WorkOrderStep {
    id?: string
    work_order_id?: string
    formulation_step_id: string
    step_number: number
    status: string  // pending, in_progress, completed
    started_at: string | null
    completed_at: string | null
    actual_temperature?: number | null
    actual_humidity?: number | null
    observations?: string
    // Added for UI display from join
    title?: string
    description?: string
    duration_minutes?: number
}

export interface WorkOrder {
    id: string
    work_order_number: string
    formulation_id: string
    product_id: string
    batch_size: number
    uom_id: string
    planned_start_date: string
    planned_end_date: string
    actual_start_date: string | null
    actual_end_date: string | null
    status: string  // draft, planned, material_issued, in_progress, quality_check, completed, cancelled
    yield_percent: number | null
    actual_quantity: number | null
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    formulation_name?: string
    product_name?: string
    product_sku?: string
    batch_number?: string
    materials?: WorkOrderMaterial[]
    steps?: WorkOrderStep[]
}

export interface WorkOrderFormData {
    formulation_id: string
    batch_size: number
    priority?: string
    notes?: string
}

export const WO_STATUSES = [
    { value: 'draft', label: 'Draft', color: 'default' },
    { value: 'planned', label: 'Planned', color: 'info' },
    { value: 'material_issued', label: 'Material Issued', color: 'warning' },
    { value: 'in_progress', label: 'In Progress', color: 'purple' },
    { value: 'quality_check', label: 'Quality Check', color: 'amber' },
    { value: 'completed', label: 'Completed', color: 'success' },
    { value: 'cancelled', label: 'Cancelled', color: 'danger' },
]

export const EMPTY_WO_FORM: WorkOrderFormData = {
    formulation_id: '',
    batch_size: 0,
    priority: 'medium',
    notes: '',
}

// ============ CRUD ============
export async function getWorkOrders(
    params: PaginationParams,
    filters?: { status?: string; search?: string }
): Promise<PaginatedResult<WorkOrder>> {
    const filterArr = []
    if (filters?.status && filters.status !== 'all') filterArr.push({ column: 'status', value: filters.status })

    const result = await fetchPaginated<WorkOrder>('work_orders', params, {
        select: '*, formulations(name), products(name, sku)',
        filters: filterArr,
        search: filters?.search ? { columns: ['work_order_number'], query: filters.search } : undefined,
        orderBy: { column: 'created_at', ascending: false },
    })

    result.data = result.data.map((wo: any) => ({
        ...wo,
        formulation_name: wo.formulations?.name || '-',
        product_name: wo.products?.name || '-',
        product_sku: wo.products?.sku || '-',
    }))

    return result
}

export async function getWorkOrderById(id: string): Promise<WorkOrder> {
    const { data, error } = await supabase
        .from('work_orders')
        .select(`
            *,
            formulations(name),
            products(name, sku),
            work_order_materials(*, raw_materials(name, code)),
            work_order_steps(*, formulation_process_steps(title, description, duration_minutes))
        `)
        .eq('id', id)
        .single()

    if (error) throw error

    return {
        ...data,
        formulation_name: data.formulations?.name || '-',
        product_name: data.products?.name || '-',
        product_sku: data.products?.sku || '-',
        materials: (data.work_order_materials || []).map((m: any) => ({
            ...m,
            product_name: m.raw_materials?.name || '-',
            product_sku: m.raw_materials?.code || '-',
        })),
        steps: (data.work_order_steps || []).map((s: any) => ({
            ...s,
            title: s.formulation_process_steps?.title || '-',
            description: s.formulation_process_steps?.description || '',
            duration_minutes: s.formulation_process_steps?.duration_minutes || 0,
        })),
    }
}

export async function createWorkOrder(data: WorkOrderFormData, userId?: string): Promise<WorkOrder> {
    // Generate work order number
    const woNumber = await generateNumber('work_order')

    // Get formulation details
    const { data: formulation, error: formError } = await supabase
        .from('formulations')
        .select('id, name, base_batch_size, base_uom_id, product_id')
        .eq('id', data.formulation_id)
        .single()

    if (formError) throw formError

    // Create work order
    const startDate = new Date().toISOString().split('T')[0]

    // Auto-calculate end date: Look at process steps total duration (minutes)
    const { data: stepsData } = await supabase
        .from('formulation_process_steps')
        .select('duration_minutes')
        .eq('formulation_id', data.formulation_id)

    const totalMinutes = (stepsData || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
    const endDate = new Date(Date.now() + (totalMinutes || 1440) * 60 * 1000).toISOString().split('T')[0]

    const insertData = {
        work_order_number: woNumber,
        formulation_id: data.formulation_id,
        product_id: formulation.product_id,
        planned_quantity: data.batch_size,
        batch_size: data.batch_size,
        uom_id: formulation.base_uom_id,
        planned_start_date: startDate,
        planned_end_date: endDate,
        status: 'planned',
        priority: data.priority || 'medium',
        notes: data.notes || null,
        created_by: userId || null,
    }

    const { data: wo, error } = await supabase
        .from('work_orders')
        .insert(insertData)
        .select()
        .single()

    if (error) throw error

    // Get formulation ingredients
    const { data: ingredients, error: ingError } = await supabase
        .from('formulation_ingredients')
        .select('*')
        .eq('formulation_id', data.formulation_id)

    if (ingError) throw ingError

    // Create work order materials based on formulation
    if (ingredients && ingredients.length > 0) {
        const multiplier = data.batch_size / (formulation.base_batch_size || 1)

        const materials = ingredients.map((ing: any) => ({
            work_order_id: wo.id,
            raw_material_id: ing.raw_material_id,
            batch_number_used: null,
            required_quantity: Math.round(ing.quantity * multiplier * 1000) / 1000,
            issued_quantity: 0,
            returned_quantity: 0,
            unit: ing.unit,
        }))

        const { error: matError } = await supabase
            .from('work_order_materials')
            .insert(materials)

        if (matError) throw matError
    }

    // Get formulation process steps
    const { data: steps, error: stepError } = await supabase
        .from('formulation_process_steps')
        .select('*')
        .eq('formulation_id', data.formulation_id)
        .order('step_number', { ascending: true })

    if (stepError) throw stepError

    // Create work order steps
    if (steps && steps.length > 0) {
        const woSteps = steps.map((step: any) => ({
            work_order_id: wo.id,
            formulation_step_id: step.id,
            step_number: step.step_number,
            status: 'pending',
        }))

        const { error: stepInsertError } = await supabase
            .from('work_order_steps')
            .insert(woSteps)

        if (stepInsertError) throw stepInsertError
    }

    return wo
}

export async function updateWorkOrderStatus(id: string, status: string, userId?: string): Promise<void> {
    const updates: any = {
        status,
        updated_at: new Date().toISOString(),
    }

    // Track timestamps for status changes
    if (status === 'in_progress' && !updates.actual_start_date) {
        updates.actual_start_date = new Date().toISOString()
    }

    if (status === 'completed') {
        updates.actual_end_date = new Date().toISOString()
    }

    const { error } = await supabase
        .from('work_orders')
        .update(updates)
        .eq('id', id)

    if (error) throw error
}

export async function issueMaterial(
    workOrderId: string,
    materialId: string,
    batchNumber: string,
    quantity: number,
    userId?: string
): Promise<void> {
    // Update work order material
    const { error } = await supabase
        .from('work_order_materials')
        .update({
            batch_number_used: batchNumber,
            issued_quantity: quantity,
        })
        .eq('id', materialId)

    if (error) throw error

    // Architect: Do NOT use inventory table or inventory_movements for raw materials
    // Strictly tracking raw materials in raw_materials table
}

export async function completeWorkOrder(
    id: string,
    actualOutputQty: number,
    yieldPercent: number,
    batchNumber: string,
    userId?: string
): Promise<void> {
    const wo = await getWorkOrderById(id)

    // 1. Update work order status
    const { error } = await supabase
        .from('work_orders')
        .update({
            status: 'completed',
            actual_quantity: actualOutputQty,
            yield_percent: yieldPercent,
            actual_end_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)

    if (error) throw error

    // 2. Deduct raw materials
    const { data: woMaterials } = await supabase
        .from('work_order_materials')
        .select('*')
        .eq('work_order_id', id)

    if (woMaterials && woMaterials.length > 0) {
        for (const mat of woMaterials) {
            const qtyToDeduct = mat.issued_quantity || mat.required_quantity || 0

            if (qtyToDeduct > 0) {
                const { data: rm } = await supabase
                    .from('raw_materials')
                    .select('current_stock')
                    .eq('id', mat.raw_material_id)
                    .single()

                if (rm) {
                    await supabase.from('raw_materials').update({
                        current_stock: Math.max(0, rm.current_stock - qtyToDeduct),
                        updated_at: new Date().toISOString(),
                    }).eq('id', mat.raw_material_id)
                }
            }
        }
    }

    // 3. Create batch record
    const mfgDate = new Date().toISOString().split('T')[0]
    const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: batch, error: batchError } = await supabase
        .from('batches')
        .insert({
            batch_number: batchNumber,
            product_id: wo.product_id,
            manufacturing_date: mfgDate,
            expiry_date: expiryDate,
            produced_qty: actualOutputQty,
            available_qty: actualOutputQty,
            batch_size: actualOutputQty,
            quality_status: 'pending',
            status: 'quarantine',
            grade: 'A',
            work_order_id: id,
            created_by: userId || null,
        })
        .select()
        .single()

    if (batchError) throw batchError

    // 4. Create inventory record
    await supabase.from('inventory').insert({
        product_id: wo.product_id,
        batch_number: batchNumber,
        manufacturing_date: mfgDate,
        expiry_date: expiryDate,
        quantity: actualOutputQty,
        available_quantity: actualOutputQty,
        reserved_quantity: 0,
        status: 'quarantine',
    })

    // 5. Log movement
    await supabase.from('inventory_movements').insert({
        product_id: wo.product_id,
        batch_number: batchNumber,
        movement_type: 'manufacturing_in',
        quantity: actualOutputQty,
        reference_type: 'work_order',
        reference_id: id,
        notes: `Produced from Work Order ${wo.work_order_number}`,
        created_by: userId || null,
    })

    // 6. Auto-create QC check
    const { data: qcCheck, error: qcError } = await supabase
        .from('quality_checks')
        .insert({
            work_order_id: id,
            batch_id: batch.id,
            batch_number: batchNumber,
            parameter: 'Overall Quality',
            expected_value: 'Production Standards',
            actual_value: '-',
            result: 'pending',
            checked_by: userId || null,
            checked_at: new Date().toISOString(),
            notes: `Auto-generated QC for ${wo.work_order_number} - Batch ${batchNumber}`,
        })
        .select()
        .single()

    if (!qcError && qcCheck) {
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
}

export async function deleteWorkOrder(id: string): Promise<void> {
    // Materials and steps auto-delete via CASCADE
    return deleteRecord('work_orders', id)
}

// ============ GET FORMULATIONS FOR WO ============
export async function getFormulationsForWO(): Promise<{ id: string; name: string; product_name: string }[]> {
    const { data, error } = await supabase
        .from('formulations')
        .select('id, name, products(name)')
        .eq('status', 'approved')
        .order('name')

    if (error) throw error

    return (data || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        product_name: f.products?.name || '-',
    }))
}

// ============ GET AVAILABLE BATCHES FOR MATERIAL ISSUE ============
export async function getAvailableBatchesForProduct(productId: string): Promise<{ id: string; batch_number: string; available_qty: number }[]> {
    const { data, error } = await supabase
        .from('batches')
        .select('id, batch_number, available_qty')
        .eq('product_id', productId)
        .eq('quality_status', 'pass')
        .eq('is_expired', false)
        .gt('available_qty', 0)
        .order('expiry_date', { ascending: true })

    if (error) throw error

    return data || []
}

// ============ STATS ============
export async function getWorkOrderStats() {
    const { data, error } = await supabase.from('work_orders').select('status')
    if (error) throw error

    const orders = data || []
    return {
        total: orders.length,
        draft: orders.filter(o => o.status === 'draft').length,
        planned: orders.filter(o => o.status === 'planned').length,
        inProgress: orders.filter(o => o.status === 'in_progress').length,
        completed: orders.filter(o => o.status === 'completed').length,
    }
}
