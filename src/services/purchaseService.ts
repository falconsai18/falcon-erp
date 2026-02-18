import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, createRecord, updateRecord, deleteRecord, generateNumber,
    type PaginationParams, type PaginatedResult,
} from './baseService'
import { logActivity, AUDIT_ACTIONS } from './auditService'
import { createNotification } from './notificationService'

export interface PurchaseOrder {
    id: string
    po_number: string
    supplier_id: string
    order_date: string
    expected_date: string | null
    status: string
    subtotal: number
    tax_amount: number
    total_amount: number
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    supplier_name?: string
    supplier_phone?: string
    items?: PurchaseOrderItem[]
    item_count?: number
}

export interface PurchaseOrderItem {
    id?: string
    purchase_order_id?: string
    raw_material_id: string | null
    product_id: string | null
    description: string
    quantity: number
    unit_price: number
    tax_rate: number
    tax_amount: number
    total_amount: number
    received_quantity: number
    material_name?: string
    material_code?: string
}

export interface POFormData {
    supplier_id: string
    order_date: string
    expected_date: string
    notes: string
    items: PurchaseOrderItem[]
}

export const EMPTY_PO_FORM: POFormData = {
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_date: '',
    notes: '',
    items: [],
}

export function calculatePOItem(item: PurchaseOrderItem): PurchaseOrderItem {
    const subtotal = item.quantity * item.unit_price
    const taxAmount = Math.round(subtotal * (item.tax_rate / 100) * 100) / 100
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100
    return { ...item, tax_amount: taxAmount, total_amount: totalAmount }
}

export function calculatePOTotals(items: PurchaseOrderItem[]) {
    return {
        subtotal: Math.round(items.reduce((s, i) => s + i.quantity * i.unit_price, 0) * 100) / 100,
        tax_amount: Math.round(items.reduce((s, i) => s + i.tax_amount, 0) * 100) / 100,
        total_amount: Math.round(items.reduce((s, i) => s + i.total_amount, 0) * 100) / 100,
    }
}

export async function getPurchaseOrders(
    params: PaginationParams,
    filters?: { status?: string; search?: string; dateFrom?: string; dateTo?: string; supplierId?: string }
): Promise<PaginatedResult<PurchaseOrder>> {
    const filterArr = []
    if (filters?.status && filters.status !== 'all') filterArr.push({ column: 'status', value: filters.status })
    if (filters?.supplierId) filterArr.push({ column: 'supplier_id', value: filters.supplierId })
    if (filters?.dateFrom) filterArr.push({ column: 'order_date', operator: 'gte', value: filters.dateFrom })
    if (filters?.dateTo) filterArr.push({ column: 'order_date', operator: 'lte', value: filters.dateTo })

    const result = await fetchPaginated<PurchaseOrder>('purchase_orders', params, {
        select: '*, suppliers(name, phone)',
        filters: filterArr,
        search: filters?.search ? { columns: ['po_number'], query: filters.search } : undefined,
        orderBy: { column: 'created_at', ascending: false },
    })

    result.data = result.data.map((po: any) => ({
        ...po,
        supplier_name: po.suppliers?.name || '-',
        supplier_phone: po.suppliers?.phone || '-',
    }))

    return result
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrder> {
    const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(name, phone, email), purchase_order_items(*, raw_materials(name, code))')
        .eq('id', id)
        .single()

    if (error) throw error

    return {
        ...data,
        supplier_name: data.suppliers?.name || '-',
        supplier_phone: data.suppliers?.phone || '-',
        items: (data.purchase_order_items || []).map((item: any) => ({
            ...item,
            material_name: item.raw_materials?.name || item.description || '-',
            material_code: item.raw_materials?.code || '-',
        })),
        item_count: data.purchase_order_items?.length || 0,
    }
}

export async function createPurchaseOrder(data: POFormData, userId?: string): Promise<PurchaseOrder> {
    const poNumber = await generateNumber('purchase_order')
    const totals = calculatePOTotals(data.items)

    const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
            po_number: poNumber,
            supplier_id: data.supplier_id,
            order_date: data.order_date,
            expected_date: data.expected_date || null,
            status: 'draft',
            notes: data.notes || null,
            created_by: userId || null,
            ...totals,
        })
        .select()
        .single()

    if (poError) throw poError

    if (data.items.length > 0) {
        const items = data.items.map(item => ({
            purchase_order_id: po.id,
            raw_material_id: item.raw_material_id || null,
            product_id: item.product_id || null,
            description: item.description || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            total_amount: item.total_amount,
            received_quantity: 0,
        }))

        const { error: itemsError } = await supabase.from('purchase_order_items').insert(items)
        if (itemsError) throw itemsError
    }

    // Log activity
    await logActivity({
        action: AUDIT_ACTIONS.PO_CREATED,
        entity_type: 'purchase_order',
        entity_id: po.id,
        details: { po_number: po.po_number, total_amount: po.total_amount }
    })

    // Create Notification
    createNotification({
        user_id: po.created_by || '',
        title: 'Purchase Order Created',
        message: `${po.po_number} created for ${po.suppliers?.name || 'Supplier'}`,
        type: 'success',
        link: '/purchase'
    })

    return po
}

export async function updatePOStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
        .from('purchase_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
    if (error) throw error
}

export async function deletePurchaseOrder(id: string): Promise<void> {
    return deleteRecord('purchase_orders', id)
}

export async function getPOStats() {
    const { data, error } = await supabase.from('purchase_orders').select('status, total_amount')
    if (error) throw error
    const orders = data || []
    return {
        total: orders.length,
        draft: orders.filter(o => o.status === 'draft').length,
        sent: orders.filter(o => o.status === 'sent').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        received: orders.filter(o => o.status === 'received').length,
        totalValue: orders.reduce((s, o) => s + (o.total_amount || 0), 0),
    }
}

