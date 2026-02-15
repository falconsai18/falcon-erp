import { useState, useEffect } from 'react'
import {
    BarChart3, ShoppingCart, Warehouse, IndianRupee, Factory,
    TrendingUp, TrendingDown, AlertTriangle, Clock, Users, Package,
    Download, RefreshCw,
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
type ReportTab = 'sales' | 'inventory' | 'financial' | 'production'

export function ReportsPage() {
    const [activeTab, setActiveTab] = useState<ReportTab>('sales')
    const [loading, setLoading] = useState(true)
    const [salesData, setSalesData] = useState<SalesReport | null>(null)
    const [inventoryData, setInventoryData] = useState<InventoryReport | null>(null)
    const [financialData, setFinancialData] = useState<FinancialReport | null>(null)
    const [productionData, setProductionData] = useState<ProductionReport | null>(null)

    const loadReport = async (tab: ReportTab) => {
        try {
            setLoading(true)
            switch (tab) {
                case 'sales': setSalesData(await getSalesReport()); break
                case 'inventory': setInventoryData(await getInventoryReport()); break
                case 'financial': setFinancialData(await getFinancialReport()); break
                case 'production': setProductionData(await getProductionReport()); break
            }
        } catch (err: any) { toast.error(err.message) }
        finally { setLoading(false) }
    }

    useEffect(() => { loadReport(activeTab) }, [activeTab])

    const tabs = [
        { key: 'sales' as const, label: 'Sales', icon: ShoppingCart, color: 'text-blue-400' },
        { key: 'inventory' as const, label: 'Inventory', icon: Warehouse, color: 'text-orange-400' },
        { key: 'financial' as const, label: 'Financial', icon: IndianRupee, color: 'text-emerald-400' },
        { key: 'production' as const, label: 'Production', icon: Factory, color: 'text-purple-400' },
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
                    <p className="text-sm text-dark-500 mt-1">Real-time business intelligence</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" icon={<RefreshCw size={16} />} size="sm" onClick={() => loadReport(activeTab)}>Refresh</Button>
                    <Button variant="secondary" icon={<Download size={16} />} size="sm" onClick={async () => {
                        try {
                            const { exportReportData } = await import('@/services/exportService')
                            const currentData = activeTab === 'sales' ? salesData
                                : activeTab === 'inventory' ? inventoryData
                                    : activeTab === 'financial' ? financialData
                                        : productionData
                            await exportReportData(activeTab, currentData)
                            toast.success('Report exported!')
                        } catch (err: any) { toast.error(err.message) }
                    }}>Export CSV</Button>
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
                                        <p className="text-xs text-dark-500">{k.label}</p>
                                        <p className={cn('text-lg font-bold mt-1', k.color)}>{k.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Income vs Expense */}
                                <div className="glass-card p-6">
                                    <h3 className="text-sm font-semibold text-white mb-4">Income vs Expense</h3>
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
                                    ) : <p className="text-dark-500 text-center py-12">No financial data yet</p>}
                                </div>

                                {/* Invoice Aging */}
                                <div className="glass-card p-6">
                                    <h3 className="text-sm font-semibold text-white mb-4">Invoice Aging</h3>
                                    <div className="space-y-3">
                                        {financialData.invoiceAging.map(a => (
                                            <div key={a.range} className="flex items-center justify-between bg-dark-200/20 rounded-lg p-3">
                                                <div>
                                                    <p className="text-sm text-white">{a.range}</p>
                                                    <p className="text-xs text-dark-500">{a.count} invoices</p>
                                                </div>
                                                <p className={cn('text-sm font-mono font-semibold',
                                                    a.range === '90+ days' ? 'text-red-400' : a.range === '61-90 days' ? 'text-amber-400' : 'text-white')}>
                                                    {formatCurrency(a.amount)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
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
        </div>
    )
}