import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, createRecord, updateRecord, deleteRecord, generateNumber,
    type PaginationParams, type PaginatedResult,
} from './baseService'
import { logActivity, AUDIT_ACTIONS } from './auditService'
import { createNotification } from './notificationService'

export interface SalesOrder {
    id: string
    order_number: string
    customer_id: string
    order_date: string
    delivery_date: string | null
    status: string
    subtotal: number
    tax_amount: number
    discount_amount: number
    total_amount: number
    payment_status: string
    payment_method: string | null
    shipping_address: string | null
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    customer_name?: string
    customer_phone?: string
    items?: SalesOrderItem[]
    item_count?: number
}

export interface SalesOrderItem {
    id?: string
    sales_order_id?: string
    product_id: string
    quantity: number
    unit_price: number
    discount_percent: number
    tax_rate: number
    tax_amount: number
    total_amount: number
    product_name?: string
    product_sku?: string
}

export interface SalesOrderFormData {
    customer_id: string
    order_date: string
    delivery_date: string
    payment_method: string
    shipping_address: string
    notes: string
    items: SalesOrderItem[]
}

export const EMPTY_SO_FORM: SalesOrderFormData = {
    customer_id: '',
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    payment_method: '',
    shipping_address: '',
    notes: '',
    items: [],
}

export const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'upi', label: 'UPI' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'credit', label: 'Credit (On Account)' },
]

export const SO_STATUSES = [
    { value: 'draft', label: 'Draft', color: 'default' },
    { value: 'confirmed', label: 'Confirmed', color: 'info' },
    { value: 'processing', label: 'Processing', color: 'info' },
    { value: 'shipped', label: 'Shipped', color: 'purple' },
    { value: 'delivered', label: 'Delivered', color: 'success' },
    { value: 'cancelled', label: 'Cancelled', color: 'danger' },
]

// ============ CALCULATIONS ============
export function calculateLineItem(item: SalesOrderItem): SalesOrderItem {
    const subtotal = item.quantity * item.unit_price
    const discountAmt = subtotal * (item.discount_percent / 100)
    const taxableAmount = subtotal - discountAmt
    const taxAmount = Math.round(taxableAmount * (item.tax_rate / 100) * 100) / 100
    const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100

    return { ...item, tax_amount: taxAmount, total_amount: totalAmount }
}

export function calculateOrderTotals(items: SalesOrderItem[]) {
    const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0)
    const discountAmount = items.reduce((sum, i) => sum + (i.quantity * i.unit_price * i.discount_percent / 100), 0)
    const taxAmount = items.reduce((sum, i) => sum + i.tax_amount, 0)
    const totalAmount = items.reduce((sum, i) => sum + i.total_amount, 0)

    return {
        subtotal: Math.round(subtotal * 100) / 100,
        discount_amount: Math.round(discountAmount * 100) / 100,
        tax_amount: Math.round(taxAmount * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
    }
}

// ============ CRUD ============
export async function getSalesOrders(
    params: PaginationParams,
    filters?: { status?: string; paymentStatus?: string; search?: string; dateFrom?: string; dateTo?: string; customerId?: string }
): Promise<PaginatedResult<SalesOrder>> {
    const { page, pageSize } = params
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
        .from('sales_orders')
        .select('*, customers(name, phone)', { count: 'exact' })

    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status)
    if (filters?.paymentStatus && filters.paymentStatus !== 'all') query = query.eq('payment_status', filters.paymentStatus)
    if (filters?.customerId) query = query.eq('customer_id', filters.customerId)
    if (filters?.dateFrom) query = query.gte('order_date', filters.dateFrom)
    if (filters?.dateTo) query = query.lte('order_date', filters.dateTo)

    if (filters?.search) {
        query = query.ilike('order_number', `%${filters.search}%`)
    }

    query = query.order('created_at', { ascending: false })
        .range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    const mappedData = (data || []).map((so: any) => ({
        ...so,
        customer_name: so.customers?.name || '-',
        customer_phone: so.customers?.phone || '-',
    }))

    return {
        data: mappedData,
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
    }
}

export async function getSalesOrderById(id: string): Promise<SalesOrder> {
    const { data, error } = await supabase
        .from('sales_orders')
        .select('*, customers(name, phone), sales_order_items(*, products(name, sku))')
        .eq('id', id)
        .single()

    if (error) throw error

    return {
        ...data,
        customer_name: data.customers?.name || '-',
        customer_phone: data.customers?.phone || '-',
        items: (data.sales_order_items || []).map((item: any) => ({
            ...item,
            product_name: item.products?.name || '-',
            product_sku: item.products?.sku || '-',
        })),
        item_count: data.sales_order_items?.length || 0,
    }
}

export async function createSalesOrder(data: SalesOrderFormData, userId?: string): Promise<SalesOrder> {
    // Generate order number
    const orderNumber = await generateNumber('sales_order')
    const totals = calculateOrderTotals(data.items)

    // Create order
    const { data: order, error: orderError } = await supabase
        .from('sales_orders')
        .insert({
            order_number: orderNumber,
            customer_id: data.customer_id,
            order_date: data.order_date,
            delivery_date: data.delivery_date || null,
            status: 'draft',
            payment_status: 'unpaid',
            payment_method: data.payment_method || null,
            shipping_address: data.shipping_address || null,
            notes: data.notes || null,
            created_by: userId || null,
            ...totals,
        })
        .select()
        .single()

    if (orderError) throw orderError

    // Create line items
    if (data.items.length > 0) {
        const items = data.items.map(item => ({
            sales_order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            total_amount: item.total_amount,
        }))

        const { error: itemsError } = await supabase
            .from('sales_order_items')
            .insert(items)

        if (itemsError) throw itemsError
    }

    // Log activity
    await logActivity({
        action: AUDIT_ACTIONS.SO_CREATED,
        entity_type: 'sales_order',
        entity_id: order.id,
        details: { order_number: order.order_number, total_amount: order.total_amount }
    })

    // Create Notification
    createNotification({
        user_id: order.created_by || '',
        title: 'New Sales Order Created',
        message: `${order.order_number} created for ${order.customers?.name || 'Customer'}`,
        type: 'success',
        link: '/sales'
    })

    return order
}

export async function updateSalesOrderStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
        .from('sales_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw error
}

export async function deleteSalesOrder(id: string): Promise<void> {
    // Items auto-delete via CASCADE
    return deleteRecord('sales_orders', id)
}

export async function getSalesOrderStats() {
    const { data, error } = await supabase.from('sales_orders').select('status, payment_status, total_amount')
    if (error) throw error
    const orders = data || []
    return {
        total: orders.length,
        draft: orders.filter(o => o.status === 'draft').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        processing: orders.filter(o => o.status === 'processing').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        totalValue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        unpaid: orders.filter(o => o.payment_status === 'unpaid').length,
    }
}
