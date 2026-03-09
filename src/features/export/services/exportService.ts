import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, createRecord, updateRecord, deleteRecord, generateNumber,
    type PaginationParams, type PaginatedResult,
} from '@/services/baseService'
import { logActivity, AUDIT_ACTIONS } from '@/services/auditService'
import { createNotification } from '@/services/notificationService'
import {
    ExportCustomer,
    ExportOrder,
    ExportOrderItem,
    ExportInvoice,
    ExportPackingList,
    ExportPackingListItem,
    ExportShipment,
    ExportDocument,
    ExportPayment,
    PortLookup,
    ExportDashboardStats,
    TopExportBuyer,
    MonthlyExportTrend,
    OrderStatusCount,
    ShipmentInTransit,
    PendingDocument,
    ExportOrderFilters,
    ExportInvoiceFilters,
    ExportPaymentFilters,
    ExportShipmentFilters,
    ExportCustomerFormData,
    ExportOrderFormData,
    ExportOrderItemFormData,
    ExportInvoiceFormData,
    ExportPackingListFormData,
    ExportPackingListItemFormData,
    ExportShipmentFormData,
    ExportPaymentFormData,
    DocumentStatus,
    ShipmentStatus,
    ExportOrderStatus,
    InvoiceStatus,
    PackingStatus,
    DEFAULT_DOCUMENT_CHECKLIST,
    ShipmentMode
} from '../types/export.types'

// ============ CUSTOMERS ============
export async function getExportCustomers(filters?: {
    search?: string
    is_active?: boolean
}): Promise<ExportCustomer[]> {
    let query = supabase
        .from('export_customers')
        .select('*')
        .order('company_name')

    if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
    }

    if (filters?.search) {
        query = query.or(`company_name.ilike.%${filters.search}%,contact_person.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
}

export async function getExportCustomerById(id: string): Promise<ExportCustomer | null> {
    const { data, error } = await supabase
        .from('export_customers')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null
        throw error
    }
    return data
}

export async function createExportCustomer(data: ExportCustomerFormData): Promise<ExportCustomer> {
    const result = await createRecord('export_customers', data as Record<string, unknown>)
    
    logActivity({
        action: 'export_customer.created',
        entity_type: 'export_customer',
        entity_id: (result as Record<string, unknown>).id as string,
        details: { company_name: data.company_name }
    })

    return result as unknown as ExportCustomer
}

export async function updateExportCustomer(id: string, data: Partial<ExportCustomerFormData>): Promise<ExportCustomer> {
    const result = await updateRecord('export_customers', id, data as Record<string, unknown>)
    
    logActivity({
        action: 'export_customer.updated',
        entity_type: 'export_customer',
        entity_id: id,
        details: data
    })

    return result as unknown as ExportCustomer
}

export async function deleteExportCustomer(id: string): Promise<void> {
    await updateRecord('export_customers', id, { is_active: false })
    
    logActivity({
        action: 'export_customer.deleted',
        entity_type: 'export_customer',
        entity_id: id
    })
}

// ============ ORDERS ============
export async function getExportOrders(filters?: ExportOrderFilters): Promise<ExportOrder[]> {
    let query = supabase
        .from('export_orders')
        .select(`
            *,
            export_customers!inner(
                id,
                customer_code,
                company_name,
                country,
                contact_person,
                email
            )
        `)
        .order('created_at', { ascending: false })

    if (filters?.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status)
    }

    if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id)
    }

    if (filters?.date_range) {
        query = query
            .gte('order_date', filters.date_range.start)
            .lte('order_date', filters.date_range.end)
    }

    if (filters?.search) {
        query = query.or(`order_number.ilike.%${filters.search}%,export_customers.company_name.ilike.%${filters.search}%,buyer_po_number.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return data?.map(order => ({
        ...order,
        customer: order.export_customers
    })) || []
}

export async function getExportOrderById(id: string): Promise<ExportOrder | null> {
    const { data, error } = await supabase
        .from('export_orders')
        .select(`
            *,
            export_customers(*),
            export_order_items(*),
            export_documents(*),
            export_shipments(*),
            export_invoices(*),
            export_packing_lists(*),
            export_payments(*)
        `)
        .eq('id', id)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null
        throw error
    }

    return {
        ...data,
        customer: data.export_customers,
        items: data.export_order_items,
        documents: data.export_documents,
        shipment: data.export_shipments?.[0],
        invoice: data.export_invoices?.[0],
        packing_list: data.export_packing_lists?.[0],
        payments: data.export_payments
    }
}