// Get low stock raw materials that need reordering
export async function getLowStockMaterials(): Promise<any[]> {
    const { data, error } = await supabase
        .from('raw_materials')
        .select('*, suppliers(id, name)')
        .eq('status', 'active')
        .order('current_stock', { ascending: true })

    if (error) throw error

    return (data || [])
        .filter((rm: any) => rm.current_stock <= rm.reorder_point)
        .map((rm: any) => ({
            ...rm,
            supplier_name: rm.suppliers?.name || '-',
            suggested_quantity: Math.max(rm.reorder_point * 2 - rm.current_stock, 10),
        }))
}

// Auto-create PO from low stock material
export async function createPOFromLowStock(materialId: string, quantity: number, userId?: string): Promise<PurchaseOrder> {
    // Get material details
    const { data: material, error: matError } = await supabase
        .from('raw_materials')
        .select('*, suppliers(id, name)')
        .eq('id', materialId)
        .single()

    if (matError) throw matError
    if (!material) throw new Error('Material not found')
    if (!material.supplier_id) throw new Error('Material has no default supplier')

    // Check if there's already a draft PO for this supplier
    const { data: existingPO } = await supabase
        .from('purchase_orders')
        .select('id, po_number')
        .eq('supplier_id', material.supplier_id)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (existingPO) {
        // Add item to existing draft PO
        const itemTotal = quantity * (material.unit_cost || 0)
        const taxAmount = itemTotal * 0.18 // Default 18% GST

        const { error: itemError } = await supabase.from('purchase_order_items').insert({
            purchase_order_id: existingPO.id,
            raw_material_id: material.id,
            product_id: null,
            description: material.name,
            quantity: quantity,
            unit_price: material.unit_cost || 0,
            tax_rate: 18,
            tax_amount: taxAmount,
            total_amount: itemTotal + taxAmount,
            received_quantity: 0,
        })

        if (itemError) throw itemError

        // Update PO totals
        const { data: poItems } = await supabase
            .from('purchase_order_items')
            .select('total_amount')
            .eq('purchase_order_id', existingPO.id)

        const totalAmount = (poItems || []).reduce((sum, item) => sum + (item.total_amount || 0), 0)

        await supabase
            .from('purchase_orders')
            .update({
                total_amount: totalAmount,
                updated_at: new Date().toISOString(),
            })
            .eq('id', existingPO.id)

        // Return full PO by fetching it
        return getPurchaseOrderById(existingPO.id)
    }

    // Create new PO
    const poNumber = await generateNumber('purchase_order')
    const itemTotal = quantity * (material.unit_cost || 0)
    const taxAmount = itemTotal * 0.18 // Default 18% GST
    const totalAmount = itemTotal + taxAmount

    const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
            po_number: poNumber,
            supplier_id: material.supplier_id,
            order_date: new Date().toISOString().split('T')[0],
            expected_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'draft',
            subtotal: itemTotal,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            notes: `Auto-generated for low stock: ${material.name}`,
            created_by: userId || null,
        })
        .select()
        .single()

    if (poError) throw poError

    // Create PO item
    const { error: itemError } = await supabase.from('purchase_order_items').insert({
        purchase_order_id: po.id,
        raw_material_id: material.id,
        product_id: null,
        description: material.name,
        quantity: quantity,
        unit_price: material.unit_cost || 0,
        tax_rate: 18,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        received_quantity: 0,
    })

    if (itemError) throw itemError

    return po
}

// Auto-create PO from low stock alert (One-click)
export async function autoCreatePOFromLowStock(
    rawMaterialId: string,
    userId?: string
): Promise<{ po_number: string; id: string }> {
    // Fetch raw material with supplier info
    const { data: material, error } = await supabase
        .from('raw_materials')
        .select('id, name, code, supplier_id, reorder_point, current_stock, unit_cost, unit_of_measure')
        .eq('id', rawMaterialId)
        .single()

    if (error || !material) throw new Error('Raw material not found')
    if (!material.supplier_id) throw new Error(`No supplier linked to ${material.name}`)

    // Calculate order quantity (reorder_point - current_stock, minimum 10)
    const orderQty = Math.max(
        (material.reorder_point || 0) - (material.current_stock || 0),
        10
    )

    const unitCost = material.unit_cost || 0
    const subtotal = orderQty * unitCost
    const taxAmount = subtotal * 0.18 // Default 18% GST
    const totalAmount = subtotal + taxAmount

    // Generate PO number
    const { data: lastPO } = await supabase
        .from('purchase_orders')
        .select('po_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    const lastNum = lastPO ? parseInt(lastPO.po_number.split('-')[1] || '0') : 0
    const poNumber = `PO-${String(lastNum + 1).padStart(4, '0')}`

    // Create PO
    const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
            po_number: poNumber,
            supplier_id: material.supplier_id,
            order_date: new Date().toISOString().split('T')[0],
            expected_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'draft',
            subtotal,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            notes: `Auto-generated PO for low stock: ${material.name} (${material.code})`,
            created_by: userId
        })
        .select()
        .single()

    if (poError) throw poError

    // Create PO item
    const { error: itemError } = await supabase
        .from('purchase_order_items')
        .insert({
            purchase_order_id: po.id,
            raw_material_id: material.id,
            quantity: orderQty,
            unit_price: unitCost,
            tax_rate: 18,
            tax_amount: taxAmount,
            total_amount: totalAmount
        })

    if (itemError) throw itemError

    return { po_number: po.po_number, id: po.id }
}
