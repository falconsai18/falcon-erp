import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, createRecord, updateRecord, deleteRecord, generateNumber,
    type PaginationParams, type PaginatedResult,
} from './baseService'
import { getCompanyInfo } from './settingsService'
import { formatCurrency, formatDate } from '@/lib/utils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ChallanItem {
    id?: string
    challan_id?: string
    product_id: string
    quantity: number
    batch_number: string
    product_name?: string
    product_sku?: string
    available_batches?: { batch_number: string; available_quantity: number; expiry_date: string }[]
}

export interface DeliveryChallan {
    id: string
    challan_number: string
    sales_order_id: string
    customer_id: string
    challan_date: string
    vehicle_number: string
    transporter: string
    status: string  // draft, dispatched, delivered, cancelled
    notes: string | null
    created_by: string | null
    created_at: string
    order_number?: string
    customer_name?: string
    customer_phone?: string
    customer_address?: string
    customer_gst?: string
    items?: ChallanItem[]
    item_count?: number
}

export interface ChallanFormData {
    sales_order_id: string
    challan_date: string
    vehicle_number: string
    transporter: string
    notes: string
    items: ChallanItem[]
}

export const EMPTY_CHALLAN_FORM: ChallanFormData = {
    sales_order_id: '',
    challan_date: new Date().toISOString().split('T')[0],
    vehicle_number: '',
    transporter: '',
    notes: '',
    items: [],
}

export const CHALLAN_STATUSES = [
    { value: 'draft', label: 'Draft', color: 'default' },
    { value: 'dispatched', label: 'Dispatched', color: 'info' },
    { value: 'delivered', label: 'Delivered', color: 'success' },
    { value: 'cancelled', label: 'Cancelled', color: 'danger' },
]

// ============ CRUD ============
export async function getChallans(
    params: PaginationParams,
    filters?: { status?: string; search?: string }
): Promise<PaginatedResult<DeliveryChallan>> {
    const filterArr = []
    if (filters?.status && filters.status !== 'all') filterArr.push({ column: 'status', value: filters.status })

    const result = await fetchPaginated<DeliveryChallan>('delivery_challans', params, {
        select: '*, sales_orders(order_number, customer_id), customers(name, phone, address_line1, city, state, gst_number)',
        filters: filterArr,
        search: filters?.search ? { columns: ['challan_number'], query: filters.search } : undefined,
        orderBy: { column: 'created_at', ascending: false },
    })

    result.data = result.data.map((c: any) => ({
        ...c,
        order_number: c.sales_orders?.order_number || '-',
        customer_id: c.sales_orders?.customer_id || c.customer_id,
        customer_name: c.customers?.name || '-',
        customer_phone: c.customers?.phone || '-',
        customer_address: c.customers ? `${c.customers.address_line1 || ''}, ${c.customers.city || ''}, ${c.customers.state || ''}`.trim() : '-',
        customer_gst: c.customers?.gst_number || '-',
    }))

    return result
}

export async function getChallanById(id: string): Promise<DeliveryChallan> {
    const { data, error } = await supabase
        .from('delivery_challans')
        .select('*, sales_orders(order_number, customer_id), customers(name, phone, address_line1, city, state, gst_number), challan_items(*, products(name, sku))')
        .eq('id', id)
        .single()

    if (error) throw error

    return {
        ...data,
        order_number: data.sales_orders?.order_number || '-',
        customer_id: data.sales_orders?.customer_id || data.customer_id,
        customer_name: data.customers?.name || '-',
        customer_phone: data.customers?.phone || '-',
        customer_address: data.customers ? `${data.customers.address_line1 || ''}, ${data.customers.city || ''}, ${data.customers.state || ''}`.trim() : '-',
        customer_gst: data.customers?.gst_number || '-',
        items: (data.challan_items || []).map((item: any) => ({
            ...item,
            product_name: item.products?.name || '-',
            product_sku: item.products?.sku || '-',
        })),
        item_count: data.challan_items?.length || 0,
    }
}

