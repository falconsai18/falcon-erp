import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, createRecord, updateRecord, deleteRecord, generateNumber,
    type PaginationParams, type PaginatedResult,
} from './baseService'

export interface SupplierBill {
    id: string
    bill_number: string
    supplier_id: string
    purchase_order_id: string | null
    bill_date: string
    due_date: string | null
    status: string
    subtotal: number
    tax_amount: number
    total_amount: number
    paid_amount: number
    balance_amount: number
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    supplier_name?: string
    supplier_phone?: string
    po_number?: string
    items?: SupplierBillItem[]
}

export interface SupplierBillItem {
    id?: string
    supplier_bill_id?: string
    description: string
    quantity: number
    unit_price: number
    tax_rate: number
    tax_amount: number
    total_amount: number
}

export interface SupplierPayment {
    id: string
    payment_number: string
    supplier_bill_id: string
    supplier_id: string
    amount: number
    payment_date: string
    payment_method: string
    reference_number: string | null
    notes: string | null
    status: string
    created_by: string | null
    created_at: string
    supplier_name?: string
    bill_number?: string
}

export interface SupplierBillFormData {
    supplier_id: string
    purchase_order_id: string
    bill_date: string
    due_date: string
    notes: string
    items: SupplierBillItem[]
}

export interface SupplierPaymentFormData {
    supplier_bill_id: string
    amount: number
    payment_date: string
    payment_method: string
    reference_number: string
    notes: string
}

export const EMPTY_BILL_FORM: SupplierBillFormData = {
    supplier_id: '',
    purchase_order_id: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
    items: [],
}

export const EMPTY_PAYMENT_FORM: SupplierPaymentFormData = {
    supplier_bill_id: '',
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: '',
}

export function calculateBillItem(item: SupplierBillItem): SupplierBillItem {
    const subtotal = item.quantity * item.unit_price
    const taxAmount = Math.round(subtotal * (item.tax_rate / 100) * 100) / 100
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100
    return { ...item, tax_amount: taxAmount, total_amount: totalAmount }
}

export function calculateBillTotals(items: SupplierBillItem[]) {
    return {
        subtotal: Math.round(items.reduce((s, i) => s + i.quantity * i.unit_price, 0) * 100) / 100,
        tax_amount: Math.round(items.reduce((s, i) => s + i.tax_amount, 0) * 100) / 100,
        total_amount: Math.round(items.reduce((s, i) => s + i.total_amount, 0) * 100) / 100,
    }
}

// ============ SUPPLIER BILLS ============

export async function getSupplierBills(
    params: PaginationParams,
    filters?: { status?: string; search?: string; supplier_id?: string }
): Promise<PaginatedResult<SupplierBill>> {
    const filterArr: { column: string; value: string }[] = []
    if (filters?.status && filters.status !== 'all') filterArr.push({ column: 'status', value: filters.status })
    if (filters?.supplier_id) filterArr.push({ column: 'supplier_id', value: filters.supplier_id })

    const result = await fetchPaginated<SupplierBill>('supplier_bills', params, {
        select: '*, suppliers(name, phone), purchase_orders(po_number)',
        filters: filterArr,
        search: filters?.search ? { columns: ['bill_number'], query: filters.search } : undefined,
        orderBy: { column: 'created_at', ascending: false },
    })

    result.data = result.data.map((bill: any) => ({
        ...bill,
        supplier_name: bill.suppliers?.name || '-',
        supplier_phone: bill.suppliers?.phone || '-',
        po_number: bill.purchase_orders?.po_number || '-',
    }))

    return result
}

export async function getSupplierBillById(id: string): Promise<SupplierBill> {
    const { data, error } = await supabase
        .from('supplier_bills')
        .select('*, suppliers(name, phone, email, gst_number), purchase_orders(po_number), supplier_bill_items(*)')
        .eq('id', id)
        .single()

    if (error) throw error

    return {
        ...data,
        supplier_name: data.suppliers?.name || '-',
        supplier_phone: data.suppliers?.phone || '-',
        po_number: data.purchase_orders?.po_number || '-',
        items: data.supplier_bill_items || [],
    }
}

