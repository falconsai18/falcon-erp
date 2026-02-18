import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, createRecord, updateRecord, deleteRecord, generateNumber,
    type PaginationParams, type PaginatedResult,
} from './baseService'

export interface GRNItem {
    id?: string
    grn_id?: string
    purchase_order_item_id: string
    raw_material_id: string | null
    product_id: string | null
    ordered_quantity: number
    received_quantity: number
    accepted_quantity: number
    rejected_quantity: number
    batch_number: string
    manufacturing_date: string
    expiry_date: string
    notes: string
    material_name?: string
    product_name?: string
    material_code?: string
    product_sku?: string
    unit_of_measure?: string
}

export interface GRN {
    id: string
    grn_number: string
    purchase_order_id: string
    supplier_id: string
    received_date: string
    status: string  // draft, inspecting, accepted, partial, rejected
    notes: string | null
    received_by: string | null
    created_at: string
    updated_at: string
    po_number?: string
    supplier_name?: string
    supplier_phone?: string
    items?: GRNItem[]
    item_count?: number
}

export interface GRNFormData {
    purchase_order_id: string
    received_date: string
    notes: string
    items: GRNItem[]
}

export const EMPTY_GRN_FORM: GRNFormData = {
    purchase_order_id: '',
    received_date: new Date().toISOString().split('T')[0],
    notes: '',
    items: [],
}

export const GRN_STATUSES = [
    { value: 'draft', label: 'Draft', color: 'default' },
    { value: 'inspecting', label: 'Inspecting', color: 'info' },
    { value: 'accepted', label: 'Accepted', color: 'success' },
    { value: 'partial', label: 'Partial', color: 'warning' },
    { value: 'rejected', label: 'Rejected', color: 'danger' },
]

// ============ CRUD ============
export async function getGRNs(
    params: PaginationParams,
    filters?: { status?: string; search?: string }
): Promise<PaginatedResult<GRN>> {
    const filterArr = []
    if (filters?.status && filters.status !== 'all') filterArr.push({ column: 'status', value: filters.status })

    const result = await fetchPaginated<GRN>('grn', params, {
        select: '*, purchase_orders(po_number, supplier_id), suppliers(name, phone)',
        filters: filterArr,
        search: filters?.search ? { columns: ['grn_number'], query: filters.search } : undefined,
        orderBy: { column: 'created_at', ascending: false },
    })

    result.data = result.data.map((g: any) => ({
        ...g,
        po_number: g.purchase_orders?.po_number || '-',
        supplier_id: g.purchase_orders?.supplier_id || g.supplier_id,
        supplier_name: g.suppliers?.name || '-',
        supplier_phone: g.suppliers?.phone || '-',
    }))

    return result
}

export async function getGRNById(id: string): Promise<GRN> {
    const { data, error } = await supabase
        .from('grn')
        .select('*, purchase_orders(po_number, supplier_id), suppliers(name, phone), grn_items(*, raw_materials(name, code, unit_of_measure), products(name, sku))')
        .eq('id', id)
        .single()

    if (error) throw error

    return {
        ...data,
        po_number: data.purchase_orders?.po_number || '-',
        supplier_id: data.purchase_orders?.supplier_id || data.supplier_id,
        supplier_name: data.suppliers?.name || '-',
        supplier_phone: data.suppliers?.phone || '-',
        items: (data.grn_items || []).map((item: any) => ({
            ...item,
            material_name: item.raw_materials?.name || null,
            material_code: item.raw_materials?.code || null,
            product_name: item.products?.name || null,
            product_sku: item.products?.sku || null,
            unit_of_measure: item.raw_materials?.unit_of_measure || item.products?.unit_of_measure || 'pcs',
        })),
        item_count: data.grn_items?.length || 0,
    }
}

export async function createGRN(data: GRNFormData, userId?: string): Promise<GRN> {
    // Get PO details to get supplier_id
    const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select('supplier_id')
        .eq('id', data.purchase_order_id)
        .single()

    if (poError) throw poError

    // Generate GRN number
    const grnNumber = await generateNumber('grn')

    // Create GRN
    const { data: grn, error: grnError } = await supabase
        .from('grn')
        .insert({
            grn_number: grnNumber,
            purchase_order_id: data.purchase_order_id,
            supplier_id: po.supplier_id,
            received_date: data.received_date,
            status: 'draft',
            notes: data.notes || null,
            received_by: userId || null,
        })
        .select()
        .single()

    if (grnError) throw grnError

    // Create GRN items
    if (data.items.length > 0) {
        const items = data.items.map(item => ({
            grn_id: grn.id,
            purchase_order_item_id: item.purchase_order_item_id,
            raw_material_id: item.raw_material_id,
            product_id: item.product_id,
            ordered_quantity: item.ordered_quantity,
            received_quantity: item.received_quantity,
            accepted_quantity: item.accepted_quantity,
            rejected_quantity: item.rejected_quantity,
            batch_number: item.batch_number || null,
            manufacturing_date: item.manufacturing_date || null,
            expiry_date: item.expiry_date || null,
            notes: item.notes || null,
        }))

        const { error: itemsError } = await supabase
            .from('grn_items')
            .insert(items)

        if (itemsError) throw itemsError
    }

    return grn
}