export async function createExportOrder(data: ExportOrderFormData, items: ExportOrderItemFormData[]): Promise<ExportOrder> {
    // Generate order number
    const orderNumber = await getNextOrderNumber()
    
    // Calculate totals
    const totalAmountUSD = items.reduce((sum, item) => sum + (item.quantity * item.rate_usd), 0)
    const totalAmountINR = totalAmountUSD * data.exchange_rate

    // Create order
    const orderData = {
        ...data,
        order_number: orderNumber,
        total_amount_usd: totalAmountUSD,
        total_amount_inr: totalAmountINR
    }

    const order = await createRecord('export_orders', orderData as Record<string, unknown>) as unknown as ExportOrder

    // Create items
    const orderItems = items.map(item => ({
        ...item,
        export_order_id: order.id,
        amount_usd: item.quantity * item.rate_usd
    }))

    await supabase.from('export_order_items').insert(orderItems)

    // Create default document checklist
    await createDefaultChecklist(order.id, data.shipment_mode)

    logActivity({
        action: 'export_order.created',
        entity_type: 'export_order',
        entity_id: (order as any).id,
        details: { 
            order_number: orderNumber,
            customer_id: data.customer_id,
            total_amount_usd: totalAmountUSD
        }
    })

    return order as ExportOrder
}

export async function updateExportOrder(id: string, data: Partial<ExportOrderFormData>): Promise<ExportOrder> {
    const result = await updateRecord('export_orders', id, data as Record<string, unknown>)
    
    logActivity({
        action: 'export_order.updated',
        entity_type: 'export_order',
        entity_id: id,
        details: data
    })

    return result as unknown as ExportOrder
}

export async function updateExportOrderStatus(id: string, status: ExportOrderStatus): Promise<ExportOrder> {
    const result = await updateRecord('export_orders', id, { status })
    
    logActivity({
        action: 'export_order.status_updated',
        entity_type: 'export_order',
        entity_id: id,
        details: { status }
    })

    return result as unknown as ExportOrder
}

export async function deleteExportOrder(id: string): Promise<void> {
    const order = await getExportOrderById(id)
    if (!order || order.status !== 'DRAFT') {
        throw new Error('Only draft orders can be deleted')
    }

    await deleteRecord('export_orders', id)
    
    logActivity({
        action: 'export_order.deleted',
        entity_type: 'export_order',
        entity_id: id
    })
}

export async function getNextOrderNumber(): Promise<string> {
    const now = new Date()
    const yearMonth = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0')
    
    const { data } = await supabase
        .from('export_orders')
        .select('order_number')
        .like('order_number', `EXP-ORD-${yearMonth}-%`)
        .order('order_number', { ascending: false })
        .limit(1)

    let sequence = 1
    if (data && data.length > 0) {
        const lastNumber = data[0].order_number
        const lastSequence = parseInt(lastNumber.split('-').pop() || '0')
        sequence = lastSequence + 1
    }

    return `EXP-ORD-${yearMonth}-${sequence.toString().padStart(4, '0')}`
}

// ============ ORDER ITEMS ============
export async function addOrderItem(orderId: string, item: ExportOrderItemFormData): Promise<ExportOrderItem> {
    const itemData = {
        ...item,
        export_order_id: orderId,
        amount_usd: item.quantity * item.rate_usd
    }

    const { data, error } = await supabase
        .from('export_order_items')
        .insert(itemData)
        .select()
        .single()

    if (error) throw error

    await recalculateOrderTotals(orderId)
    
    logActivity({
        action: 'export_order_item.added',
        entity_type: 'export_order_item',
        entity_id: (data as any).id,
        details: { export_order_id: orderId }
    })

    return data
}

export async function updateOrderItem(itemId: string, data: Partial<ExportOrderItemFormData>): Promise<ExportOrderItem> {
    const updateData = {
        ...data,
        amount_usd: data.quantity && data.rate_usd ? data.quantity * data.rate_usd : undefined
    }

    const { data: item, error } = await supabase
        .from('export_order_items')
        .update(updateData)
        .eq('id', itemId)
        .select()
        .single()

    if (error) throw error

    // Recalculate order totals
    const { data: orderItem } = await supabase
        .from('export_order_items')
        .select('export_order_id')
        .eq('id', itemId)
        .single()

    if (orderItem) {
        await recalculateOrderTotals(orderItem.export_order_id)
    }

    logActivity({
        action: 'export_order_item.updated',
        entity_type: 'export_order_item',
        entity_id: itemId,
        details: updateData
    })

    return item as ExportOrderItem
}

