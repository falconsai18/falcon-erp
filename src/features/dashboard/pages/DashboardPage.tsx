import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Package,
    Users,
    ShoppingCart,
    IndianRupee,
    Warehouse,
    AlertTriangle,
    Calendar,
    FileText,
    Factory,
    Truck,
    RefreshCw,
    TrendingUp,
} from 'lucide-react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import {
    getAllDashboardData,
    getComparisonData,
    type DashboardData,
    type DashboardKPIs,
    type AlertItem,
    type ComparisonData,
} from '@/services/dashboardService'
import {
    getAllCustomerScores,
    type CreditScoreResult
} from '@/services/creditScoringService'
import { autoCreatePOFromLowStock } from '@/services/purchaseService'

// ============ QUICK ACTIONS ============

const QUICK_ACTIONS = [
    { label: 'New Sale Order', icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-400/10', path: '/sales' },
    { label: 'Create Invoice', icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-400/10', path: '/invoices' },
    { label: 'Add Product', icon: Package, color: 'text-purple-400', bg: 'bg-purple-400/10', path: '/products' },
    { label: 'Purchase Order', icon: Truck, color: 'text-orange-400', bg: 'bg-orange-400/10', path: '/purchase' },
    { label: 'New Work Order', icon: Factory, color: 'text-amber-400', bg: 'bg-amber-400/10', path: '/production' },
    { label: 'Add Customer', icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-400/10', path: '/customers' },
    { label: 'New Quotation', icon: FileText, color: 'text-pink-400', bg: 'bg-pink-400/10', path: '/quotations' },
    { label: 'Add Supplier', icon: Truck, color: 'text-teal-400', bg: 'bg-teal-400/10', path: '/suppliers' },
    { label: 'Quality Check', icon: Warehouse, color: 'text-indigo-400', bg: 'bg-indigo-400/10', path: '/quality-checks' },
    { label: 'New Challan', icon: FileText, color: 'text-lime-400', bg: 'bg-lime-400/10', path: '/challans' },
    { label: 'Raw Material', icon: Package, color: 'text-rose-400', bg: 'bg-rose-400/10', path: '/raw-materials' },
    { label: 'View Reports', icon: TrendingUp, color: 'text-sky-400', bg: 'bg-sky-400/10', path: '/reports' },
]

// ============ COMPONENTS ============

interface KPICardProps {
    title: string
    value: number
    format: 'currency' | 'number'
    icon: any
    color: string
    bgColor: string
    alert?: boolean
    onClick: () => void
}

function KPICard({ title, value, format, icon: Icon, color, bgColor, alert, onClick }: KPICardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                'glass-card p-5 hover:border-dark-200 transition-all duration-300 cursor-pointer',
                alert && 'border-red-500/30 hover:border-red-500/50'
            )}
        >
            <div className="flex items-start justify-between">
                <div className="space-y-3">
                    <p className="text-sm text-gray-500 dark:text-dark-500 font-medium">{title}</p>
                    <p className="text-2xl font-bold text-white">
                        {format === 'currency' ? formatCurrency(value) : value.toLocaleString('en-IN')}
                    </p>
                </div>
                <div className={cn('p-3 rounded-xl', bgColor)}>
                    <Icon size={22} className={color} />
                </div>
            </div>
        </div>
    )
}

function CustomTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card p-3 border border-gray-200 dark:border-dark-300/50">
                <p className="text-sm font-semibold text-white">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-xs text-gray-500 dark:text-dark-500 mt-1">
                        {entry.name}: {entry.name === 'revenue' ? formatCurrency(entry.value) : entry.value}
                    </p>
                ))}
            </div>
        )
    }
    return null
}

// ============ COMPARISON SECTION ============

import { BarChart, Bar, Legend, CartesianGrid as RechartsGrid } from 'recharts'

