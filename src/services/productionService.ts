import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, createRecord, updateRecord, deleteRecord, generateNumber,
    type PaginationParams, type PaginatedResult,
} from './baseService'

export interface BOM {
    id: string
    product_id: string
    name: string
    version: string
    batch_size: number
    batch_unit: string
    is_active: boolean
    notes: string | null
    created_at: string
    product_name?: string
    product_sku?: string
    items?: BOMItem[]
}

export interface BOMItem {
    id?: string
    bom_id?: string
    raw_material_id: string
    quantity: number
    unit_of_measure: string
    wastage_percent: number
    notes: string | null
    material_name?: string
    material_code?: string
}

export interface ProductionOrder {
    id: string
    order_number: string
    product_id: string
    planned_quantity: number
    actual_quantity: number
    batch_number: string | null
    start_date: string | null
    end_date: string | null
    status: string
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    product_name?: string
    product_sku?: string
    materials?: ProductionMaterial[]
}

export interface ProductionMaterial {
    id?: string
    production_order_id?: string
    raw_material_id: string
    planned_quantity: number
    actual_quantity: number
    unit_of_measure: string
    material_name?: string
    material_code?: string
    current_stock?: number
}

export interface BOMFormData {
    product_id: string
    name: string
    version: string
    batch_size: number
    batch_unit: string
    notes: string
    items: BOMItem[]
}

export const EMPTY_BOM_FORM: BOMFormData = {
    product_id: '',
    name: '',
    version: '1.0',
    batch_size: 1,
    batch_unit: 'PCS',
    notes: '',
    items: [],
}

export interface ProdOrderFormData {
    product_id: string
    bom_id: string
    planned_quantity: number
    batch_number: string
    start_date: string
    notes: string
}

export const EMPTY_PROD_FORM: ProdOrderFormData = {
    product_id: '',
    bom_id: '',
    planned_quantity: 0,
    batch_number: '',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
}

const PROD_STEPS = ['planned', 'in_progress', 'completed']

export { PROD_STEPS }

// ============ BOM CRUD ============

export async function getBOMs(
    params: PaginationParams,
    filters?: { search?: string }
): Promise<PaginatedResult<BOM>> {
    const result = await fetchPaginated<BOM>('bom', params, {
        select: '*, products(name, sku)',
        search: filters?.search ? { columns: ['name'], query: filters.search } : undefined,
        orderBy: { column: 'created_at', ascending: false },
    })

    result.data = result.data.map((b: any) => ({
        ...b,
        product_name: b.products?.name || '-',
        product_sku: b.products?.sku || '-',
    }))

    return result
}

export async function getBOMById(id: string): Promise<BOM> {
    const { data, error } = await supabase
        .from('bom')
        .select('*, products(name, sku), bom_items(*, raw_materials(name, code))')
        .eq('id', id)
        .single()

    if (error) throw error

    return {
        ...data,
        product_name: data.products?.name || '-',
        product_sku: data.products?.sku || '-',
        items: (data.bom_items || []).map((item: any) => ({
            ...item,
            material_name: item.raw_materials?.name || '-',
            material_code: item.raw_materials?.code || '-',
        })),
    }
}

export async function getBOMsForProduct(productId: string): Promise<BOM[]> {
    const { data, error } = await supabase
        .from('bom')
        .select('*, bom_items(*, raw_materials(name, code, current_stock))')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map((b: any) => ({
        ...b,
        items: (b.bom_items || []).map((item: any) => ({
            ...item,
            material_name: item.raw_materials?.name || '-',
            material_code: item.raw_materials?.code || '-',
            current_stock: item.raw_materials?.current_stock || 0,
        })),
    }))
}

export async function createBOM(data: BOMFormData): Promise<BOM> {
    const { data: bom, error } = await supabase
        .from('bom')
        .insert({
            product_id: data.product_id,
            name: data.name.trim(),
            version: data.version,
            batch_size: Number(data.batch_size),
            batch_unit: data.batch_unit,
            is_active: true,
            notes: data.notes.trim() || null,
        })
        .select()
        .single()

    if (error) throw error

    if (data.items.length > 0) {
        const items = data.items.map(item => ({
            bom_id: bom.id,
            raw_material_id: item.raw_material_id,
            quantity: Number(item.quantity),
            unit_of_measure: item.unit_of_measure,
            wastage_percent: Number(item.wastage_percent) || 0,
            notes: item.notes || null,
        }))

        const { error: itemsError } = await supabase.from('bom_items').insert(items)
        if (itemsError) throw itemsError
    }

    return bom
}

export async function deleteBOM(id: string): Promise<void> {
    return deleteRecord('bom', id)
}

// ============ PRODUCTION ORDER CRUD ============

export async function getProductionOrders(
    params: PaginationParams,
    filters?: { status?: string; search?: string }
): Promise<PaginatedResult<ProductionOrder>> {
    const filterArr = []
    if (filters?.status && filters.status !== 'all') filterArr.push({ column: 'status', value: filters.status })

    const result = await fetchPaginated<ProductionOrder>('production_orders', params, {
        select: '*, products(name, sku)',
        filters: filterArr,
        search: filters?.search ? { columns: ['order_number', 'batch_number'], query: filters.search } : undefined,
        orderBy: { column: 'created_at', ascending: false },
    })

    result.data = result.data.map((po: any) => ({
        ...po,
        product_name: po.products?.name || '-',
        product_sku: po.products?.sku || '-',
    }))

    return result
}