export async function removeOrderItem(itemId: string, orderId: string): Promise<void> {
    await deleteRecord('export_order_items', itemId)
    await recalculateOrderTotals(orderId)
    
    logActivity({
        action: 'export_order_item.deleted',
        entity_type: 'export_order_item',
        entity_id: itemId,
        details: { export_order_id: orderId }
    })
}

export async function recalculateOrderTotals(orderId: string): Promise<void> {
    const { data: items } = await supabase
        .from('export_order_items')
        .select('amount_usd')
        .eq('export_order_id', orderId)

    const totalUSD = items?.reduce((sum, item) => sum + item.amount_usd, 0) || 0

    const { data: order } = await supabase
        .from('export_orders')
        .select('exchange_rate')
        .eq('id', orderId)
        .single()

    if (order) {
        const totalINR = totalUSD * order.exchange_rate
        await updateRecord('export_orders', orderId, {
            total_amount_usd: totalUSD,
            total_amount_inr: totalINR
        })
    }
}

// ============ INVOICES ============
export async function getExportInvoices(filters?: ExportInvoiceFilters): Promise<ExportInvoice[]> {
    let query = supabase
        .from('export_invoices')
        .select(`
            *,
            export_customers!inner(
                id,
                customer_code,
                company_name,
                country,
                contact_person,
                email
            ),
            export_orders(
                order_number
            )
        `)
        .order('created_at', { ascending: false })

    if (filters?.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status)
    }

    if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id)
    }

    if (filters?.date_range) {
        query = query
            .gte('invoice_date', filters.date_range.start)
            .lte('invoice_date', filters.date_range.end)
    }

    if (filters?.search) {
        query = query.or(`invoice_number.ilike.%${filters.search}%,export_customers.company_name.ilike.%${filters.search}%,export_orders.order_number.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return data?.map(invoice => ({
        ...invoice,
        customer: invoice.export_customers,
        order: invoice.export_orders
    })) || []
}

export async function getExportInvoiceById(id: string): Promise<ExportInvoice | null> {
    const { data, error } = await supabase
        .from('export_invoices')
        .select(`
            *,
            export_customers(*),
            export_orders(*),
            export_order_items(*),
            export_payments(*)
        `)
        .eq('id', id)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null
        throw error
    }

    return {
        ...data,
        customer: data.export_customers,
        order: data.export_orders,
        items: data.export_order_items,
        payments: data.export_payments
    }
}

export async function createExportInvoice(data: ExportInvoiceFormData): Promise<ExportInvoice> {
    const invoiceNumber = await getNextInvoiceNumber()
    const amountINR = data.amount_usd * data.exchange_rate

    const invoiceData = {
        ...data,
        invoice_number: invoiceNumber,
        amount_inr: amountINR
    }

    const result = await createRecord('export_invoices', invoiceData as Record<string, unknown>) as unknown as ExportInvoice

    logActivity({
        action: 'export_invoice.created',
        entity_type: 'export_invoice',
        entity_id: result.id,
        details: { 
            invoice_number: invoiceNumber,
            customer_id: data.customer_id,
            amount_usd: data.amount_usd
        }
    })

    return result
}

export async function updateExportInvoice(id: string, data: Partial<ExportInvoiceFormData>): Promise<ExportInvoice> {
    const updateData = {
        ...data,
        amount_inr: data.amount_usd && data.exchange_rate ? data.amount_usd * data.exchange_rate : undefined
    }

    const result = await updateRecord('export_invoices', id, updateData)
    
    return result as unknown as ExportInvoice
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<ExportInvoice> {
    const result = await updateRecord('export_invoices', id, { status })
    
    logActivity({
        action: 'export_invoice.status_updated',
        entity_type: 'export_invoice',
        entity_id: id,
        details: { status }
    })

    return result as unknown as ExportInvoice
}

export async function getNextInvoiceNumber(): Promise<string> {
    const now = new Date()
    const yearMonth = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0')
    
    const { data } = await supabase
        .from('export_invoices')
        .select('invoice_number')
        .like('invoice_number', `EXP-INV-${yearMonth}-%`)
        .order('invoice_number', { ascending: false })
        .limit(1)

    let sequence = 1
    if (data && data.length > 0) {
        const lastNumber = data[0].invoice_number
        const lastSequence = parseInt(lastNumber.split('-').pop() || '0')
        sequence = lastSequence + 1
    }

    return `EXP-INV-${yearMonth}-${sequence.toString().padStart(4, '0')}`
}

// ============ PACKING LISTS ============
export async function getPackingLists(filters?: {
    status?: PackingStatus | 'ALL'
    date_range?: { start: string; end: string }
    search?: string
}): Promise<ExportPackingList[]> {
    let query = supabase
        .from('export_packing_lists')
        .select(`
            *,
            export_orders!inner(
                order_number,
                export_customers!inner(
                    company_name,
                    country
                )
            )
        `)
        .order('created_at', { ascending: false })

    if (filters?.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status)
    }

    if (filters?.date_range) {
        query = query
            .gte('packing_date', filters.date_range.start)
            .lte('packing_date', filters.date_range.end)
    }

    if (filters?.search) {
        query = query.or(`packing_list_number.ilike.%${filters.search}%,export_orders.order_number.ilike.%${filters.search}%,export_orders.export_customers.company_name.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return data?.map(pl => ({
        ...pl,
        order: pl.export_orders
    })) || []
}

export async function getPackingListById(id: string): Promise<ExportPackingList | null> {
    const { data, error } = await supabase
        .from('export_packing_lists')
        .select(`
            *,
            export_orders(*),
            export_packing_list_items(*)
        `)
        .eq('id', id)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null
        throw error
    }

    return {
        ...data,
        order: data.export_orders,
        items: data.export_packing_list_items
    }
}