function ComparisonSection({ refreshTrigger }: { refreshTrigger: number }) {
    const navigate = useNavigate()
    const [data, setData] = useState<ComparisonData | null>(null)
    const [loading, setLoading] = useState(true)
    const [creditScores, setCreditScores] = useState<CreditScoreResult[]>([])
    const [creditLoading, setCreditLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [refreshTrigger])

    useEffect(() => {
        setCreditLoading(true)
        getAllCustomerScores()
            .then(scores => setCreditScores(scores.slice(0, 10)))
            .catch(e => console.error('Credit scores:', e))
            .finally(() => setCreditLoading(false))
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const res = await getComparisonData()
            setData(res)
        } catch (error) {
            console.error('Comparison load error:', error)
            toast.error('Comparison data load failed')
        } finally {
            setLoading(false)
        }
    }

    // Calculate risk breakdown
    const riskBreakdown = {
        low: creditScores.filter(s => s.riskCategory === 'low').length,
        medium: creditScores.filter(s => s.riskCategory === 'medium').length,
        high: creditScores.filter(s => s.riskCategory === 'high').length,
        upgradeEligible: creditScores.filter(s =>
            s.recommendedLimit > s.currentLimit && s.totalScore >= 60
        ).length
    }

    if (loading && !data) return <div className="h-40 glass-card animate-pulse" />
    if (!data) return null

    const renderCard = (title: string, current: number, previous: number, change: number, isCurrency: boolean = true) => {
        const isPositive = change > 0
        const isNeutral = change === 0
        const Arrow = isNeutral ? RefreshCw : (isPositive ? TrendingUp : TrendingUp) // Use same icon, rotate it

        return (
            <div className="glass-card p-4 border-l-4 border-l-brand-500/50">
                <p className="text-xs text-gray-400 uppercase font-bold mb-1">{title}</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-xl font-bold text-white">
                            {isCurrency ? formatCurrency(current) : current}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            vs {isCurrency ? formatCurrency(previous) : previous} last month
                        </p>
                    </div>
                    <div className={cn(
                        "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                        isNeutral ? "bg-gray-500/10 text-gray-400" :
                            isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    )}>
                        {Math.abs(change).toFixed(1)}%
                        <Arrow size={12} className={cn(
                            !isNeutral && (isPositive ? "" : "rotate-180")
                        )} />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Comparison Cards */}
            <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        This Month vs Last Month
                    </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {renderCard('Sales', data.sales.current, data.sales.previous, data.sales.change)}
                    {renderCard('Invoices', data.invoices.current, data.invoices.previous, data.invoices.change, false)}
                    {renderCard('Purchase', data.purchase.current, data.purchase.previous, data.purchase.change)}
                    {renderCard('Payments', data.payments.current, data.payments.previous, data.payments.change)}
                </div>
            </div>

            {/* Credit Intelligence Widget (New) */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Credit Intelligence</h3>
                    <button
                        onClick={() => navigate('/customers')}
                        className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
                    >
                        View All →
                    </button>
                </div>

                {creditLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-6 bg-dark-200 rounded animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">🟢 Low Risk</span>
                            <span className="font-semibold text-white">{riskBreakdown.low}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">🟡 Medium Risk</span>
                            <span className="font-semibold text-white">{riskBreakdown.medium}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">🔴 High Risk</span>
                            <span className="font-semibold text-red-400">{riskBreakdown.high}</span>
                        </div>

                        {riskBreakdown.upgradeEligible > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <div className="flex items-center gap-2 text-brand-400">
                                    <span className="text-2xl">⚡</span>
                                    <div>
                                        <div className="font-semibold text-sm">
                                            {riskBreakdown.upgradeEligible} eligible for upgrade
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            Credit limit increase recommended
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Mini Trend Chart */}
            <div className="glass-card p-5 flex flex-col">
                <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">6 Month Trend</h3>
                <div className="flex-1 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '8px' }}
                            />
                            <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} name="Sales" />
                            <Bar dataKey="purchase" fill="#ef4444" radius={[4, 4, 0, 0]} name="Purchase" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> Sales
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500" /> Purchase
                    </div>
                </div>
            </div>
        </div>
    )
}

// ============ MAIN DASHBOARD ============

export function DashboardPage() {
    const navigate = useNavigate()
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month')
    const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
    const [dashData, setDashData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshKey, setRefreshKey] = useState(0)
    const [creatingPO, setCreatingPO] = useState<string | null>(null)

    const handleRefresh = () => setRefreshKey(prev => prev + 1)

    async function handleAutoCreatePO(materialId: string, materialName: string) {
        try {
            setCreatingPO(materialId)
            const po = await autoCreatePOFromLowStock(materialId)
            toast.success(`✅ PO ${po.po_number} created for ${materialName}!`)
        } catch (error: any) {
            toast.error(error.message || 'Failed to create PO')
        } finally {
            setCreatingPO(null)
        }
    }

    // Auto-refresh every 60 seconds
    useEffect(() => {
        const interval = setInterval(handleRefresh, 60000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        loadDashboardData()
    }, [refreshKey, timeRange])

    const loadDashboardData = async () => {
        try {
            setLoading(true)
            const days = timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365
            const data = await getAllDashboardData(days)
            setKpis(data.kpis)
            setDashData(data)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleAlertClick = (alert: AlertItem) => {
        if (alert.type === 'low_stock') {
            navigate('/raw-materials')
        } else if (alert.type === 'expired' || alert.type === 'expiring') {
            navigate('/batches')
        } else if (alert.type === 'unpaid') {
            navigate('/invoices')
        } else if (alert.type === 'qc') {
            navigate('/quality-checks')
        }
    }

    const handleActivityClick = (act: any) => {
        if (act.type === 'order') {
            navigate('/sales')
        } else if (act.type === 'invoice') {
            navigate('/invoices')
        } else if (act.type === 'production') {
            navigate('/production')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Command Center</h2>
                    <p className="text-sm text-gray-500 dark:text-dark-500 mt-1">Welcome back! Here's your business overview.</p>
                </div>
                <div className="flex items-center gap-2">
                    {(['today', 'week', 'month', 'year'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                timeRange === range
                                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                                    : 'text-gray-500 dark:text-dark-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-200'
                            )}
                        >
                            {range.charAt(0).toUpperCase() + range.slice(1)}
                        </button>
                    ))}
                    <button
                        onClick={handleRefresh}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={cn('text-gray-500 dark:text-dark-500', loading && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* KPI Grid - 5 KPIs only (QC removed) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {loading ? (
                    [1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="glass-card p-5 animate-pulse">
                            <div className="h-4 bg-gray-100 dark:bg-dark-200 rounded w-2/3 mb-3" />
                            <div className="h-8 bg-gray-100 dark:bg-dark-200 rounded w-1/2" />
                        </div>
                    ))
                ) : kpis ? (
                    <>
                        <KPICard
                            title="Today's Sales"
                            value={kpis.todaySales}
                            format="currency"
                            icon={IndianRupee}
                            color="text-emerald-400"
                            bgColor="bg-emerald-400/10"
                            onClick={() => navigate('/invoices')}
                        />
                        <KPICard
                            title="Pending Invoices"
                            value={kpis.pendingInvoices}
                            format="number"
                            icon={FileText}
                            color="text-orange-400"
                            bgColor="bg-orange-400/10"
                            onClick={() => navigate('/invoices')}
                        />
                        <KPICard
                            title="Unpaid Amount"
                            value={kpis.unpaidAmount}
                            format="currency"
                            icon={IndianRupee}
                            color="text-red-400"
                            bgColor="bg-red-400/10"
                            alert={kpis.unpaidAmount > 0}
                            onClick={() => navigate('/invoices')}
                        />
                        <KPICard
                            title="Low Stock"
                            value={kpis.lowStockCount}
                            format="number"
                            icon={AlertTriangle}
                            color="text-amber-400"
                            bgColor="bg-amber-400/10"
                            alert={kpis.lowStockCount > 0}
                            onClick={() => navigate('/raw-materials')}
                        />
                        <KPICard
                            title="Expiring Soon"
                            value={kpis.expiringBatchesCount}
                            format="number"
                            icon={Calendar}
                            color="text-purple-400"
                            bgColor="bg-purple-400/10"
                            alert={kpis.expiringBatchesCount > 0}
                            onClick={() => navigate('/batches')}
                        />
                    </>
                ) : null}
            </div>

            {/* Comparison Section (E7) */}
            <ComparisonSection refreshTrigger={refreshKey} />

            {/* Alerts Panel */}
            {(dashData?.alerts?.length ?? 0) > 0 && (
                <div className="glass-card p-5">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle size={20} className="text-red-400" />
                        Alerts ({(dashData?.alerts ?? []).length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(dashData?.alerts ?? []).slice(0, 6).map((alert) => (
                            <div
                                key={alert.id}
                                onClick={() => handleAlertClick(alert)}
                                className={cn(
                                    'p-3 rounded-lg border flex items-start gap-3 cursor-pointer hover:opacity-80 transition-opacity',
                                    alert.severity === 'critical'
                                        ? 'bg-red-500/5 border-red-500/20'
                                        : alert.severity === 'warning'
                                            ? 'bg-amber-500/5 border-amber-500/20'
                                            : 'bg-emerald-500/5 border-emerald-500/20'
                                )}
                            >
                                <div className={cn(
                                    'w-2 h-2 rounded-full mt-1.5',
                                    alert.severity === 'critical'
                                        ? 'bg-red-400'
                                        : alert.severity === 'warning'
                                            ? 'bg-amber-400'
                                            : 'bg-emerald-400'
                                )} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white">{alert.title}</p>
                                    <p className="text-xs text-dark-500 truncate">{alert.description}</p>
                                    {alert.amount && (
                                        <p className="text-xs text-red-400 font-medium mt-1">
                                            {formatCurrency(alert.amount)}
                                        </p>
                                    )}
                                    {alert.date && (
                                        <p className="text-xs text-dark-600 mt-1">{formatDate(alert.date)}</p>
                                    )}
                                </div>
                                {alert.type === 'low_stock' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleAutoCreatePO(alert.id, alert.title.replace('Low Stock: ', ''))
                                        }}
                                        disabled={creatingPO === alert.id}
                                        title="Auto Create Purchase Order"
                                        className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-brand-500/20 text-brand-600 dark:text-brand-400 hover:bg-brand-500/30 transition-colors disabled:opacity-50"
                                    >
                                        {creatingPO === alert.id ? (
                                            <span>Creating...</span>
                                        ) : (
                                            <><ShoppingCart className="w-3 h-3" /> Create PO</>
                                        )}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Revenue Overview</h3>
                            <p className="text-sm text-dark-500 mt-0.5">Monthly revenue trend</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-brand-400" />
                                <span className="text-dark-500">Revenue</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                <span className="text-dark-500">Orders</span>
                            </div>
                        </div>
                    </div>
                    {(dashData?.salesChart ?? []).length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={dashData?.salesChart ?? []}>
                                <defs>
                                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                <XAxis dataKey="date" stroke="#52525b" fontSize={12} />
                                <YAxis stroke="#52525b" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#eab308"
                                    strokeWidth={2}
                                    fill="url(#revenueGrad)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[280px]">
                            <p className="text-sm text-dark-500">No revenue data yet</p>
                        </div>
                    )}
                </div>

                {/* Order Status Pie - Real Data */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-6">Order Status</h3>
                    {(dashData?.orderStatusDistribution ?? []).length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={dashData?.orderStatusDistribution ?? []}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {(dashData?.orderStatusDistribution ?? []).map((entry, index) => (
                                            <Cell key={index} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload?.[0]) {
                                                return (
                                                    <div className="glass-card p-2 border border-dark-300 text-xs">
                                                        <span className="text-white">{payload[0].name}: {payload[0].value}</span>
                                                    </div>
                                                )
                                            }
                                            return null
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {(dashData?.orderStatusDistribution ?? []).map((item) => (
                                    <div key={item.name} className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-xs text-dark-500">{item.name}</span>
                                        <span className="text-xs font-semibold text-white ml-auto">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-[200px]">
                            <p className="text-sm text-dark-500">No orders yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions - Full Width */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3">
                    {QUICK_ACTIONS.map((action) => (
                        <button
                            key={action.label}
                            onClick={() => navigate(action.path)}
                            title={action.label}
                            className={cn(
                                'flex flex-col items-center gap-2 p-3 rounded-xl border border-dark-300/50',
                                'hover:border-brand-500/30 hover:bg-dark-200/50 transition-all group'
                            )}
                        >
                            <div className={cn('p-2 rounded-lg', action.bg)}>
                                <action.icon size={18} className={action.color} />
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-dark-500 group-hover:text-white transition-colors text-center leading-tight hidden sm:block">
                                {action.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Bottom Row - 2 cols only now */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Products */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top 5 Products</h3>
                    {(dashData?.topProducts ?? []).length > 0 ? (
                        <div className="space-y-3">
                            {(dashData?.topProducts ?? []).slice(0, 5).map((product, index) => (
                                <div key={product.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-200/30 transition-colors">
                                    <span className="text-xs font-bold text-dark-500 w-5">#{index + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-dark-500">{product.units} units sold</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(product.revenue)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-40">
                            <p className="text-sm text-dark-500">No sales data yet</p>
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                        {loading ? (
                            [1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex items-start gap-3 p-2">
                                    <div className="w-7 h-7 bg-dark-200 rounded-lg animate-pulse" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-dark-200 rounded w-3/4 animate-pulse" />
                                        <div className="h-3 bg-dark-200 rounded w-1/2 animate-pulse" />
                                    </div>
                                </div>
                            ))
                        ) : (dashData?.recentActivity ?? []).length > 0 ? (
                            (dashData?.recentActivity ?? []).map((act) => (
                                <div
                                    key={act.id}
                                    onClick={() => handleActivityClick(act)}
                                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-dark-200/30 transition-colors cursor-pointer"
                                >
                                    <div className={cn(
                                        'p-1.5 rounded-lg mt-0.5',
                                        act.type === 'order' && 'bg-blue-400/10 text-blue-400',
                                        act.type === 'invoice' && 'bg-emerald-400/10 text-emerald-400',
                                        act.type === 'production' && 'bg-amber-400/10 text-amber-400',
                                    )}>
                                        {act.type === 'order' && <ShoppingCart size={14} />}
                                        {act.type === 'invoice' && <FileText size={14} />}
                                        {act.type === 'production' && <Factory size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 dark:text-white">{act.action}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-dark-500">{act.detail}</span>
                                            {act.amount && (
                                                <>
                                                    <span className="text-xs text-dark-600">•</span>
                                                    <span className="text-xs text-emerald-400">{formatCurrency(act.amount)}</span>
                                                </>
                                            )}
                                        </div>
                                        <p className="text-xs text-dark-600 mt-1">{formatDate(act.time)}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-dark-500 text-center py-4">No recent activity</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