export async function createChallan(data: ChallanFormData, userId?: string): Promise<DeliveryChallan> {
    // Get SO details to get customer_id
    const { data: so, error: soError } = await supabase
        .from('sales_orders')
        .select('customer_id')
        .eq('id', data.sales_order_id)
        .single()
    
    if (soError) throw soError

    // Generate challan number
    const challanNumber = await generateNumber('challan')

    // Create challan
    const { data: challan, error: challanError } = await supabase
        .from('delivery_challans')
        .insert({
            challan_number: challanNumber,
            sales_order_id: data.sales_order_id,
            customer_id: so.customer_id,
            challan_date: data.challan_date,
            vehicle_number: data.vehicle_number || null,
            transporter: data.transporter || null,
            status: 'draft',
            notes: data.notes || null,
            created_by: userId || null,
        })
        .select()
        .single()

    if (challanError) throw challanError

    // Create challan items
    if (data.items.length > 0) {
        const items = data.items.map(item => ({
            challan_id: challan.id,
            product_id: item.product_id,
            quantity: item.quantity,
            batch_number: item.batch_number || null,
        }))

        const { error: itemsError } = await supabase
            .from('challan_items')
            .insert(items)

        if (itemsError) throw itemsError
    }

    return challan
}

export async function deleteChallan(id: string): Promise<void> {
    // Items auto-delete via CASCADE
    return deleteRecord('delivery_challans', id)
}

export async function updateChallanStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
        .from('delivery_challans')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw error
}