export async function createPackingList(data: ExportPackingListFormData, items: ExportPackingListItemFormData[]): Promise<ExportPackingList> {
    const packingListNumber = await getNextPackingListNumber()
    
    // Calculate totals
    const totalPackages = items.reduce((sum, item) => sum + item.packages, 0)
    const totalNetWeight = items.reduce((sum, item) => sum + item.net_weight_kg, 0)
    const totalGrossWeight = items.reduce((sum, item) => sum + item.gross_weight_kg, 0)
    const totalCBM = items.reduce((sum, item) => sum + item.cbm, 0)

    const packingListData = {
        ...data,
        packing_list_number: packingListNumber,
        total_packages: totalPackages,
        total_net_weight_kg: totalNetWeight,
        total_gross_weight_kg: totalGrossWeight,
        total_cbm: totalCBM
    }

    const packingList = await createRecord('export_packing_lists', packingListData as Record<string, unknown>) as unknown as ExportPackingList

    // Create items
    const packingListItems = items.map(item => ({
        ...item,
        packing_list_id: packingList.id
    }))

    await supabase.from('export_packing_list_items').insert(packingListItems)

    logActivity({
        action: 'PACKING_LIST_CREATED',
        entity_type: 'export_packing_list',
        entity_id: packingList.id,
        details: { 
            packing_list_number: packingListNumber,
            export_order_id: data.export_order_id
        }
    })

    return packingList as unknown as ExportPackingList
}

export async function updatePackingList(id: string, data: Partial<ExportPackingListFormData>): Promise<ExportPackingList> {
    const result = await updateRecord('export_packing_lists', id, data)
    
    logActivity({
        action: 'PACKING_LIST_UPDATED',
        entity_type: 'export_packing_list',
        entity_id: id,
        details: data
    })

    return result as unknown as ExportPackingList
}

export async function getNextPackingListNumber(): Promise<string> {
    const now = new Date()
    const yearMonth = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0')
    
    const { data } = await supabase
        .from('export_packing_lists')
        .select('packing_list_number')
        .like('packing_list_number', `EXP-PL-${yearMonth}-%`)
        .order('packing_list_number', { ascending: false })
        .limit(1)

    let sequence = 1
    if (data && data.length > 0) {
        const lastNumber = data[0].packing_list_number
        const lastSequence = parseInt(lastNumber.split('-').pop() || '0')
        sequence = lastSequence + 1
    }

    return `EXP-PL-${yearMonth}-${sequence.toString().padStart(4, '0')}`
}

