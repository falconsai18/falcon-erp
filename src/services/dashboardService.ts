import { supabase } from '@/lib/supabase'

export interface DashboardKPIs {
  todaySales: number
  pendingInvoices: number
  unpaidAmount: number
  lowStockCount: number
  expiringBatchesCount: number
  productionInProgress: number
}

export interface AlertItem {
  id: string
  type: 'expired' | 'expiring' | 'low_stock' | 'unpaid' | 'qc'
  title: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  date?: string
  amount?: number
}

export interface DashboardData {
  kpis: DashboardKPIs
  alerts: AlertItem[]
  orderStatusDistribution: { name: string; value: number; color: string }[]
  topProducts: { name: string; revenue: number; units: number }[]
  salesChart: { date: string; revenue: number; orders: number }[]
  recentActivity: any[]
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#22c55e',
  processing: '#3b82f6',
  pending: '#eab308',
  draft: '#6b7280',
  cancelled: '#ef4444',
  confirmed: '#8b5cf6',
  shipped: '#06b6d4',
  delivered: '#10b981',
}

export async function getAllDashboardData(chartDays: number = 30): Promise<DashboardData> {
  const { data, error } = await supabase.rpc('get_dashboard_data', { p_days: chartDays })

  if (error) throw new Error('Dashboard load failed: ' + error.message)

  const d = data as any

  // Build alerts from raw data
  const alerts: AlertItem[] = []

    ; (d.expiredBatches || []).forEach((b: any) => {
      alerts.push({
        id: `expired-${b.id}`,
        type: 'expired',
        title: 'Expired Batch',
        description: `${b.batch_number} - ${b.product_name || 'Product'}`,
        severity: 'critical',
        date: b.expiry_date,
      })
    })

    ; (d.expiringBatches || []).forEach((b: any) => {
      alerts.push({
        id: `expiring-${b.id}`,
        type: 'expiring',
        title: 'Expiring Soon',
        description: `${b.batch_number} - ${b.product_name || 'Product'}`,
        severity: 'warning',
        date: b.expiry_date,
      })
    })

    ; (d.lowStockMaterials || []).forEach((rm: any) => {
      alerts.push({
        id: `lowstock-${rm.id}`,
        type: 'low_stock',
        title: 'Low Stock',
        description: `${rm.name} (${rm.code || 'No Code'}) - ${rm.current_stock} remaining`,
        severity: 'warning',
      })
    })

    ; (d.overdueInvoices || []).forEach((inv: any) => {
      alerts.push({
        id: `unpaid-${inv.id}`,
        type: 'unpaid',
        title: 'Overdue Invoice',
        description: `${inv.invoice_number} - ${inv.customer_name || 'Customer'}`,
        severity: 'critical',
        date: inv.due_date,
        amount: inv.balance_amount,
      })
    })

  alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return order[a.severity] - order[b.severity]
  })

  // Format chart data
  const salesChart = (d.salesChart || []).map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    revenue: item.revenue || 0,
    orders: item.orders || 0,
  }))

  // Format order status
  const orderStatusDistribution = (d.orderStatusDistribution || []).map((item: any) => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    color: STATUS_COLORS[item.status] || '#6b7280',
  }))

  return {
    kpis: {
      todaySales: d.todaySales || 0,
      pendingInvoices: d.pendingInvoices || 0,
      unpaidAmount: d.unpaidAmount || 0,
      lowStockCount: d.lowStockCount || 0,
      expiringBatchesCount: d.expiringBatchesCount || 0,
      productionInProgress: d.productionInProgress || 0,
    },
    alerts,
    orderStatusDistribution,
    topProducts: d.topProducts || [],
    salesChart,
    recentActivity: d.recentActivity || [],
  }
}

export interface ComparisonData {
  sales: { current: number; previous: number; change: number }
  invoices: { current: number; previous: number; change: number }
  purchase: { current: number; previous: number; change: number }
  payments: { current: number; previous: number; change: number }
  trend: { name: string; sales: number; purchase: number }[]
}

export async function getComparisonData(): Promise<ComparisonData> {
  const today = new Date()
  const currStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString()
  const prevEnd = new Date(today.getFullYear(), today.getMonth(), 0).toISOString()
  const todayISO = today.toISOString()

  const [currSales, prevSales, currInvoices, prevInvoices, currPurchase, prevPurchase, currPayments, prevPayments] = await Promise.all([
    supabase.from('sales_orders').select('total_amount').neq('status', 'cancelled').gte('created_at', currStart).lte('created_at', todayISO),
    supabase.from('sales_orders').select('total_amount').neq('status', 'cancelled').gte('created_at', prevStart).lte('created_at', prevEnd),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).gte('created_at', currStart).lte('created_at', todayISO),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).gte('created_at', prevStart).lte('created_at', prevEnd),
    supabase.from('purchase_orders').select('total_amount').neq('status', 'cancelled').gte('created_at', currStart).lte('created_at', todayISO),
    supabase.from('purchase_orders').select('total_amount').neq('status', 'cancelled').gte('created_at', prevStart).lte('created_at', prevEnd),
    supabase.from('payments').select('amount').gte('payment_date', currStart).lte('payment_date', todayISO),
    supabase.from('payments').select('amount').gte('payment_date', prevStart).lte('payment_date', prevEnd),
  ])

  const sum = (rows: any[] | null) => (rows || []).reduce((s, r) => s + (Number(r.total_amount || r.amount) || 0), 0)
  const calcChange = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100

  const cS = sum(currSales.data), pS = sum(prevSales.data)
  const cP = sum(currPurchase.data), pP = sum(prevPurchase.data)
  const cPay = sum(currPayments.data), pPay = sum(prevPayments.data)
  const cI = currInvoices.count || 0, pI = prevInvoices.count || 0

  // 6 month trend
  const trend: { name: string; sales: number; purchase: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
    const name = d.toLocaleString('default', { month: 'short' })
    const [s, p] = await Promise.all([
      supabase.from('sales_orders').select('total_amount').neq('status', 'cancelled').gte('created_at', start).lte('created_at', end),
      supabase.from('purchase_orders').select('total_amount').neq('status', 'cancelled').gte('created_at', start).lte('created_at', end),
    ])
    trend.push({ name, sales: sum(s.data), purchase: sum(p.data) })
  }

  return {
    sales: { current: cS, previous: pS, change: calcChange(cS, pS) },
    invoices: { current: cI, previous: pI, change: calcChange(cI, pI) },
    purchase: { current: cP, previous: pP, change: calcChange(cP, pP) },
    payments: { current: cPay, previous: pPay, change: calcChange(cPay, pPay) },
    trend
  }
}