export async function updateGRN(id: string, data: GRNFormData): Promise<GRN> {
    // Update GRN
    const { data: grn, error: grnError } = await supabase
        .from('grn')
        .update({
            received_date: data.received_date,
            notes: data.notes || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

    if (grnError) throw grnError

    // Delete old items
    await supabase.from('grn_items').delete().eq('grn_id', id)

    // Create new items
    if (data.items.length > 0) {
        const items = data.items.map(item => ({
            grn_id: id,
            purchase_order_item_id: item.purchase_order_item_id,
            raw_material_id: item.raw_material_id,
            product_id: item.product_id,
            ordered_quantity: item.ordered_quantity,
            received_quantity: item.received_quantity,
            accepted_quantity: item.accepted_quantity,
            rejected_quantity: item.rejected_quantity,
            batch_number: item.batch_number || null,
            manufacturing_date: item.manufacturing_date || null,
            expiry_date: item.expiry_date || null,
            notes: item.notes || null,
        }))

        const { error: itemsError } = await supabase
            .from('grn_items')
            .insert(items)

        if (itemsError) throw itemsError
    }

    return grn
}

export async function deleteGRN(id: string): Promise<void> {
    // Items auto-delete via CASCADE
    return deleteRecord('grn', id)
}

export async function updateGRNStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
        .from('grn')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw error
}

// ============ ACCEPT GRN & UPDATE INVENTORY ============
export async function acceptGRN(id: string, userId?: string): Promise<void> {
    const grn = await getGRNById(id)

    if (grn.status !== 'inspecting' && grn.status !== 'draft') {
        throw new Error('GRN must be in inspecting status to accept')
    }

    // Update GRN status
    const { error: grnError } = await supabase
        .from('grn')
        .update({
            status: 'accepted',
            received_by: userId || grn.received_by,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (grnError) throw grnError

    // Process each item
    for (const item of grn.items || []) {
        // Update purchase_order_items received_quantity
        const { data: poItem, error: poItemError } = await supabase
            .from('purchase_order_items')
            .select('received_quantity, quantity')
            .eq('id', item.purchase_order_item_id)
            .single()

        if (poItemError) throw poItemError

        const newReceivedQty = (poItem.received_quantity || 0) + item.accepted_quantity

        await supabase
            .from('purchase_order_items')
            .update({ received_quantity: newReceivedQty })
            .eq('id', item.purchase_order_item_id)

        // Update inventory for products
        if (item.product_id && item.accepted_quantity > 0) {
            // Check if inventory record exists
            const { data: existingInv, error: invCheckError } = await supabase
                .from('inventory')
                .select('id, quantity')
                .eq('product_id', item.product_id)
                .eq('batch_number', item.batch_number || 'DEFAULT')
                .maybeSingle()

            if (existingInv) {
                // Update existing
                await supabase
                    .from('inventory')
                    .update({
                        quantity: existingInv.quantity + item.accepted_quantity,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingInv.id)
            } else {
                // Create new inventory record
                await supabase
                    .from('inventory')
                    .insert({
                        product_id: item.product_id,
                        quantity: item.accepted_quantity,
                        available_quantity: item.accepted_quantity,
                        reserved_quantity: 0,
                        batch_number: item.batch_number || null,
                        manufacturing_date: item.manufacturing_date || null,
                        expiry_date: item.expiry_date || null,
                        status: 'available',
                    })
            }

            // Create inventory movement
            await supabase
                .from('inventory_movements')
                .insert({
                    product_id: item.product_id,
                    movement_type: 'grn_receipt',
                    quantity: item.accepted_quantity,
                    reference_type: 'grn',
                    reference_id: id,
                    notes: `GRN ${grn.grn_number} - ${item.batch_number || 'No batch'}`,
                    created_by: userId || null,
                })
        }

        // Update raw_materials stock for raw materials
        if (item.raw_material_id && item.accepted_quantity > 0) {
            const { data: rm, error: rmError } = await supabase
                .from('raw_materials')
                .select('current_stock')
                .eq('id', item.raw_material_id)
                .single()

            if (rmError) throw rmError

            await supabase
                .from('raw_materials')
                .update({
                    current_stock: (rm.current_stock || 0) + item.accepted_quantity,
                    updated_at: new Date().toISOString()
                })
                .eq('id', item.raw_material_id)
        }
    }

    // Check if all PO items are fully received
    const { data: poItems, error: poItemsError } = await supabase
        .from('purchase_order_items')
        .select('quantity, received_quantity')
        .eq('purchase_order_id', grn.purchase_order_id)

    if (poItemsError) throw poItemsError

    const allReceived = poItems.every((item: any) => (item.received_quantity || 0) >= item.quantity)

    if (allReceived) {
        await supabase
            .from('purchase_orders')
            .update({ status: 'received', updated_at: new Date().toISOString() })
            .eq('id', grn.purchase_order_id)
    }
}

// ============ GET RECEIVABLE POS ============
export async function getReceivablePOs(): Promise<{ id: string; po_number: string; supplier_name: string; total_amount: number }[]> {
    const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, po_number, suppliers(name), total_amount')
        .in('status', ['confirmed', 'partial'])
        .order('created_at', { ascending: false })

    if (error) throw error

    return (data || [])
        .filter((po: any) => po.suppliers) // Only return POs with valid suppliers
        .map((po: any) => ({
            id: po.id,
            po_number: po.po_number,
            supplier_name: po.suppliers?.name || '-',
            total_amount: po.total_amount,
        }))
}

// ============ GET PO ITEMS FOR GRN ============
export async function getPOItemsForGRN(poId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*, raw_materials(name, code, unit_of_measure), products(name, sku, unit_of_measure)')
        .eq('purchase_order_id', poId)

    if (error) throw error

    return (data || []).map((item: any) => ({
        id: item.id,
        raw_material_id: item.raw_material_id,
        product_id: item.product_id,
        material_name: item.raw_materials?.name || null,
        material_code: item.raw_materials?.code || null,
        product_name: item.products?.name || null,
        product_sku: item.products?.sku || null,
        ordered_quantity: item.quantity,
        already_received: item.received_quantity || 0,
        remaining_quantity: item.quantity - (item.received_quantity || 0),
        unit_of_measure: item.raw_materials?.unit_of_measure || item.products?.unit_of_measure || 'pcs',
        unit_price: item.unit_price,
    })).filter((item: any) => item.remaining_quantity > 0)
}

// ============ CREATE GRN FROM PO ============
export async function createGRNFromPO(poId: string, userId?: string): Promise<GRN> {
    // Get PO details
    const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(id, name)')
        .eq('id', poId)
        .single()

    if (poError) throw poError
    if (!['confirmed', 'partial'].includes(po.status)) {
        throw new Error('PO must be confirmed or partially received to create GRN')
    }

    // Get PO items with remaining quantities
    const poItems = await getPOItemsForGRN(poId)
    if (poItems.length === 0) {
        throw new Error('All items have been fully received')
    }

    // Generate GRN number
    const grnNumber = await generateNumber('grn')

    // Create GRN
    const { data: grn, error: grnError } = await supabase
        .from('grn')
        .insert({
            grn_number: grnNumber,
            purchase_order_id: poId,
            supplier_id: po.supplier_id,
            received_date: new Date().toISOString().split('T')[0],
            status: 'draft',
            notes: `GRN for PO ${po.po_number}`,
            received_by: userId || null,
        })
        .select()
        .single()

    if (grnError) throw grnError

    // Create GRN items with default received quantities (0, user will update)
    const grnItems = poItems.map((item: any) => ({
        grn_id: grn.id,
        purchase_order_item_id: item.id,
        raw_material_id: item.raw_material_id,
        product_id: item.product_id,
        ordered_quantity: item.ordered_quantity,
        received_quantity: 0,
        accepted_quantity: 0,
        rejected_quantity: 0,
        batch_number: '',
        manufacturing_date: null,
        expiry_date: null,
        notes: '',
    }))

    const { error: itemsError } = await supabase
        .from('grn_items')
        .insert(grnItems)

    if (itemsError) throw itemsError

    return grn
}

// ============ STATS ============
export async function getGRNStats() {
    const { data, error } = await supabase.from('grn').select('status')
    if (error) throw error
    const grns = data || []
    return {
        total: grns.length,
        draft: grns.filter(g => g.status === 'draft').length,
        inspecting: grns.filter(g => g.status === 'inspecting').length,
        accepted: grns.filter(g => g.status === 'accepted').length,
        partial: grns.filter(g => g.status === 'partial').length,
        rejected: grns.filter(g => g.status === 'rejected').length,
    }
}