// ============ SHIPMENTS ============
export async function getShipments(filters?: ExportShipmentFilters): Promise<ExportShipment[]> {
    let query = supabase
        .from('export_shipments')
        .select(`
            *,
            export_orders!inner(
                order_number,
                export_customers!inner(
                    company_name,
                    country
                )
            )
        `)
        .order('created_at', { ascending: false })

    if (filters?.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status)
    }

    if (filters?.shipment_mode && filters.shipment_mode !== 'ALL') {
        query = query.eq('shipment_mode', filters.shipment_mode)
    }

    if (filters?.date_range) {
        query = query
            .gte('created_at', filters.date_range.start)
            .lte('created_at', filters.date_range.end)
    }

    if (filters?.search) {
        query = query.or(`shipment_number.ilike.%${filters.search}%,export_orders.order_number.ilike.%${filters.search}%,vessel_name.ilike.%${filters.search}%,flight_number.ilike.%${filters.search}%,container_number.ilike.%${filters.search}%,awb_number.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return data?.map(shipment => ({
        ...shipment,
        order: shipment.export_orders,
        customer: shipment.export_orders.export_customers
    })) || []
}

export async function getShipmentById(id: string): Promise<ExportShipment | null> {
    const { data, error } = await supabase
        .from('export_shipments')
        .select(`
            *,
            export_orders(*, export_customers(*))
        `)
        .eq('id', id)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null
        throw error
    }

    const order = data?.export_orders as Record<string, unknown> | null
    const customer = order?.export_customers

    return {
        ...data,
        order: order ? { ...order, export_customers: undefined } : undefined,
        customer
    } as ExportShipment
}

export async function createShipment(data: ExportShipmentFormData): Promise<ExportShipment> {
    const shipmentNumber = await getNextShipmentNumber()
    
    const shipmentData = {
        ...data,
        shipment_number: shipmentNumber
    }

    const shipment = await createRecord('export_shipments', shipmentData as Record<string, unknown>) as unknown as ExportShipment

    // Update order status based on shipment status
    if (data.status === 'LOADED' || data.status === 'IN_TRANSIT') {
        await updateExportOrderStatus(data.export_order_id, 'SHIPPED')
    }

    logActivity({
        action: 'SHIPMENT_CREATED',
        entity_type: 'export_shipment',
        entity_id: shipment.id,
        details: { 
            shipment_number: shipmentNumber,
            export_order_id: data.export_order_id,
            shipment_mode: data.shipment_mode
        }
    })

    return shipment
}

export async function updateShipment(id: string, data: Partial<ExportShipmentFormData>): Promise<ExportShipment> {
    const result = await updateRecord('export_shipments', id, data)
    
    logActivity({
        action: 'SHIPMENT_UPDATED',
        entity_type: 'export_shipment',
        entity_id: id,
        details: data
    })

    return result as unknown as ExportShipment
}

export async function updateShipmentStatus(id: string, status: ShipmentStatus): Promise<ExportShipment> {
    const shipment = await getShipmentById(id)
    if (!shipment) throw new Error('Shipment not found')

    const result = await updateRecord('export_shipments', id, { status })

    // Update order status based on shipment status
    if (status === 'LOADED' || status === 'IN_TRANSIT') {
        await updateExportOrderStatus(shipment.export_order_id, 'SHIPPED')
    } else if (status === 'DELIVERED') {
        await updateExportOrderStatus(shipment.export_order_id, 'DELIVERED')
    }

    logActivity({
        action: 'SHIPMENT_STATUS_UPDATED',
        entity_type: 'export_shipment',
        entity_id: id,
        details: { status }
    })

    return result as unknown as ExportShipment
}

export async function getNextShipmentNumber(): Promise<string> {
    const now = new Date()
    const yearMonth = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0')
    
    const { data } = await supabase
        .from('export_shipments')
        .select('shipment_number')
        .like('shipment_number', `EXP-SHP-${yearMonth}-%`)
        .order('shipment_number', { ascending: false })
        .limit(1)

    let sequence = 1
    if (data && data.length > 0) {
        const lastNumber = data[0].shipment_number
        const lastSequence = parseInt(lastNumber.split('-').pop() || '0')
        sequence = lastSequence + 1
    }

    return `EXP-SHP-${yearMonth}-${sequence.toString().padStart(4, '0')}`
}

// ============ DOCUMENTS ============
export async function getDocumentsByOrder(orderId: string): Promise<ExportDocument[]> {
    const { data, error } = await supabase
        .from('export_documents')
        .select('*')
        .eq('export_order_id', orderId)
        .order('created_at')

    if (error) throw error
    return data || []
}

export async function updateDocumentStatus(
    docId: string, 
    status: DocumentStatus, 
    refNumber?: string, 
    issueDate?: string
): Promise<ExportDocument> {
    const updateData: any = { status }
    if (refNumber) updateData.reference_number = refNumber
    if (issueDate) updateData.issue_date = issueDate

    const result = await updateRecord('export_documents', docId, updateData)
    
    logActivity({
        action: 'DOCUMENT_STATUS_UPDATED',
        entity_type: 'export_document',
        entity_id: docId,
        details: { status, reference_number: refNumber }
    })

    return result as ExportDocument
}

export async function createDefaultChecklist(orderId: string, shipmentMode: ShipmentMode): Promise<void> {
    const documents = DEFAULT_DOCUMENT_CHECKLIST.map(doc => {
        // Swap Bill of Lading for Air Waybill if AIR shipment
        if (doc.document_type === 'BILL_OF_LADING' && shipmentMode === 'AIR') {
            return {
                export_order_id: orderId,
                document_type: 'AIR_WAYBILL',
                document_name: 'Air Waybill',
                status: doc.status
            }
        }
        return {
            export_order_id: orderId,
            document_type: doc.document_type,
            document_name: doc.document_name,
            status: doc.status
        }
    })

    await supabase.from('export_documents').insert(documents)
}

// ============ PAYMENTS ============
export async function getExportPayments(filters?: ExportPaymentFilters): Promise<ExportPayment[]> {
    let query = supabase
        .from('export_payments')
        .select(`
            *,
            export_customers!inner(
                id,
                customer_code,
                company_name,
                country,
                contact_person,
                email
            ),
            export_orders(
                order_number
            ),
            export_invoices(
                invoice_number
            )
        `)
        .order('created_at', { ascending: false })

    if (filters?.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status)
    }

    if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id)
    }

    if (filters?.date_range) {
        query = query
            .gte('payment_date', filters.date_range.start)
            .lte('payment_date', filters.date_range.end)
    }

    if (filters?.search) {
        query = query.or(`payment_number.ilike.%${filters.search}%,export_customers.company_name.ilike.%${filters.search}%,export_orders.order_number.ilike.%${filters.search}%,export_invoices.invoice_number.ilike.%${filters.search}%,bank_reference.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return data?.map(payment => ({
        ...payment,
        customer: payment.export_customers,
        order: payment.export_orders,
        invoice: payment.export_invoices
    })) || []
}

export async function createExportPayment(data: ExportPaymentFormData): Promise<ExportPayment> {
    const paymentNumber = await getNextPaymentNumber()
    
    // Calculate forex gain/loss: (realization_rate - invoice_rate) × received_usd
    let invoiceRate: number | null = null
    if (data.export_invoice_id) {
        const { data: inv } = await supabase
            .from('export_invoices')
            .select('exchange_rate')
            .eq('id', data.export_invoice_id)
            .single()
        invoiceRate = inv?.exchange_rate ?? null
    }
    
    const realizedAmountINR = data.received_amount_usd * data.bank_realization_rate
    const forexGainLoss = invoiceRate != null
        ? (data.bank_realization_rate - invoiceRate) * data.received_amount_usd
        : 0

    const paymentData = {
        ...data,
        payment_number: paymentNumber,
        realized_amount_inr: realizedAmountINR,
        forex_gain_loss: forexGainLoss
    }

    const payment = await createRecord('export_payments', paymentData as Record<string, unknown>) as unknown as ExportPayment

    // Update invoice status if fully paid
    if (data.export_invoice_id) {
        const { data: invoicePayments } = await supabase
            .from('export_payments')
            .select('received_amount_usd')
            .eq('export_invoice_id', data.export_invoice_id)

        const totalReceived = invoicePayments?.reduce((sum, p) => sum + p.received_amount_usd, 0) || 0
        
        const { data: invoice } = await supabase
            .from('export_invoices')
            .select('amount_usd')
            .eq('id', data.export_invoice_id)
            .single()

        if (invoice && totalReceived >= invoice.amount_usd) {
            await updateInvoiceStatus(data.export_invoice_id, 'PAID')
        } else if (invoice && totalReceived > 0) {
            await updateInvoiceStatus(data.export_invoice_id, 'PARTIALLY_PAID')
        }
    }

    logActivity({
        action: 'PAYMENT_CREATED',
        entity_type: 'export_payment',
        entity_id: payment.id,
        details: { 
            payment_number: paymentNumber,
            customer_id: data.customer_id,
            received_amount_usd: data.received_amount_usd,
            forex_gain_loss: forexGainLoss
        }
    })

    return payment
}

export async function updateExportPayment(id: string, data: Partial<ExportPaymentFormData>): Promise<ExportPayment> {
    const result = await updateRecord('export_payments', id, data as Record<string, unknown>)
    
    logActivity({
        action: 'PAYMENT_UPDATED',
        entity_type: 'export_payment',
        entity_id: id,
        details: data
    })

    return result as unknown as ExportPayment
}

export async function getNextPaymentNumber(): Promise<string> {
    const now = new Date()
    const yearMonth = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0')
    
    const { data } = await supabase
        .from('export_payments')
        .select('payment_number')
        .like('payment_number', `EXP-PAY-${yearMonth}-%`)
        .order('payment_number', { ascending: false })
        .limit(1)

    let sequence = 1
    if (data && data.length > 0) {
        const lastNumber = data[0].payment_number
        const lastSequence = parseInt(lastNumber.split('-').pop() || '0')
        sequence = lastSequence + 1
    }

    return `EXP-PAY-${yearMonth}-${sequence.toString().padStart(4, '0')}`
}

export async function getPaymentsByOrder(orderId: string): Promise<ExportPayment[]> {
    const { data, error } = await supabase
        .from('export_payments')
        .select('*')
        .eq('export_order_id', orderId)
        .order('created_at')

    if (error) throw error
    return data || []
}

// ============ DASHBOARD ============
export async function getExportDashboardStats(): Promise<ExportDashboardStats> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    
    // Get total revenue
    const { data: revenueData } = await supabase
        .from('export_orders')
        .select('total_amount_usd, total_amount_inr')
        .eq('status', 'DELIVERED')

    const totalRevenueUSD = revenueData?.reduce((sum, order) => sum + order.total_amount_usd, 0) || 0
    const totalRevenueINR = revenueData?.reduce((sum, order) => sum + order.total_amount_inr, 0) || 0

    // Get active orders
    const { count: activeOrdersCount } = await supabase
        .from('export_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED'])

    // Get shipments in transit
    const { count: shipmentsInTransitCount } = await supabase
        .from('export_shipments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['BOOKING_CONFIRMED', 'CUSTOMS_CLEARED', 'LOADED', 'IN_TRANSIT'])

    // Get pending payments
    const { data: pendingPayments } = await supabase
        .from('export_invoices')
        .select('amount_usd')
        .in('status', ['SENT', 'PAYMENT_PENDING', 'PARTIALLY_PAID'])

    const pendingPaymentsAmount = pendingPayments?.reduce((sum, inv) => sum + inv.amount_usd, 0) || 0

    // Get overdue payments
    const { data: overduePayments } = await supabase
        .from('export_invoices')
        .select('amount_usd')
        .in('status', ['SENT', 'PAYMENT_PENDING', 'PARTIALLY_PAID'])
        .lt('invoice_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const overduePaymentsAmount = overduePayments?.reduce((sum, inv) => sum + inv.amount_usd, 0) || 0

    // Get forex gain/loss
    const { data: forexData } = await supabase
        .from('export_payments')
        .select('forex_gain_loss')

    const netForexGainLoss = forexData?.reduce((sum, payment) => sum + (payment.forex_gain_loss || 0), 0) || 0

    // Get documents status
    const { data: documentsData } = await supabase
        .from('export_documents')
        .select('status')

    const documentsReadyCount = documentsData?.filter(doc => doc.status === 'READY' || doc.status === 'SUBMITTED').length || 0
    const documentsTotalCount = documentsData?.length || 0

    return {
        totalRevenueUSD,
        totalRevenueINR,
        activeOrdersCount: activeOrdersCount || 0,
        shipmentsInTransitCount: shipmentsInTransitCount || 0,
        pendingPaymentsAmount,
        overduePaymentsAmount,
        netForexGainLoss,
        documentsReadyCount,
        documentsTotalCount
    }
}

export async function getTopExportBuyers(limit: number = 5): Promise<TopExportBuyer[]> {
    const { data, error } = await supabase
        .from('export_orders')
        .select(`
            customer_id,
            total_amount_usd,
            export_customers!inner(
                company_name,
                country
            )
        `)
        .eq('status', 'DELIVERED')
        .order('total_amount_usd', { ascending: false })

    if (error) throw error

    const grouped = data?.reduce((acc, order: { customer_id: string; total_amount_usd: number; export_customers?: { company_name?: string; country?: string } | { company_name?: string; country?: string }[] }) => {
        const customerId = order.customer_id
        const cust = Array.isArray(order.export_customers) ? order.export_customers[0] : order.export_customers
        if (!acc[customerId]) {
            acc[customerId] = {
                customer_id: customerId,
                company_name: cust?.company_name ?? '',
                country: cust?.country ?? '',
                total_orders: 0,
                total_revenue_usd: 0
            }
        }
        acc[customerId].total_orders += 1
        acc[customerId].total_revenue_usd += order.total_amount_usd
        return acc
    }, {} as Record<string, TopExportBuyer>)

    return Object.values(grouped || {})
        .sort((a, b) => b.total_revenue_usd - a.total_revenue_usd)
        .slice(0, limit)
}

export async function getMonthlyExportTrend(months: number = 12): Promise<MonthlyExportTrend[]> {
    const { data, error } = await supabase
        .from('export_orders')
        .select('total_amount_usd, created_at')
        .eq('status', 'DELIVERED')
        .gte('created_at', new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at')

    if (error) throw error

    const monthlyData: Record<string, MonthlyExportTrend> = {}
    
    data?.forEach(order => {
        const month = new Date(order.created_at).toISOString().slice(0, 7)
        if (!monthlyData[month]) {
            monthlyData[month] = {
                month,
                revenue_usd: 0,
                order_count: 0
            }
        }
        monthlyData[month].revenue_usd += order.total_amount_usd
        monthlyData[month].order_count += 1
    })

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))
}