export async function getProductionOrderById(id: string): Promise<ProductionOrder> {
    const { data, error } = await supabase
        .from('production_orders')
        .select('*, products(name, sku), production_materials(*, raw_materials(name, code, current_stock))')
        .eq('id', id)
        .single()

    if (error) throw error

    return {
        ...data,
        product_name: data.products?.name || '-',
        product_sku: data.products?.sku || '-',
        materials: (data.production_materials || []).map((m: any) => ({
            ...m,
            material_name: m.raw_materials?.name || '-',
            material_code: m.raw_materials?.code || '-',
            current_stock: m.raw_materials?.current_stock || 0,
        })),
    }
}

export async function createProductionOrder(data: ProdOrderFormData, bomId: string, userId?: string): Promise<ProductionOrder> {
    const orderNumber = await generateNumber('production_order')

    // Get BOM items to calculate material requirements
    const bom = await getBOMById(bomId)
    const multiplier = Number(data.planned_quantity) / (bom.batch_size || 1)

    // Create production order
    const { data: order, error } = await supabase
        .from('production_orders')
        .insert({
            order_number: orderNumber,
            product_id: data.product_id,
            planned_quantity: Number(data.planned_quantity),
            actual_quantity: 0,
            batch_number: data.batch_number.trim().toUpperCase() || null,
            start_date: data.start_date || null,
            status: 'planned',
            notes: data.notes || null,
            created_by: userId || null,
        })
        .select()
        .single()

    if (error) throw error

    // Create material requirements from BOM
    if (bom.items && bom.items.length > 0) {
        const materials = bom.items.map(item => ({
            production_order_id: order.id,
            raw_material_id: item.raw_material_id,
            planned_quantity: Math.round(Number(item.quantity) * multiplier * (1 + (item.wastage_percent || 0) / 100) * 1000) / 1000,
            actual_quantity: 0,
            unit_of_measure: item.unit_of_measure,
        }))

        const { error: matError } = await supabase.from('production_materials').insert(materials)
        if (matError) throw matError
    }

    return order
}

export async function updateProductionStatus(id: string, status: string): Promise<void> {
    const update: any = { status, updated_at: new Date().toISOString() }
    if (status === 'in_progress') update.start_date = new Date().toISOString().split('T')[0]
    if (status === 'completed') update.end_date = new Date().toISOString().split('T')[0]

    const { error } = await supabase.from('production_orders').update(update).eq('id', id)
    if (error) throw error
}

export async function completeProduction(id: string, actualQuantity: number, userId?: string): Promise<void> {
    const order = await getProductionOrderById(id)

    // Update order
    const { error } = await supabase.from('production_orders').update({
        actual_quantity: actualQuantity,
        status: 'completed',
        end_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
    }).eq('id', id)

    if (error) throw error

    // Deduct raw materials from raw_materials table
    if (order.materials) {
        for (const mat of order.materials) {
            const { data: rm } = await supabase
                .from('raw_materials')
                .select('current_stock')
                .eq('id', mat.raw_material_id)
                .single()

            if (rm) {
                await supabase.from('raw_materials').update({
                    current_stock: Math.max(0, rm.current_stock - mat.planned_quantity),
                    updated_at: new Date().toISOString(),
                }).eq('id', mat.raw_material_id)
            }

            // Update actual quantity in production_materials
            await supabase.from('production_materials').update({
                actual_quantity: mat.planned_quantity,
            }).eq('id', mat.id)
        }
    }

    // Add finished goods to inventory
    await supabase.from('inventory').insert({
        product_id: order.product_id,
        batch_number: order.batch_number,
        manufacturing_date: new Date().toISOString().split('T')[0],
        quantity: actualQuantity,
        reserved_quantity: 0,
        unit_cost: 0,
        warehouse_location: 'Production Output',
        status: 'available',
    })

    // Log movement
    await supabase.from('inventory_movements').insert({
        product_id: order.product_id,
        batch_number: order.batch_number,
        movement_type: 'production',
        quantity: actualQuantity,
        reference_type: 'production_order',
        reference_id: id,
        notes: `Production output from ${order.order_number}`,
        created_by: userId || null,
    })
}

export async function deleteProductionOrder(id: string): Promise<void> {
    return deleteRecord('production_orders', id)
}

export async function getProductionStats() {
    const { data, error } = await supabase.from('production_orders').select('status, planned_quantity, actual_quantity')
    if (error) throw error
    const orders = data || []
    return {
        total: orders.length,
        planned: orders.filter(o => o.status === 'planned').length,
        inProgress: orders.filter(o => o.status === 'in_progress').length,
        completed: orders.filter(o => o.status === 'completed').length,
        totalPlanned: orders.reduce((s, o) => s + (o.planned_quantity || 0), 0),
        totalProduced: orders.reduce((s, o) => s + (o.actual_quantity || 0), 0),
    }
}