export async function createSupplierBill(data: SupplierBillFormData, userId?: string): Promise<SupplierBill> {
    const billNumber = await generateNumber('supplier_bill')
    const totals = calculateBillTotals(data.items)

    const billData = {
        bill_number: billNumber,
        supplier_id: data.supplier_id,
        purchase_order_id: data.purchase_order_id || null,
        bill_date: data.bill_date,
        due_date: data.due_date || null,
        status: 'unpaid',
        subtotal: totals.subtotal,
        tax_amount: totals.tax_amount,
        total_amount: totals.total_amount,
        paid_amount: 0,
        balance_amount: totals.total_amount,
        notes: data.notes || null,
        created_by: userId || null,
    }

    const { data: bill, error } = await supabase.from('supplier_bills').insert(billData).select().single()
    if (error) throw error

    // Insert items
    if (data.items.length > 0) {
        const billItems = data.items.map(item => ({
            supplier_bill_id: bill.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            total_amount: item.total_amount,
        }))

        const { error: itemsError } = await supabase.from('supplier_bill_items').insert(billItems)
        if (itemsError) throw itemsError
    }

    return bill
}

export async function updateSupplierBillStatus(id: string, status: string): Promise<void> {
    const update: any = { status, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('supplier_bills').update(update).eq('id', id)
    if (error) throw error
}

export async function deleteSupplierBill(id: string): Promise<void> {
    return deleteRecord('supplier_bills', id)
}

export async function getSupplierBillStats() {
    const { data, error } = await supabase
        .from('supplier_bills')
        .select('status, total_amount, paid_amount, balance_amount')
    
    if (error) throw error
    
    const bills = data || []
    return {
        total: bills.length,
        unpaid: bills.filter(b => b.status === 'unpaid').length,
        partial: bills.filter(b => b.status === 'partial').length,
        paid: bills.filter(b => b.status === 'paid').length,
        overdue: bills.filter(b => b.status === 'overdue').length,
        cancelled: bills.filter(b => b.status === 'cancelled').length,
        totalValue: bills.reduce((s, b) => s + (b.total_amount || 0), 0),
        totalPaid: bills.reduce((s, b) => s + (b.paid_amount || 0), 0),
        totalPending: bills.reduce((s, b) => s + (b.balance_amount || 0), 0),
    }
}

// Get purchase orders that don't have bills yet
export async function getUnbilledPurchaseOrders(): Promise<any[]> {
    const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, po_number, supplier_id, total_amount, suppliers(name)')
        .in('status', ['confirmed', 'ordered', 'partial'])
        .order('created_at', { ascending: false })

    if (error) throw error

    // Filter out orders that already have bills
    const { data: billedOrders } = await supabase
        .from('supplier_bills')
        .select('purchase_order_id')
        .not('purchase_order_id', 'is', null)

    const billedIds = new Set((billedOrders || []).map((b: any) => b.purchase_order_id))
    
    return (data || []).filter((po: any) => !billedIds.has(po.id)).map((po: any) => ({
        ...po,
        supplier_name: po.suppliers?.name || '-',
    }))
}

// Get PO items for bill creation
export async function getPOItemsForBill(poId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*, raw_materials(name, code), products(name, sku)')
        .eq('purchase_order_id', poId)

    if (error) throw error

    return (data || []).map((item: any) => ({
        ...item,
        material_name: item.raw_materials?.name || item.products?.name || item.description,
        material_code: item.raw_materials?.code || item.products?.sku || '',
    }))
}

// ============ SUPPLIER PAYMENTS ============

export async function getSupplierPayments(
    params: PaginationParams,
    filters?: { supplier_id?: string; bill_id?: string; search?: string }
): Promise<PaginatedResult<SupplierPayment>> {
    const filterArr: { column: string; value: string }[] = []
    if (filters?.supplier_id) filterArr.push({ column: 'supplier_id', value: filters.supplier_id })
    if (filters?.bill_id) filterArr.push({ column: 'supplier_bill_id', value: filters.bill_id })

    const result = await fetchPaginated<SupplierPayment>('supplier_payments', params, {
        select: '*, suppliers(name), supplier_bills(bill_number)',
        filters: filterArr,
        search: filters?.search ? { columns: ['payment_number', 'reference_number'], query: filters.search } : undefined,
        orderBy: { column: 'payment_date', ascending: false },
    })

    result.data = result.data.map((payment: any) => ({
        ...payment,
        supplier_name: payment.suppliers?.name || '-',
        bill_number: payment.supplier_bills?.bill_number || '-',
    }))

    return result
}

export async function recordSupplierPayment(
    billId: string,
    amount: number,
    paymentMethod: string = 'bank_transfer',
    referenceNumber?: string,
    notes?: string,
    userId?: string
): Promise<void> {
    // Get bill details
    const { data: bill } = await supabase
        .from('supplier_bills')
        .select('paid_amount, total_amount, supplier_id, bill_number')
        .eq('id', billId)
        .single()

    if (!bill) throw new Error('Bill not found')

    // Validate amount
    const remainingBalance = bill.total_amount - (bill.paid_amount || 0)
    if (amount > remainingBalance) {
        throw new Error(`Amount exceeds remaining balance of ${remainingBalance}`)
    }

    // Generate payment number
    const paymentNumber = await generateNumber('supplier_payment')

    // Insert into supplier_payments table
    const { error: payError } = await supabase.from('supplier_payments').insert({
        payment_number: paymentNumber,
        supplier_bill_id: billId,
        supplier_id: bill.supplier_id,
        amount: amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
        reference_number: referenceNumber || null,
        notes: notes || `Payment for ${bill.bill_number}`,
        status: 'completed',
        created_by: userId || null,
    })

    if (payError) throw payError

    // Also insert into general payments table for reporting
    await supabase.from('payments').insert({
        payment_number: paymentNumber,
        payment_type: 'paid',
        supplier_id: bill.supplier_id,
        amount: amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
        reference_number: referenceNumber || null,
        notes: notes || `Supplier payment for ${bill.bill_number}`,
        status: 'completed',
        created_by: userId || null,
    })

    // Update bill amounts
    const newPaid = (bill.paid_amount || 0) + amount
    const balance = bill.total_amount - newPaid
    let status = 'partial'
    if (balance <= 0) status = 'paid'
    else if (newPaid === 0) status = 'unpaid'

    const { error } = await supabase.from('supplier_bills').update({
        paid_amount: newPaid,
        balance_amount: Math.max(balance, 0),
        status,
        updated_at: new Date().toISOString(),
    }).eq('id', billId)

    if (error) throw error
}

export async function deleteSupplierPayment(id: string): Promise<void> {
    // Get payment details first
    const { data: payment } = await supabase
        .from('supplier_payments')
        .select('supplier_bill_id, amount')
        .eq('id', id)
        .single()

    if (!payment) throw new Error('Payment not found')

    // Get current bill state
    const { data: bill } = await supabase
        .from('supplier_bills')
        .select('paid_amount, balance_amount, total_amount')
        .eq('id', payment.supplier_bill_id)
        .single()

    if (!bill) throw new Error('Bill not found')

    // Reverse the payment
    const newPaid = Math.max(0, (bill.paid_amount || 0) - payment.amount)
    const newBalance = bill.total_amount - newPaid
    let status = 'partial'
    if (newBalance >= bill.total_amount) status = 'unpaid'
    else if (newBalance <= 0) status = 'paid'

    // Update bill
    await supabase.from('supplier_bills').update({
        paid_amount: newPaid,
        balance_amount: newBalance,
        status,
        updated_at: new Date().toISOString(),
    }).eq('id', payment.supplier_bill_id)

    // Delete payment
    await deleteRecord('supplier_payments', id)
}

export async function getPaymentMethods(): Promise<string[]> {
    return ['cash', 'bank_transfer', 'cheque', 'upi', 'card', 'online']
}

export async function getBillsForPayment(supplierId?: string): Promise<{ id: string; bill_number: string; supplier_name: string; total_amount: number; paid_amount: number; balance_amount: number }[]> {
    let query = supabase
        .from('supplier_bills')
        .select('id, bill_number, total_amount, paid_amount, balance_amount, suppliers(name)')
        .in('status', ['unpaid', 'partial'])

    if (supplierId) {
        query = query.eq('supplier_id', supplierId)
    }

    const { data, error } = await query.order('bill_date', { ascending: false })

    if (error) throw error

    return (data || []).map((bill: any) => ({
        id: bill.id,
        bill_number: bill.bill_number,
        supplier_name: bill.suppliers?.name || '-',
        total_amount: bill.total_amount || 0,
        paid_amount: bill.paid_amount || 0,
        balance_amount: bill.balance_amount || 0,
    }))
}