export async function getOrdersByStatusCount(): Promise<OrderStatusCount[]> {
    const { data, error } = await supabase
        .from('export_orders')
        .select('status')

    if (error) throw error

    const statusCounts: Record<string, number> = {}
    
    data?.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1
    })

    return Object.entries(statusCounts).map(([status, count]) => ({
        status: status as ExportOrderStatus,
        count
    }))
}

export async function getShipmentsInTransit(): Promise<ShipmentInTransit[]> {
    const { data, error } = await supabase
        .from('export_shipments')
        .select(`
            *,
            export_orders!inner(
                order_number,
                export_customers!inner(
                    company_name
                )
            )
        `)
        .in('status', ['BOOKING_CONFIRMED', 'CUSTOMS_CLEARED', 'LOADED', 'IN_TRANSIT'])
        .order('created_at', { ascending: false })

    if (error) throw error

    return (data?.map((shipment: { id: string; shipment_number: string; shipment_mode: string; vessel_name?: string; flight_number?: string; etd?: string; eta?: string; status: string; export_orders?: { order_number?: string; export_customers?: { company_name?: string } | { company_name?: string }[] } | { order_number?: string; export_customers?: { company_name?: string } }[] }) => {
        const ord = Array.isArray(shipment.export_orders) ? shipment.export_orders[0] : shipment.export_orders
        const cust = ord?.export_customers && (Array.isArray(ord.export_customers) ? ord.export_customers[0] : ord.export_customers)
        return {
        id: shipment.id,
        shipment_number: shipment.shipment_number,
        order_number: ord?.order_number ?? '',
        customer_name: cust?.company_name ?? '',
        shipment_mode: shipment.shipment_mode as ShipmentMode,
        vessel_or_flight: shipment.vessel_name || shipment.flight_number || '',
        etd: shipment.etd ?? null,
        eta: shipment.eta ?? null,
        status: shipment.status as ShipmentStatus
    }
    }) || []) as ShipmentInTransit[]
}

