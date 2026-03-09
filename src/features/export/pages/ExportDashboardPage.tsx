import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    DollarSign,
    ClipboardList,
    Ship,
    FileText,
    TrendingUp,
    Package,
    Globe,
    AlertTriangle,
} from 'lucide-react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportKPICard } from '../components/ExportKPICards'
import { CountryFlag } from '../components/CountryFlag'
import { LUTStatusBadge } from '../components/LUTStatusBadge'
import { formatUSD, formatINR } from '@/lib/utils'
import { toast } from 'sonner'
import {
    getExportDashboardStats,
    getTopExportBuyers,
    getMonthlyExportTrend,
    getOrdersByStatusCount,
    getShipmentsInTransit,
    getPendingDocuments,
} from '../services/exportService'
import type { ExportDashboardStats, TopExportBuyer, MonthlyExportTrend, OrderStatusCount, ShipmentInTransit, PendingDocument } from '../types/export.types'

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export function ExportDashboardPage() {
    const navigate = useNavigate()
    const [stats, setStats] = useState<ExportDashboardStats | null>(null)
    const [topBuyers, setTopBuyers] = useState<TopExportBuyer[]>([])
    const [monthlyTrend, setMonthlyTrend] = useState<MonthlyExportTrend[]>([])
    const [ordersByStatus, setOrdersByStatus] = useState<OrderStatusCount[]>([])
    const [shipmentsInTransit, setShipmentsInTransit] = useState<ShipmentInTransit[]>([])
    const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>([])
    const [loading, setLoading] = useState(true)

    const loadData = async () => {
        try {
            setLoading(true)
            const [statsRes, buyersRes, trendRes, statusRes, shipmentsRes, docsRes] = await Promise.all([
                getExportDashboardStats(),
                getTopExportBuyers(5),
                getMonthlyExportTrend(12),
                getOrdersByStatusCount(),
                getShipmentsInTransit(),
                getPendingDocuments(),
            ])
            setStats(statsRes)
            setTopBuyers(buyersRes)
            setMonthlyTrend(trendRes)
            setOrdersByStatus(statusRes)
            setShipmentsInTransit(shipmentsRes)
            setPendingDocs(docsRes)
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to load dashboard')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-10 w-48 bg-gray-200 dark:bg-dark-200 rounded-lg animate-pulse" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 bg-gray-200 dark:bg-dark-200 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    const lutArn = import.meta.env.VITE_LUT_ARN || ''
    const lutValidTill = import.meta.env.VITE_LUT_VALID_TILL || ''

    return (
        <div className="space-y-6">
            <PageHeader
                title="Export Dashboard"
                description="International trade overview"
            />

            {/* Row 1 - 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ExportKPICard
                    icon={DollarSign}
                    title="Total Export Revenue"
                    value={formatUSD(stats?.totalRevenueUSD ?? 0)}
                    subtitle={stats ? formatINR(stats.totalRevenueINR) : ''}
                    color="text-blue-400"
                />
                <ExportKPICard
                    icon={ClipboardList}
                    title="Active Orders"
                    value={stats?.activeOrdersCount ?? 0}
                    color="text-emerald-400"
                />
                <ExportKPICard
                    icon={Ship}
                    title="Shipments In Transit"
                    value={stats?.shipmentsInTransitCount ?? 0}
                    color="text-purple-400"
                />
                <ExportKPICard
                    icon={DollarSign}
                    title="Pending Payments"
                    value={formatUSD(stats?.pendingPaymentsAmount ?? 0)}
                    subtitle={stats && stats.overduePaymentsAmount > 0 ? `Overdue: ${formatUSD(stats.overduePaymentsAmount)}` : ''}
                    color={stats && stats.overduePaymentsAmount > 0 ? 'text-red-400' : 'text-amber-400'}
                />
            </div>

            {/* Row 2 - 2 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ExportKPICard
                    icon={TrendingUp}
                    title="Net Forex Gain/Loss"
                    value={formatINR(stats?.netForexGainLoss ?? 0)}
                    color={(stats?.netForexGainLoss ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}
                />
                <div className="glass-card p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-dark-500 font-medium">Documents Status</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                {stats?.documentsReadyCount ?? 0}/{stats?.documentsTotalCount ?? 0} ready
                            </p>
                            <div className="mt-2 h-2 bg-gray-200 dark:bg-dark-300 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all"
                                    style={{
                                        width: `${stats?.documentsTotalCount ? (stats.documentsReadyCount / stats.documentsTotalCount) * 100 : 0}%`,
                                    }}
                                />
                            </div>
                        </div>
                        <FileText size={22} className="text-blue-400" />
                    </div>
                </div>
            </div>

            {/* Row 3 - Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 glass-card p-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                        Monthly Export Revenue (USD)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyTrend.map((m) => ({ ...m, name: m.month.slice(0, 7) }))}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-dark-300" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                                <Tooltip formatter={(v: number) => [formatUSD(v), 'Revenue']} />
                                <Bar dataKey="revenue_usd" fill="#3b82f6" name="Revenue" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="lg:col-span-2 glass-card p-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                        Orders by Status
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={ordersByStatus}
                                    dataKey="count"
                                    nameKey="status"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    label={({ status, count }) => `${status}: ${count}`}
                                >
                                    {ordersByStatus.map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 4 - Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card overflow-hidden">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white p-4 border-b border-gray-200 dark:border-dark-300">
                        Top 5 Buyers
                    </h3>
                    {topBuyers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-dark-500 text-sm">
                            No data yet
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-dark-200">
                                    <th className="px-4 py-2 text-left">Company</th>
                                    <th className="px-4 py-2 text-left">Country</th>
                                    <th className="px-4 py-2 text-left">Orders</th>
                                    <th className="px-4 py-2 text-right">Total USD</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topBuyers.map((b) => (
                                    <tr
                                        key={b.customer_id}
                                        className="border-t border-gray-200 dark:border-dark-300 hover:bg-gray-50 dark:hover:bg-dark-200/30 cursor-pointer"
                                        onClick={() => navigate('/export/orders')}
                                    >
                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                                            {b.company_name}
                                        </td>
                                        <td className="px-4 py-2">
                                            <CountryFlag country={b.country} className="mr-1" />
                                            {b.country}
                                        </td>
                                        <td className="px-4 py-2">{b.total_orders}</td>
                                        <td className="px-4 py-2 text-right font-mono">
                                            {formatUSD(b.total_revenue_usd)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="glass-card overflow-hidden">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white p-4 border-b border-gray-200 dark:border-dark-300">
                        Shipments In Transit
                    </h3>
                    {shipmentsInTransit.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-dark-500 text-sm">
                            No shipments in transit
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-dark-200">
                                    <th className="px-4 py-2 text-left">Shipment</th>
                                    <th className="px-4 py-2 text-left">Mode</th>
                                    <th className="px-4 py-2 text-left">Vessel/Flight</th>
                                    <th className="px-4 py-2 text-left">ETD → ETA</th>
                                    <th className="px-4 py-2 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shipmentsInTransit.map((s) => (
                                    <tr
                                        key={s.id}
                                        className="border-t border-gray-200 dark:border-dark-300 hover:bg-gray-50 dark:hover:bg-dark-200/30 cursor-pointer"
                                        onClick={() => navigate('/export/shipments')}
                                    >
                                        <td className="px-4 py-2 font-mono text-blue-400">{s.shipment_number}</td>
                                        <td className="px-4 py-2">
                                            {s.shipment_mode === 'SEA' ? '🚢' : '✈️'}
                                        </td>
                                        <td className="px-4 py-2">{s.vessel_or_flight || '-'}</td>
                                        <td className="px-4 py-2">
                                            {s.etd ? new Date(s.etd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}
                                            {' → '}
                                            {s.eta ? new Date(s.eta).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}
                                        </td>
                                        <td className="px-4 py-2">{s.status.replace('_', ' ')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Row 5 - Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-400" />
                        Pending Documents
                    </h3>
                    {pendingDocs.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-dark-500">All documents ready</p>
                    ) : (
                        <ul className="space-y-2">
                            {pendingDocs.slice(0, 10).map((d, i) => (
                                <li key={i} className="flex justify-between text-sm">
                                    <span className="text-gray-900 dark:text-white">{d.order_number}</span>
                                    <span className="text-gray-500 dark:text-dark-500">{d.document_name}</span>
                                    <span className="text-amber-400">{d.status.replace('_', ' ')}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {lutArn && lutValidTill && (
                    <div className="glass-card p-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <Globe size={16} className="text-blue-400" />
                            LUT Status
                        </h3>
                        <LUTStatusBadge arn={lutArn} validTill={lutValidTill} />
                    </div>
                )}
            </div>
        </div>
    )
}