// ============ DISPATCH CHALLAN ============
export async function dispatchChallan(id: string, userId?: string): Promise<void> {
    const challan = await getChallanById(id)
    
    if (challan.status !== 'draft') {
        throw new Error('Only draft challans can be dispatched')
    }

    // Update challan status
    const { error: challanError } = await supabase
        .from('delivery_challans')
        .update({ 
            status: 'dispatched', 
            updated_at: new Date().toISOString() 
        })
        .eq('id', id)

    if (challanError) throw challanError

    // Deduct from inventory for each item
    for (const item of challan.items || []) {
        if (item.quantity > 0) {
            // Find inventory record by product and batch
            const { data: invRecords, error: invError } = await supabase
                .from('inventory')
                .select('id, quantity, available_quantity')
                .eq('product_id', item.product_id)
                .eq('batch_number', item.batch_number || 'DEFAULT')

            if (invError) throw invError

            if (invRecords && invRecords.length > 0) {
                const inv = invRecords[0]
                
                // Update inventory - reduce available quantity
                const newQty = Math.max(0, inv.quantity - item.quantity)
                const newAvailableQty = Math.max(0, inv.available_quantity - item.quantity)
                
                await supabase
                    .from('inventory')
                    .update({ 
                        quantity: newQty,
                        available_quantity: newAvailableQty,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', inv.id)

                // Create inventory movement
                await supabase
                    .from('inventory_movements')
                    .insert({
                        product_id: item.product_id,
                        movement_type: 'dispatch',
                        quantity: -item.quantity,
                        reference_type: 'challan',
                        reference_id: id,
                        notes: `Challan ${challan.challan_number} - Dispatched`,
                        created_by: userId || null,
                    })
            }
        }
    }

    // Check if all SO items are dispatched
    const { data: soItems, error: soItemsError } = await supabase
        .from('sales_order_items')
        .select('quantity')
        .eq('sales_order_id', challan.sales_order_id)

    if (soItemsError) throw soItemsError

    const { data: dispatchedItems, error: dispatchedError } = await supabase
        .from('challan_items')
        .select('quantity, delivery_challans!inner(status, sales_order_id)')
        .eq('delivery_challans.sales_order_id', challan.sales_order_id)
        .in('delivery_challans.status', ['dispatched', 'delivered'])

    if (dispatchedError) throw dispatchedError

    const totalOrdered = soItems.reduce((sum: number, item: any) => sum + item.quantity, 0)
    const totalDispatched = dispatchedItems.reduce((sum: number, item: any) => sum + item.quantity, 0)

    // Update SO status to shipped if all dispatched
    if (totalDispatched >= totalOrdered) {
        await supabase
            .from('sales_orders')
            .update({ status: 'shipped', updated_at: new Date().toISOString() })
            .eq('id', challan.sales_order_id)
    }
}

// ============ DELIVER CHALLAN ============
export async function deliverChallan(id: string): Promise<void> {
    const challan = await getChallanById(id)
    
    if (challan.status !== 'dispatched') {
        throw new Error('Only dispatched challans can be marked as delivered')
    }

    // Update challan status
    const { error: challanError } = await supabase
        .from('delivery_challans')
        .update({ 
            status: 'delivered', 
            updated_at: new Date().toISOString() 
        })
        .eq('id', id)

    if (challanError) throw challanError

    // Update SO status to delivered
    await supabase
        .from('sales_orders')
        .update({ status: 'delivered', updated_at: new Date().toISOString() })
        .eq('id', challan.sales_order_id)
}

// ============ GET DISPATCHABLE SOS ============
export async function getDispatchableSOs(): Promise<{ id: string; order_number: string; customer_name: string; total_amount: number }[]> {
    const { data, error } = await supabase
        .from('sales_orders')
        .select('id, order_number, customers(name), total_amount')
        .in('status', ['confirmed', 'processing'])
        .order('created_at', { ascending: false })

    if (error) throw error

    return (data || [])
        .filter((so: any) => so.customers)
        .map((so: any) => ({
            id: so.id,
            order_number: so.order_number,
            customer_name: so.customers?.name || '-',
            total_amount: so.total_amount,
        }))
}

// ============ GET SO ITEMS FOR CHALLAN ============
export async function getSOItemsForChallan(soId: string): Promise<any[]> {
    // Get SO items
    const { data: soItems, error: soError } = await supabase
        .from('sales_order_items')
        .select('*, products(name, sku)')
        .eq('sales_order_id', soId)

    if (soError) throw soError

    // Get already dispatched quantities
    const { data: dispatchedItems, error: dispatchedError } = await supabase
        .from('challan_items')
        .select('product_id, quantity, delivery_challans!inner(status, sales_order_id)')
        .eq('delivery_challans.sales_order_id', soId)
        .in('delivery_challans.status', ['dispatched', 'delivered'])

    if (dispatchedError) throw dispatchedError

    // Get available batches from inventory for each product
    const productIds = (soItems || []).map((item: any) => item.product_id)
    
    const { data: inventoryBatches, error: invError } = await supabase
        .from('inventory')
        .select('product_id, batch_number, available_quantity, expiry_date')
        .in('product_id', productIds)
        .gt('available_quantity', 0)

    if (invError) throw invError

    return (soItems || []).map((item: any) => {
        const dispatchedQty = dispatchedItems
            .filter((d: any) => d.product_id === item.product_id)
            .reduce((sum: number, d: any) => sum + d.quantity, 0)
        
        const batches = inventoryBatches
            ?.filter((inv: any) => inv.product_id === item.product_id)
            .map((inv: any) => ({
                batch_number: inv.batch_number || 'DEFAULT',
                available_quantity: inv.available_quantity,
                expiry_date: inv.expiry_date,
            })) || []

        return {
            id: item.id,
            product_id: item.product_id,
            product_name: item.products?.name || '-',
            product_sku: item.products?.sku || '-',
            ordered_quantity: item.quantity,
            dispatched_quantity: dispatchedQty,
            remaining_quantity: item.quantity - dispatchedQty,
            available_batches: batches,
        }
    }).filter((item: any) => item.remaining_quantity > 0)
}

// ============ STATS ============
export async function getChallanStats() {
    const { data, error } = await supabase.from('delivery_challans').select('status')
    if (error) throw error
    const challans = data || []
    return {
        total: challans.length,
        draft: challans.filter(c => c.status === 'draft').length,
        dispatched: challans.filter(c => c.status === 'dispatched').length,
        delivered: challans.filter(c => c.status === 'delivered').length,
        cancelled: challans.filter(c => c.status === 'cancelled').length,
    }
}

// ============ GENERATE CHALLAN PDF ============
export async function generateChallanPDF(challanId: string): Promise<void> {
    const challan = await getChallanById(challanId)
    const company = await getCompanyInfo()

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14
    let y = 15

    // ============ HEADER ============
    // Delivery Challan title
    doc.setFillColor(59, 130, 246) // blue-500
    doc.rect(0, 0, pageWidth, 32, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('DELIVERY CHALLAN', margin, 15)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(challan.challan_number, margin, 22)

    // Status badge
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    const statusText = challan.status.toUpperCase()
    let r = 156, g = 163, b = 175 // gray
    if (challan.status === 'dispatched') { r = 59; g = 130; b = 246 } // blue
    else if (challan.status === 'delivered') { r = 34; g = 197; b = 94 } // green
    
    doc.setFillColor(r, g, b)
    const statusWidth = doc.getTextWidth(statusText) + 10
    doc.roundedRect(pageWidth - margin - statusWidth, 8, statusWidth, 8, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    doc.text(statusText, pageWidth - margin - statusWidth / 2, 13, { align: 'center' })

    // Date on right
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`Date: ${formatDate(challan.challan_date)}`, pageWidth - margin, 25, { align: 'right' })

    y = 40

    // ============ COMPANY & CUSTOMER ============
    const colWidth = (pageWidth - margin * 2 - 10) / 2

    // Company box
    doc.setFillColor(249, 250, 251)
    doc.roundedRect(margin, y, colWidth, 35, 2, 2, 'F')
    doc.setDrawColor(229, 231, 235)
    doc.roundedRect(margin, y, colWidth, 35, 2, 2, 'S')

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(107, 114, 128)
    doc.text('FROM', margin + 4, y + 6)

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.text(company?.name || 'Your Company', margin + 4, y + 13)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(75, 85, 99)
    let companyY = y + 19
    if (company?.address_line1) { doc.text(company.address_line1, margin + 4, companyY); companyY += 4 }
    if (company?.city || company?.state) { doc.text(`${company?.city || ''}, ${company?.state || ''}`.trim(), margin + 4, companyY); companyY += 4 }
    if (company?.gst_number) { doc.text(`GSTIN: ${company.gst_number}`, margin + 4, companyY); companyY += 4 }

    // Customer box
    const customerX = margin + colWidth + 10
    doc.setFillColor(249, 250, 251)
    doc.roundedRect(customerX, y, colWidth, 35, 2, 2, 'F')
    doc.setDrawColor(229, 231, 235)
    doc.roundedRect(customerX, y, colWidth, 35, 2, 2, 'S')

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(107, 114, 128)
    doc.text('SHIP TO', customerX + 4, y + 6)

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.text(challan.customer_name || 'Customer', customerX + 4, y + 13)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(75, 85, 99)
    let customerY = y + 19
    if (challan.customer_address && challan.customer_address !== '-') { 
        doc.text(challan.customer_address, customerX + 4, customerY)
        customerY += 4 
    }
    if (challan.customer_gst && challan.customer_gst !== '-') { 
        doc.text(`GSTIN: ${challan.customer_gst}`, customerX + 4, customerY)
    }

    y += 45

    // ============ SHIPMENT DETAILS ============
    doc.setFillColor(249, 250, 251)
    doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 2, 2, 'F')
    doc.setDrawColor(229, 231, 235)
    doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 2, 2, 'S')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(107, 114, 128)
    doc.text('SO Number:', margin + 4, y + 6)
    doc.text('Vehicle No:', margin + colWidth + 4, y + 6)
    doc.text('Transporter:', margin + 4, y + 14)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(challan.order_number || '-', margin + 40, y + 6)
    doc.text(challan.vehicle_number || '-', margin + colWidth + 40, y + 6)
    doc.text(challan.transporter || '-', margin + 40, y + 14)

    y += 28

    // ============ ITEMS TABLE ============
    const items = challan.items || []

    autoTable(doc, {
        startY: y,
        head: [['#', 'Product', 'SKU', 'Qty', 'Batch']],
        body: items.map((item, idx) => [
            idx + 1,
            item.product_name || '-',
            item.product_sku || '-',
            item.quantity,
            item.batch_number || '-',
        ]),
        theme: 'grid',
        headStyles: {
            fillColor: [59, 130, 246],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'center',
        },
        bodyStyles: {
            fontSize: 8,
            textColor: [55, 65, 81],
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            1: { cellWidth: 80 },
            2: { cellWidth: 40 },
            3: { halign: 'center', cellWidth: 20 },
            4: { cellWidth: 30 },
        },
        margin: { left: margin, right: margin },
    })

    // Get Y after table
    y = (doc as any).lastAutoTable.finalY + 15

    // ============ NOTES ============
    if (challan.notes) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(107, 114, 128)
        doc.text('Notes:', margin, y)
        
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(75, 85, 99)
        doc.text(challan.notes, margin, y + 5)
        y += 15
    }

    // ============ SIGNATURE AREA ============
    const signY = Math.min(y, doc.internal.pageSize.getHeight() - 40)
    
    doc.setDrawColor(209, 213, 219)
    doc.line(margin, signY, margin + 50, signY)
    doc.setFontSize(7)
    doc.setTextColor(107, 114, 128)
    doc.text('Receiver Signature', margin, signY + 5)

    doc.line(pageWidth - margin - 50, signY, pageWidth - margin, signY)
    doc.text('Authorized Signature', pageWidth - margin - 50, signY + 5)

    // ============ FOOTER ============
    doc.setFontSize(7)
    doc.setTextColor(156, 163, 175)
    doc.text('This is a computer generated document', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' })

    // Save
    doc.save(`${challan.challan_number}.pdf`)
}