export async function getPendingDocuments(): Promise<PendingDocument[]> {
    const { data, error } = await supabase
        .from('export_documents')
        .select(`
            status,
            document_name,
            export_orders!inner(
                order_number
            )
        `)
        .in('status', ['NOT_STARTED', 'IN_PROGRESS'])
        .order('created_at')

    if (error) throw error

    return (data?.map((doc: { document_name: string; status: string; export_orders?: { order_number?: string } | { order_number?: string }[] }) => {
        const ord = Array.isArray(doc.export_orders) ? doc.export_orders[0] : doc.export_orders
        return {
        order_number: ord?.order_number ?? '',
        document_name: doc.document_name,
        status: doc.status as DocumentStatus
    }
    }) || []) as PendingDocument[]
}

export async function getOverduePayments(): Promise<ExportPayment[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
        .from('export_invoices')
        .select(`
            *,
            export_customers!inner(
                company_name,
                country
            )
        `)
        .in('status', ['SENT', 'PAYMENT_PENDING', 'PARTIALLY_PAID'])
        .lt('invoice_date', thirtyDaysAgo)
        .order('invoice_date')

    if (error) throw error

    return data?.map(invoice => ({
        ...invoice,
        customer: invoice.export_customers
    })) || []
}

// ============ PORTS ============
export async function getPorts(isIndian?: boolean): Promise<PortLookup[]> {
    let query = supabase
        .from('ports_lookup')
        .select('*')
        .order('port_name')

    if (isIndian !== undefined) {
        query = query.eq('is_indian', isIndian)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
}
