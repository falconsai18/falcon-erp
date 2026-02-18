import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    BarChart3, ShoppingCart, Warehouse, IndianRupee, Factory,
    TrendingUp, TrendingDown, AlertTriangle, Clock, Users, Package,
    Download, RefreshCw, Calendar, Printer,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import {
    getSalesReport, getInventoryReport, getFinancialReport, getProductionReport,
    getSalesReportByDateRange, getCustomerSalesReport, getProductPLReport, getStockValuationReport,
    type SalesReport, type InventoryReport, type FinancialReport, type ProductionReport,
} from '@/services/reportService'

const CHART_COLORS = ['#eab308', '#22c55e', '#3b82f6', '#a855f7', '#f97316', '#06b6d4', '#f43f5e', '#84cc16']

const STATUS_COLORS: Record<string, string> = {
    draft: '#71717a', confirmed: '#3b82f6', processing: '#6366f1',
    shipped: '#a855f7', delivered: '#22c55e', cancelled: '#ef4444',
    paid: '#22c55e', unpaid: '#ef4444', partial: '#eab308',
}

function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="glass-card p-2 border border-dark-300 text-xs">
            <p className="text-white font-medium">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} className="text-dark-500">{p.name}: {typeof p.value === 'number' && p.value > 999 ? formatCurrency(p.value) : p.value}</p>
            ))}
        </div>
    )
}

// ============ REPORT TABS ============
type ReportTab = 'sales' | 'inventory' | 'financial' | 'production' | 'customer-sales' | 'product-pl' | 'stock-valuation'


