import { supabase } from '@/lib/supabase'

export interface SalesReport {
    totalOrders: number
    totalRevenue: number
    avgOrderValue: number
    topProducts: { name: string; quantity: number; revenue: number }[]
    topCustomers: { name: string; orders: number; revenue: number }[]
    monthlyRevenue: { month: string; revenue: number; orders: number }[]
    statusBreakdown: { status: string; count: number }[]
    paymentBreakdown: { status: string; count: number }[]
}

export interface InventoryReport {
    totalProducts: number
    totalValue: number
    lowStockItems: { name: string; sku: string; available: number; reorder: number }[]
    expiringItems: { name: string; batch: string; expiry: string; days: number; quantity: number }[]
    categoryBreakdown: { category: string; count: number; value: number }[]
}

export interface FinancialReport {
    totalInvoiced: number
    totalPaid: number
    totalPending: number
    totalPurchases: number
    grossProfit: number
    invoiceAging: { range: string; count: number; amount: number }[]
    monthlyInOut: { month: string; income: number; expense: number }[]
}

export interface ProductionReport {
    totalOrders: number
    completed: number
    totalProduced: number
    efficiency: number
    materialUsage: { name: string; planned: number; actual: number; unit: string }[]
}

// ============ SALES REPORT ============
export async function getSalesReport(): Promise<SalesReport> {
    const [ordersRes, itemsRes] = await Promise.all([
        supabase.from('sales_orders').select('*, customers(name)'),
        supabase.from('sales_order_items').select('*, products(name), sales_orders(order_date)'),
    ])

    const orders = ordersRes.data || []
    const items = itemsRes.data || []

    // Top products
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>()
    items.forEach((item: any) => {
        const name = item.products?.name || 'Unknown'
        const existing = productMap.get(name) || { name, quantity: 0, revenue: 0 }
        existing.quantity += item.quantity || 0
        existing.revenue += item.total_amount || 0
        productMap.set(name, existing)
    })
    const topProducts = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10)

    // Top customers
    const custMap = new Map<string, { name: string; orders: number; revenue: number }>()
    orders.forEach((o: any) => {
        const name = o.customers?.name || 'Unknown'
        const existing = custMap.get(name) || { name, orders: 0, revenue: 0 }
        existing.orders += 1
        existing.revenue += o.total_amount || 0
        custMap.set(name, existing)
    })
    const topCustomers = Array.from(custMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10)

    // Monthly revenue
    const monthMap = new Map<string, { revenue: number; orders: number }>()
    orders.forEach((o: any) => {
        const d = new Date(o.order_date || o.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const existing = monthMap.get(key) || { revenue: 0, orders: 0 }
        existing.revenue += o.total_amount || 0
        existing.orders += 1
        monthMap.set(key, existing)
    })
    const monthlyRevenue = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, data]) => ({
            month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
            ...data,
        }))

    // Status breakdown
    const statusMap = new Map<string, number>()
    orders.forEach((o: any) => statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1))
    const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }))

    // Payment breakdown
    const payMap = new Map<string, number>()
    orders.forEach((o: any) => payMap.set(o.payment_status, (payMap.get(o.payment_status) || 0) + 1))
    const paymentBreakdown = Array.from(payMap.entries()).map(([status, count]) => ({ status, count }))

    const totalRevenue = orders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0)

    return {
        totalOrders: orders.length,
        totalRevenue,
        avgOrderValue: orders.length ? Math.round(totalRevenue / orders.length) : 0,
        topProducts,
        topCustomers,
        monthlyRevenue,
        statusBreakdown,
        paymentBreakdown,
    }
}

