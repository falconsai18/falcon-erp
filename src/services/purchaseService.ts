import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, createRecord, updateRecord, deleteRecord, generateNumber,
    type PaginationParams, type PaginatedResult,
} from './baseService'

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
    filters?: { status?: string; search?: string }
): Promise<PaginatedResult<PurchaseOrder>> {
    const filterArr = []
    if (filters?.status && filters.status !== 'all') filterArr.push({ column: 'status', value: filters.status })

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