export function ReportsPage() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<ReportTab>('sales')
    const [expandedBucket, setExpandedBucket] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [salesData, setSalesData] = useState<SalesReport | null>(null)
    const [inventoryData, setInventoryData] = useState<InventoryReport | null>(null)
    const [financialData, setFinancialData] = useState<FinancialReport | null>(null)
    const [productionData, setProductionData] = useState<ProductionReport | null>(null)
    const [showExportMenu, setShowExportMenu] = useState(false)
    const [fromDate, setFromDate] = useState<string>(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    )
    const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [customerSalesData, setCustomerSalesData] = useState<any[]>([])
    const [productPLData, setProductPLData] = useState<any[]>([])
    const [stockValuationData, setStockValuationData] = useState<{ items: any[], totals: any } | null>(null)

    const loadReport = async (tab: ReportTab) => {
        try {
            setLoading(true)
            switch (tab) {
                case 'sales': setSalesData(await getSalesReport()); break
                case 'inventory': setInventoryData(await getInventoryReport()); break
                case 'financial': setFinancialData(await getFinancialReport()); break
                case 'production': setProductionData(await getProductionReport()); break
                case 'customer-sales': setCustomerSalesData(await getCustomerSalesReport(fromDate, toDate)); break
                case 'product-pl': setProductPLData(await getProductPLReport(fromDate, toDate)); break
                case 'stock-valuation': setStockValuationData(await getStockValuationReport()); break
            }
        } catch (err: any) { toast.error(err.message) }
        finally { setLoading(false) }
    }

    useEffect(() => { loadReport(activeTab) }, [activeTab, fromDate, toDate])

    const tabs = [
        { key: 'sales' as const, label: 'Sales', icon: ShoppingCart, color: 'text-blue-400' },
        { key: 'inventory' as const, label: 'Inventory', icon: Warehouse, color: 'text-orange-400' },
        { key: 'financial' as const, label: 'Financial', icon: IndianRupee, color: 'text-emerald-400' },
        { key: 'production' as const, label: 'Production', icon: Factory, color: 'text-purple-400' },
        { key: 'customer-sales' as const, label: 'Customer Sales', icon: Users, color: 'text-cyan-400' },
        { key: 'product-pl' as const, label: 'Product P&L', icon: TrendingUp, color: 'text-green-400' },
        { key: 'stock-valuation' as const, label: 'Stock Valuation', icon: IndianRupee, color: 'text-yellow-400' },
    ]

    const exportOptions: Record<string, { key: string; label: string }[]> = {
        sales: [
            { key: 'all', label: '📦 Export All Sales Reports' },
            { key: 'sales_summary', label: '📊 Sales Summary' },
            { key: 'top_products', label: '🏆 Top Products' },
            { key: 'top_customers', label: '👥 Top Customers' },
            { key: 'monthly_revenue', label: '📈 Monthly Revenue' },
            { key: 'status_breakdown', label: '📋 Order Status Breakdown' },
            { key: 'payment_breakdown', label: '💳 Payment Status Breakdown' },
        ],
        inventory: [
            { key: 'all', label: '📦 Export All Inventory Reports' },
            { key: 'inventory_summary', label: '📊 Inventory Summary' },
            { key: 'low_stock', label: '⚠️ Low Stock Items' },
            { key: 'expiring_items', label: '⏰ Expiring Items' },
            { key: 'category_breakdown', label: '📂 Category Breakdown' },
        ],
        financial: [
            { key: 'all', label: '📦 Export All Financial Reports' },
            { key: 'financial_summary', label: '📊 Financial Summary' },
            { key: 'invoice_aging', label: '📅 Invoice Aging' },
            { key: 'monthly_income_expense', label: '📈 Monthly Income vs Expense' },
        ],
        production: [
            { key: 'all', label: '📦 Export All Production Reports' },
            { key: 'production_summary', label: '📊 Production Summary' },
            { key: 'material_usage', label: '🧪 Material Usage' },
        ],
    }

    useEffect(() => {
        if (!showExportMenu) return
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target.closest('.export-dropdown-container')) {
                setShowExportMenu(false)
            }
        }
        // Small delay to prevent immediate close on same click
        const timer = setTimeout(() => {
            document.addEventListener('click', handleClickOutside)
        }, 10)
        return () => {
            clearTimeout(timer)
            document.removeEventListener('click', handleClickOutside)
        }
    }, [showExportMenu])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
                    <p className="text-sm text-dark-500 mt-1">Real-time business intelligence</p>
                </div>
                <div className="flex items-center gap-3">
                    <style>{`
                        @media print {
                            body { background: white !important; color: black !important; }
                            .glass-card { background: white !important; border: 1px solid #ddd !important; box-shadow: none !important; }
                            .text-white { color: black !important; }
                            .text-dark-500 { color: #555 !important; }
                            button, .no-print { display: none !important; }
                        }
                    `}</style>
                    <Button variant="secondary" icon={<Printer size={16} />} size="sm" onClick={() => window.print()}>Print</Button>
                    <Button variant="secondary" icon={<RefreshCw size={16} />} size="sm" onClick={() => loadReport(activeTab)}>Refresh</Button>
                    <div className="relative export-dropdown-container">
                        <Button variant="secondary" icon={<Download size={16} />} size="sm"
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowExportMenu(!showExportMenu)
                            }}>
                            Export CSV ▾
                        </Button>
                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-1 w-64 glass-card border border-dark-300/50 rounded-lg shadow-xl z-50 py-1 max-h-80 overflow-y-auto">
                                {(exportOptions[activeTab] || []).map((opt) => (
                                    <button
                                        key={opt.key}
                                        onClick={async (e) => {
                                            e.stopPropagation()
                                            try {
                                                setShowExportMenu(false)
                                                const { exportSingleReport } = await import('@/services/exportService')
                                                const currentData = activeTab === 'sales' ? salesData
                                                    : activeTab === 'inventory' ? inventoryData
                                                        : activeTab === 'financial' ? financialData
                                                            : productionData
                                                await exportSingleReport(activeTab, opt.key, currentData)
                                                toast.success(`${opt.label.replace(/^[^\s]+\s/, '')} exported!`)
                                            } catch (err: any) {
                                                toast.error(err.message)
                                            }
                                        }}
                                        className={cn(
                                            'w-full text-left px-4 py-2.5 text-sm transition-colors',
                                            opt.key === 'all'
                                                ? 'text-brand-400 font-medium hover:bg-brand-500/10 border-b border-dark-300/30'
                                                : 'text-dark-500 hover:text-white hover:bg-dark-200/50'
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Date Range Filter */}
            <div className="glass-card p-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500 dark:text-dark-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-dark-600">Date Range:</span>
                    </div>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="input-field text-sm py-1.5 px-3"
                    />
                    <span className="text-gray-500 dark:text-dark-500">to</span>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="input-field text-sm py-1.5 px-3"
                    />
                    <button
                        onClick={() => loadReport(activeTab)}
                        className="px-4 py-1.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
                    >
                        Apply
                    </button>
                    {/* Quick filters */}
                    {[
                        { label: 'This Month', days: 'month' },
                        { label: 'Last 30 Days', days: '30' },
                        { label: 'Last 90 Days', days: '90' },
                        { label: 'This Year', days: 'year' }
                    ].map(filter => (
                        <button
                            key={filter.label}
                            onClick={() => {
                                const today = new Date();
                                let from = new Date();
                                if (filter.days === 'month') {
                                    from = new Date(today.getFullYear(), today.getMonth(), 1);
                                } else if (filter.days === 'year') {
                                    from = new Date(today.getFullYear(), 0, 1);
                                } else {
                                    from = new Date(Date.now() - parseInt(filter.days) * 24 * 60 * 60 * 1000);
                                }
                                setFromDate(from.toISOString().split('T')[0]);
                                setToDate(today.toISOString().split('T')[0]);
                            }}
                            className="px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-dark-600 bg-gray-100 dark:bg-dark-200 hover:bg-gray-200 dark:hover:bg-dark-300 transition-colors"
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-dark-300/30">
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px',
                            activeTab === tab.key ? `border-current ${tab.color}` : 'border-transparent text-dark-500 hover:text-white')}>
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="glass-card p-6"><div className="animate-pulse space-y-4">
                            <div className="h-4 bg-dark-200 rounded w-1/3" />
                            <div className="h-48 bg-dark-200 rounded" />
                        </div></div>
                    ))}
                </div>
            ) : (
                <>
                    {/* ============ SALES TAB ============ */}
                    {activeTab === 'sales' && salesData && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { label: 'Total Orders', value: salesData.totalOrders, color: 'text-blue-400', icon: ShoppingCart },
                                    { label: 'Total Revenue', value: formatCurrency(salesData.totalRevenue), color: 'text-emerald-400', icon: TrendingUp },
                                    { label: 'Avg Order Value', value: formatCurrency(salesData.avgOrderValue), color: 'text-purple-400', icon: BarChart3 },
                                    { label: 'Products Sold', value: salesData.topProducts.reduce((s, p) => s + p.quantity, 0), color: 'text-orange-400', icon: Package },
                                ].map(k => (
                                    <div key={k.label} className="glass-card p-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-dark-500">{k.label}</p>
                                            <k.icon size={16} className={k.color} />
                                        </div>
                                        <p className={cn('text-xl font-bold mt-2', k.color)}>{k.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Revenue Chart */}
                                <div className="lg:col-span-2 glass-card p-6">
                                    <h3 className="text-sm font-semibold text-white mb-4">Monthly Revenue</h3>
                                    {salesData.monthlyRevenue.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={280}>
                                            <AreaChart data={salesData.monthlyRevenue}>
                                                <defs>
                                                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                                <XAxis dataKey="month" stroke="#52525b" fontSize={11} />
                                                <YAxis stroke="#52525b" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                                <Tooltip content={<ChartTooltip />} />
                                                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-dark-500 text-center py-12">No sales data yet</p>}
                                </div>

                                {/* Status Pie */}
                                <div className="glass-card p-6">
                                    <h3 className="text-sm font-semibold text-white mb-4">Order Status</h3>
                                    {salesData.statusBreakdown.length > 0 ? (
                                        <>
                                            <ResponsiveContainer width="100%" height={180}>
                                                <PieChart>
                                                    <Pie data={salesData.statusBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                                                        paddingAngle={3} dataKey="count" nameKey="status">
                                                        {salesData.statusBreakdown.map((entry, i) => (
                                                            <Cell key={i} fill={STATUS_COLORS[entry.status] || CHART_COLORS[i % CHART_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<ChartTooltip />} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="space-y-1 mt-2">
                                                {salesData.statusBreakdown.map((s, i) => (
                                                    <div key={s.status} className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] || CHART_COLORS[i] }} />
                                                            <span className="text-dark-500 capitalize">{s.status}</span>
                                                        </div>
                                                        <span className="text-white font-medium">{s.count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : <p className="text-dark-500 text-center py-12">No data</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Top Products */}
                                <div className="glass-card p-6">
                                    <h3 className="text-sm font-semibold text-white mb-4">Top Products</h3>
                                    {salesData.topProducts.length > 0 ? (
                                        <div className="space-y-3">
                                            {salesData.topProducts.map((p, i) => (
                                                <div key={p.name} className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-dark-500 w-5">#{i + 1}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-white truncate">{p.name}</p>
                                                        <p className="text-xs text-dark-500">{p.quantity} units</p>
                                                    </div>
                                                    <p className="text-sm font-mono font-semibold text-blue-400">{formatCurrency(p.revenue)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-dark-500 text-center py-8">No sales yet</p>}
                                </div>

                                {/* Top Customers */}
                                <div className="glass-card p-6">
                                    <h3 className="text-sm font-semibold text-white mb-4">Top Customers</h3>
                                    {salesData.topCustomers.length > 0 ? (
                                        <div className="space-y-3">
                                            {salesData.topCustomers.map((c, i) => (
                                                <div key={c.name} className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-dark-500 w-5">#{i + 1}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-white truncate">{c.name}</p>
                                                        <p className="text-xs text-dark-500">{c.orders} orders</p>
                                                    </div>
                                                    <p className="text-sm font-mono font-semibold text-cyan-400">{formatCurrency(c.revenue)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-dark-500 text-center py-8">No customers yet</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ============ INVENTORY TAB ============ */}
                    {activeTab === 'inventory' && inventoryData && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {[
                                    { label: 'Total Products', value: inventoryData.totalProducts, color: 'text-orange-400' },
                                    { label: 'Stock Value', value: formatCurrency(inventoryData.totalValue), color: 'text-orange-400' },
                                    { label: 'Low Stock Items', value: inventoryData.lowStockItems.length, color: 'text-red-400', alert: true },
                                ].map(k => (
                                    <div key={k.label} className={cn('glass-card p-4', k.alert && inventoryData.lowStockItems.length > 0 && 'border-red-500/30')}>
                                        <p className="text-xs text-dark-500">{k.label}</p>
                                        <p className={cn('text-xl font-bold mt-1', k.color)}>{k.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Low Stock */}
                                <div className="glass-card p-6">
                                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                                        <AlertTriangle size={14} className="text-red-400" /> Low Stock Alerts
                                    </h3>
                                    {inventoryData.lowStockItems.length > 0 ? (
                                        <div className="space-y-2 max-h-80 overflow-y-auto">
                                            {inventoryData.lowStockItems.map((item, i) => (
                                                <div key={i} className="flex items-center justify-between bg-dark-200/20 rounded-lg p-3">
                                                    <div>
                                                        <p className="text-sm text-white">{item.name}</p>
                                                        <p className="text-xs text-dark-500">{item.sku}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-mono text-red-400">{item.available}</p>
                                                        <p className="text-[10px] text-dark-500">Reorder: {item.reorder}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-emerald-400 text-center py-8">✓ All stock levels healthy</p>}
                                </div>

                                {/* Expiring Items */}
                                <div className="glass-card p-6">
                                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                                        <Clock size={14} className="text-amber-400" /> Expiring Soon (90 days)
                                    </h3>
                                    {inventoryData.expiringItems.length > 0 ? (
                                        <div className="space-y-2 max-h-80 overflow-y-auto">
                                            {inventoryData.expiringItems.map((item, i) => (
                                                <div key={i} className="flex items-center justify-between bg-dark-200/20 rounded-lg p-3">
                                                    <div>
                                                        <p className="text-sm text-white">{item.name}</p>
                                                        <p className="text-xs text-dark-500">Batch: {item.batch}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <Badge variant={item.days <= 30 ? 'danger' : 'warning'}>{item.days}d</Badge>
                                                        <p className="text-xs text-dark-500 mt-1">Qty: {item.quantity}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-emerald-400 text-center py-8">✓ No items expiring soon</p>}
                                </div>
                            </div>

                            {/* Category Chart */}
                            {inventoryData.categoryBreakdown.length > 0 && (
                                <div className="glass-card p-6">
                                    <h3 className="text-sm font-semibold text-white mb-4">Products by Category</h3>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={inventoryData.categoryBreakdown}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                            <XAxis dataKey="category" stroke="#52525b" fontSize={11} />
                                            <YAxis stroke="#52525b" fontSize={11} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ============ FINANCIAL TAB ============ */}
                    {activeTab === 'financial' && financialData && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                                {[
                                    { label: 'Total Invoiced', value: formatCurrency(financialData.totalInvoiced), color: 'text-blue-400' },
                                    { label: 'Total Paid', value: formatCurrency(financialData.totalPaid), color: 'text-emerald-400' },
                                    { label: 'Pending', value: formatCurrency(financialData.totalPending), color: 'text-amber-400' },
                                    { label: 'Purchases', value: formatCurrency(financialData.totalPurchases), color: 'text-red-400' },
                                    { label: 'Gross Profit', value: formatCurrency(financialData.grossProfit), color: financialData.grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400' },
                                ].map(k => (
                                    <div key={k.label} className="glass-card p-4">
                                        <p className="text-xs text-gray-500 dark:text-dark-500">{k.label}</p>
                                        <p className={cn('text-lg font-bold mt-1', k.color)}>{k.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Income vs Expense */}
                                <div className="glass-card p-6">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Income vs Expense</h3>
                                    {financialData.monthlyInOut.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={250}>
                                            <BarChart data={financialData.monthlyInOut}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                                <XAxis dataKey="month" stroke="#52525b" fontSize={11} />
                                                <YAxis stroke="#52525b" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                                <Tooltip content={<ChartTooltip />} />
                                                <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
                                                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-gray-500 dark:text-dark-500 text-center py-12">No financial data yet</p>}
                                </div>
                            </div>

                            {/* Invoice Aging - Enhanced */}
                            <div className="glass-card p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Clock size={16} className="text-amber-400" />
                                        Receivables Aging Analysis
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-dark-500">Based on due date</p>
                                </div>

                                {/* Aging Bar Visualization */}
                                {(() => {
                                    const totalAging = financialData.invoiceAging.reduce((s, a) => s + a.amount, 0)
                                    if (totalAging === 0) return <p className="text-emerald-400 text-center py-8">✓ No outstanding receivables</p>

                                    const bucketColors = ['bg-emerald-500', 'bg-amber-500', 'bg-orange-500', 'bg-red-500']
                                    const bucketTextColors = ['text-emerald-400', 'text-amber-400', 'text-orange-400', 'text-red-400']

                                    return (
                                        <>
                                            {/* Stacked horizontal bar */}
                                            <div className="flex h-8 rounded-lg overflow-hidden mb-6">
                                                {financialData.invoiceAging.map((a, i) => {
                                                    const pct = totalAging > 0 ? (a.amount / totalAging) * 100 : 0
                                                    if (pct === 0) return null
                                                    return (
                                                        <div
                                                            key={a.range}
                                                            className={cn('flex items-center justify-center text-[10px] font-bold text-white cursor-pointer transition-opacity hover:opacity-80', bucketColors[i])}
                                                            style={{ width: `${Math.max(pct, 5)}%` }}
                                                            onClick={() => setExpandedBucket(expandedBucket === i ? null : i)}
                                                            title={`${a.range}: ${formatCurrency(a.amount)} (${a.count} invoices)`}
                                                        >
                                                            {pct > 10 ? `${Math.round(pct)}%` : ''}
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            {/* Bucket Cards */}
                                            <div className="grid grid-cols-4 gap-3 mb-4">
                                                {financialData.invoiceAging.map((a, i) => (
                                                    <button
                                                        key={a.range}
                                                        onClick={() => setExpandedBucket(expandedBucket === i ? null : i)}
                                                        className={cn(
                                                            'rounded-xl p-3 text-left transition-all border',
                                                            expandedBucket === i
                                                                ? `${bucketColors[i]}/10 border-current ${bucketTextColors[i]}`
                                                                : 'bg-gray-50 dark:bg-dark-200/20 border-transparent hover:bg-gray-100 dark:hover:bg-dark-200/40'
                                                        )}
                                                    >
                                                        <p className={cn('text-xs font-medium', bucketTextColors[i])}>{a.range}</p>
                                                        <p className={cn('text-lg font-bold mt-1', bucketTextColors[i])}>{formatCurrency(a.amount)}</p>
                                                        <p className="text-[10px] text-gray-500 dark:text-dark-500 mt-0.5">{a.count} invoice{a.count !== 1 ? 's' : ''}</p>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Expanded Invoice List */}
                                            {expandedBucket !== null && financialData.invoiceAging[expandedBucket] && (
                                                <div className="border border-gray-200 dark:border-dark-300/30 rounded-xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                                    <div className="bg-gray-50 dark:bg-dark-200/30 px-4 py-2.5 flex items-center justify-between">
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {financialData.invoiceAging[expandedBucket].range} — {financialData.invoiceAging[expandedBucket].count} invoices
                                                        </p>
                                                        <button
                                                            onClick={() => setExpandedBucket(null)}
                                                            className="text-xs text-gray-500 dark:text-dark-500 hover:text-gray-900 dark:hover:text-white"
                                                        >
                                                            Collapse
                                                        </button>
                                                    </div>

                                                    {/* Customer-wise grouping */}
                                                    {(() => {
                                                        const invoices = financialData.invoiceAging[expandedBucket].invoices
                                                        const customerGroups = invoices.reduce<Record<string, typeof invoices>>((acc, inv) => {
                                                            const key = inv.customer_name
                                                            if (!acc[key]) acc[key] = []
                                                            acc[key].push(inv)
                                                            return acc
                                                        }, {})

                                                        return (
                                                            <div className="divide-y divide-gray-200 dark:divide-dark-300/20">
                                                                {Object.entries(customerGroups).map(([customerName, custInvoices]) => {
                                                                    const custTotal = custInvoices.reduce((s, inv) => s + inv.balance_amount, 0)
                                                                    return (
                                                                        <div key={customerName}>
                                                                            {/* Customer Header */}
                                                                            <div className="flex items-center justify-between px-4 py-2 bg-gray-50/50 dark:bg-dark-200/10">
                                                                                <div className="flex items-center gap-2">
                                                                                    <Users size={12} className="text-gray-400 dark:text-dark-500" />
                                                                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{customerName}</span>
                                                                                    <Badge variant="default">{custInvoices.length}</Badge>
                                                                                </div>
                                                                                <span className="text-xs font-mono font-semibold text-red-400">{formatCurrency(custTotal)}</span>
                                                                            </div>
                                                                            {/* Invoices */}
                                                                            {custInvoices.map((inv) => (
                                                                                <div
                                                                                    key={inv.id}
                                                                                    onClick={() => navigate('/invoices')}
                                                                                    className="flex items-center gap-4 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-200/20 cursor-pointer transition-colors text-sm"
                                                                                >
                                                                                    <span className="font-mono text-rose-400 font-medium w-28">{inv.invoice_number}</span>
                                                                                    <span className="text-gray-500 dark:text-dark-500 w-24">{formatDate(inv.due_date)}</span>
                                                                                    <span className="text-gray-900 dark:text-white font-mono w-28">{formatCurrency(inv.total_amount)}</span>
                                                                                    <span className="text-emerald-400 font-mono w-28">{formatCurrency(inv.paid_amount)}</span>
                                                                                    <span className="text-red-400 font-mono font-semibold flex-1">{formatCurrency(inv.balance_amount)}</span>
                                                                                    <Badge variant="danger" dot>{inv.days_overdue}d</Badge>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        )
                                                    })()}
                                                </div>
                                            )}
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    )}

                    {/* ============ PRODUCTION TAB ============ */}
                    {activeTab === 'production' && productionData && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { label: 'Total Orders', value: productionData.totalOrders, color: 'text-purple-400' },
                                    { label: 'Completed', value: productionData.completed, color: 'text-emerald-400' },
                                    { label: 'Total Produced', value: productionData.totalProduced, color: 'text-purple-400' },
                                    { label: 'Efficiency', value: `${productionData.efficiency}%`, color: productionData.efficiency >= 90 ? 'text-emerald-400' : 'text-amber-400' },
                                ].map(k => (
                                    <div key={k.label} className="glass-card p-4">
                                        <p className="text-xs text-dark-500">{k.label}</p>
                                        <p className={cn('text-xl font-bold mt-1', k.color)}>{k.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="glass-card p-6">
                                <h3 className="text-sm font-semibold text-white mb-4">Material Usage (Planned vs Actual)</h3>
                                {productionData.materialUsage.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={productionData.materialUsage} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                            <XAxis type="number" stroke="#52525b" fontSize={11} />
                                            <YAxis type="category" dataKey="name" stroke="#52525b" fontSize={11} width={120} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Bar dataKey="planned" fill="#a855f7" radius={[0, 4, 4, 0]} name="Planned" />
                                            <Bar dataKey="actual" fill="#22c55e" radius={[0, 4, 4, 0]} name="Actual" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <p className="text-dark-500 text-center py-12">No production data yet</p>}
                            </div>
                        </div>
                    )}
                </>
            )}

            {!loading && (
                <>
                    {/* ============ CUSTOMER SALES TAB ============ */}
                    {activeTab === 'customer-sales' && (
                        <div className="glass-card p-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                                Customer-wise Sales Report
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-dark-300">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">#</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Customer</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Phone</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Invoices</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Total Invoiced</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Total Paid</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Outstanding</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customerSalesData.map((customer, index) => (
                                            <tr key={customer.customer_id}
                                                className="border-b border-gray-100 dark:border-dark-300 hover:bg-gray-50 dark:hover:bg-dark-200/50 transition-colors">
                                                <td className="py-3 px-4 text-sm text-gray-500 dark:text-dark-500">{index + 1}</td>
                                                <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{customer.name}</td>
                                                <td className="py-3 px-4 text-sm text-gray-600 dark:text-dark-600">{customer.phone}</td>
                                                <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">{customer.invoice_count}</td>
                                                <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">{formatCurrency(customer.total_invoiced)}</td>
                                                <td className="py-3 px-4 text-sm text-right text-green-600 dark:text-green-400">{formatCurrency(customer.total_paid)}</td>
                                                <td className="py-3 px-4 text-sm text-right text-red-600 dark:text-red-400">{formatCurrency(customer.total_outstanding)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {customerSalesData.length > 0 && (
                                        <tfoot>
                                            <tr className="border-t-2 border-gray-300 dark:border-dark-300 bg-gray-50 dark:bg-dark-200/50">
                                                <td colSpan={4} className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white">TOTAL</td>
                                                <td className="py-3 px-4 text-sm text-right font-bold text-gray-900 dark:text-white">
                                                    {formatCurrency(customerSalesData.reduce((s, c) => s + c.total_invoiced, 0))}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-right font-bold text-green-600 dark:text-green-400">
                                                    {formatCurrency(customerSalesData.reduce((s, c) => s + c.total_paid, 0))}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-right font-bold text-red-600 dark:text-red-400">
                                                    {formatCurrency(customerSalesData.reduce((s, c) => s + c.total_outstanding, 0))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                                {customerSalesData.length === 0 && (
                                    <div className="text-center py-12">
                                        <Users className="w-12 h-12 mx-auto text-gray-400 dark:text-dark-500 mb-3" />
                                        <p className="text-gray-600 dark:text-dark-600">No sales data for selected period</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ============ PRODUCT P&L TAB ============ */}
                    {activeTab === 'product-pl' && (
                        <div className="glass-card p-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                                Product-wise P&L Report
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-dark-300">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">#</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Product</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">SKU</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Qty Sold</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Revenue</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Cost</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Profit</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Margin</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productPLData.map((product, index) => (
                                            <tr key={product.product_id}
                                                className="border-b border-gray-100 dark:border-dark-300 hover:bg-gray-50 dark:hover:bg-dark-200/50 transition-colors">
                                                <td className="py-3 px-4 text-sm text-gray-500 dark:text-dark-500">{index + 1}</td>
                                                <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{product.name}</td>
                                                <td className="py-3 px-4 text-sm text-gray-600 dark:text-dark-600">{product.sku}</td>
                                                <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">{product.qty_sold}</td>
                                                <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">{formatCurrency(product.revenue)}</td>
                                                <td className="py-3 px-4 text-sm text-right text-red-600 dark:text-red-400">{formatCurrency(product.cost)}</td>
                                                <td className="py-3 px-4 text-sm text-right font-semibold text-green-600 dark:text-green-400">{formatCurrency(product.profit)}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-sm font-semibold ${product.margin_percent >= 20 ? 'text-green-600 dark:text-green-400' :
                                                        product.margin_percent >= 10 ? 'text-yellow-600 dark:text-yellow-400' :
                                                            'text-red-600 dark:text-red-400'
                                                        }`}>
                                                        {product.margin_percent.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {productPLData.length === 0 && (
                                    <div className="text-center py-12">
                                        <Package className="w-12 h-12 mx-auto text-gray-400 dark:text-dark-500 mb-3" />
                                        <p className="text-gray-600 dark:text-dark-600">No product sales data for selected period</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ============ STOCK VALUATION TAB ============ */}
                    {activeTab === 'stock-valuation' && stockValuationData && (
                        <div className="space-y-6">
                            {/* Summary KPIs */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="glass-card p-5">
                                    <p className="text-sm text-gray-600 dark:text-dark-600 mb-1">Total Cost Value</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(stockValuationData.totals.total_cost_value)}
                                    </p>
                                </div>
                                <div className="glass-card p-5">
                                    <p className="text-sm text-gray-600 dark:text-dark-600 mb-1">Total Retail Value</p>
                                    <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                                        {formatCurrency(stockValuationData.totals.total_retail_value)}
                                    </p>
                                </div>
                                <div className="glass-card p-5">
                                    <p className="text-sm text-gray-600 dark:text-dark-600 mb-1">Potential Profit</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {formatCurrency(stockValuationData.totals.total_potential_profit)}
                                    </p>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="glass-card p-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Stock Valuation</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-dark-300">
                                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">#</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Product</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">SKU</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Qty</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Unit Cost</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Selling Price</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Cost Value</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Retail Value</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Potential Profit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stockValuationData.items.map((item, index) => (
                                                <tr key={item.product_id}
                                                    className="border-b border-gray-100 dark:border-dark-300 hover:bg-gray-50 dark:hover:bg-dark-200/50 transition-colors">
                                                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-dark-500">{index + 1}</td>
                                                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-dark-600">{item.sku}</td>
                                                    <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">{item.available_qty}</td>
                                                    <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-dark-600">{formatCurrency(item.unit_cost)}</td>
                                                    <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-dark-600">{formatCurrency(item.selling_price)}</td>
                                                    <td className="py-3 px-4 text-sm text-right text-red-600 dark:text-red-400">{formatCurrency(item.cost_value)}</td>
                                                    <td className="py-3 px-4 text-sm text-right text-brand-600 dark:text-brand-400">{formatCurrency(item.retail_value)}</td>
                                                    <td className="py-3 px-4 text-sm text-right font-semibold text-green-600 dark:text-green-400">{formatCurrency(item.potential_profit)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {stockValuationData.items.length === 0 && (
                                        <div className="text-center py-12">
                                            <Package className="w-12 h-12 mx-auto text-gray-400 dark:text-dark-500 mb-3" />
                                            <p className="text-gray-600 dark:text-dark-600">No inventory data found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}