// ============ INVENTORY REPORT ============
export async function getInventoryReport(): Promise<InventoryReport> {
    const [invRes, prodRes] = await Promise.all([
        supabase.from('inventory').select('*, products(name, sku, reorder_point, category_id, product_categories(name))'),
        supabase.from('products').select('*, product_categories(name)').eq('status', 'active'),
    ])

    const inventory = invRes.data || []
    const products = prodRes.data || []
    const today = new Date()

    // Low stock
    const lowStockItems = inventory
        .filter((i: any) => (i.available_quantity || 0) <= (i.products?.reorder_point || 0) && i.quantity > 0)
        .map((i: any) => ({
            name: i.products?.name || '-',
            sku: i.products?.sku || '-',
            available: i.available_quantity || 0,
            reorder: i.products?.reorder_point || 0,
        }))
        .slice(0, 20)

    // Expiring
    const expiringItems = inventory
        .filter((i: any) => {
            if (!i.expiry_date) return false
            const days = Math.ceil((new Date(i.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            return days >= 0 && days <= 90
        })
        .map((i: any) => ({
            name: i.products?.name || '-',
            batch: i.batch_number || '-',
            expiry: i.expiry_date,
            days: Math.ceil((new Date(i.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
            quantity: i.quantity || 0,
        }))
        .sort((a: any, b: any) => a.days - b.days)
        .slice(0, 20)

    // Category breakdown
    const catMap = new Map<string, { count: number; value: number }>()
    products.forEach((p: any) => {
        const cat = p.product_categories?.name || 'Uncategorized'
        const existing = catMap.get(cat) || { count: 0, value: 0 }
        existing.count += 1
        catMap.set(cat, existing)
    })
    const categoryBreakdown = Array.from(catMap.entries()).map(([category, data]) => ({ category, ...data }))

    const totalValue = inventory.reduce((s: number, i: any) => s + ((i.quantity || 0) * (i.unit_cost || 0)), 0)

    return {
        totalProducts: products.length,
        totalValue,
        lowStockItems,
        expiringItems,
        categoryBreakdown,
    }
}

// ============ FINANCIAL REPORT ============
export async function getFinancialReport(): Promise<FinancialReport> {
    const [invRes, poRes, payRes] = await Promise.all([
        supabase.from('invoices').select('*'),
        supabase.from('purchase_orders').select('total_amount, status, order_date'),
        supabase.from('payments').select('*'),
    ])

    const invoices = invRes.data || []
    const purchases = poRes.data || []
    const payments = payRes.data || []
    const today = new Date()

    const totalInvoiced = invoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0)
    const totalPaid = invoices.reduce((s: number, i: any) => s + (i.paid_amount || 0), 0)
    const totalPending = invoices.reduce((s: number, i: any) => s + (i.balance_amount || 0), 0)
    const totalPurchases = purchases.reduce((s: number, p: any) => s + (p.total_amount || 0), 0)

    // Invoice aging
    const aging = [
        { range: '0-30 days', count: 0, amount: 0 },
        { range: '31-60 days', count: 0, amount: 0 },
        { range: '61-90 days', count: 0, amount: 0 },
        { range: '90+ days', count: 0, amount: 0 },
    ]

    invoices.filter((i: any) => i.balance_amount > 0).forEach((inv: any) => {
        const days = Math.ceil((today.getTime() - new Date(inv.invoice_date).getTime()) / (1000 * 60 * 60 * 24))
        const bucket = days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3
        aging[bucket].count += 1
        aging[bucket].amount += inv.balance_amount || 0
    })

    // Monthly income vs expense
    const monthMap = new Map<string, { income: number; expense: number }>()

    payments.filter((p: any) => p.payment_type === 'received').forEach((p: any) => {
        const d = new Date(p.payment_date || p.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const existing = monthMap.get(key) || { income: 0, expense: 0 }
        existing.income += p.amount || 0
        monthMap.set(key, existing)
    })

    purchases.forEach((p: any) => {
        const d = new Date(p.order_date || p.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const existing = monthMap.get(key) || { income: 0, expense: 0 }
        existing.expense += p.total_amount || 0
        monthMap.set(key, existing)
    })

    const monthlyInOut = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, data]) => ({
            month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
            ...data,
        }))

    return {
        totalInvoiced,
        totalPaid,
        totalPending,
        totalPurchases,
        grossProfit: totalInvoiced - totalPurchases,
        invoiceAging: aging,
        monthlyInOut,
    }
}

// ============ PRODUCTION REPORT ============
export async function getProductionReport(): Promise<ProductionReport> {
    const [ordRes, matRes] = await Promise.all([
        supabase.from('production_orders').select('*'),
        supabase.from('production_materials').select('*, raw_materials(name)'),
    ])

    const orders = ordRes.data || []
    const materials = matRes.data || []

    const completed = orders.filter(o => o.status === 'completed')
    const totalProduced = completed.reduce((s: number, o: any) => s + (o.actual_quantity || 0), 0)
    const totalPlanned = completed.reduce((s: number, o: any) => s + (o.planned_quantity || 0), 0)

    // Material usage
    const matMap = new Map<string, { planned: number; actual: number; unit: string }>()
    materials.forEach((m: any) => {
        const name = m.raw_materials?.name || 'Unknown'
        const existing = matMap.get(name) || { planned: 0, actual: 0, unit: m.unit_of_measure || 'KG' }
        existing.planned += m.planned_quantity || 0
        existing.actual += m.actual_quantity || 0
        matMap.set(name, existing)
    })

    return {
        totalOrders: orders.length,
        completed: completed.length,
        totalProduced,
        efficiency: totalPlanned ? Math.round((totalProduced / totalPlanned) * 100) : 0,
        materialUsage: Array.from(matMap.entries()).map(([name, data]) => ({ name, ...data })).slice(0, 15),
    }
}
