import { useState } from 'react'
import {
    TrendingUp,
    TrendingDown,
    Package,
    Users,
    ShoppingCart,
    IndianRupee,
    Warehouse,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Calendar,
    FileText,
    Factory,
    Truck,
} from 'lucide-react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
} from 'recharts'
import { cn, formatCurrency } from '@/lib/utils'

// ============ MOCK DATA (will be replaced with Supabase queries later) ============

const KPI_DATA = [
    {
        title: 'Total Revenue',
        value: 2847500,
        change: 12.5,
        trend: 'up' as const,
        icon: IndianRupee,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-400/10',
        format: 'currency',
    },
    {
        title: 'Total Orders',
        value: 156,
        change: 8.2,
        trend: 'up' as const,
        icon: ShoppingCart,
        color: 'text-blue-400',
        bgColor: 'bg-blue-400/10',
        format: 'number',
    },
    {
        title: 'Active Customers',
        value: 89,
        change: 5.1,
        trend: 'up' as const,
        icon: Users,
        color: 'text-purple-400',
        bgColor: 'bg-purple-400/10',
        format: 'number',
    },
    {
        title: 'Products',
        value: 47,
        change: -2.3,
        trend: 'down' as const,
        icon: Package,
        color: 'text-amber-400',
        bgColor: 'bg-amber-400/10',
        format: 'number',
    },
    {
        title: 'Low Stock Items',
        value: 8,
        change: 15.0,
        trend: 'up' as const,
        icon: AlertTriangle,
        color: 'text-red-400',
        bgColor: 'bg-red-400/10',
        format: 'number',
        alert: true,
    },
    {
        title: 'Pending Invoices',
        value: 534200,
        change: -3.7,
        trend: 'down' as const,
        icon: FileText,
        color: 'text-orange-400',
        bgColor: 'bg-orange-400/10',
        format: 'currency',
    },
]

const REVENUE_DATA = [
    { month: 'Jan', revenue: 180000, orders: 12 },
    { month: 'Feb', revenue: 220000, orders: 15 },
    { month: 'Mar', revenue: 195000, orders: 13 },
    { month: 'Apr', revenue: 310000, orders: 22 },
    { month: 'May', revenue: 280000, orders: 19 },
    { month: 'Jun', revenue: 350000, orders: 25 },
    { month: 'Jul', revenue: 290000, orders: 20 },
    { month: 'Aug', revenue: 420000, orders: 28 },
    { month: 'Sep', revenue: 380000, orders: 26 },
    { month: 'Oct', revenue: 450000, orders: 31 },
    { month: 'Nov', revenue: 410000, orders: 29 },
    { month: 'Dec', revenue: 485000, orders: 34 },
]

const ORDER_STATUS_DATA = [
    { name: 'Completed', value: 89, color: '#22c55e' },
    { name: 'Processing', value: 34, color: '#3b82f6' },
    { name: 'Pending', value: 18, color: '#eab308' },
    { name: 'Cancelled', value: 5, color: '#ef4444' },
]

const TOP_PRODUCTS = [
    { name: 'Ashwagandha Capsules', sold: 1250, revenue: 625000, growth: 15.2 },
    { name: 'Triphala Churna', sold: 980, revenue: 294000, growth: 8.7 },
    { name: 'Brahmi Tablets', sold: 756, revenue: 453600, growth: 22.1 },
    { name: 'Chyawanprash Special', sold: 620, revenue: 496000, growth: -3.4 },
    { name: 'Giloy Juice', sold: 540, revenue: 162000, growth: 11.8 },
]

const RECENT_ACTIVITY = [
    { id: 1, action: 'New order #ORD-2024-156 placed', user: 'Rajesh Kumar', time: '5 min ago', type: 'order', icon: ShoppingCart },
    { id: 2, action: 'Invoice #INV-2024-089 generated', user: 'System', time: '12 min ago', type: 'invoice', icon: FileText },
    { id: 3, action: 'Production batch #B-2024-034 completed', user: 'Amit Singh', time: '25 min ago', type: 'production', icon: Factory },
    { id: 4, action: 'Low stock alert: Ashwagandha Root', user: 'System', time: '1 hr ago', type: 'alert', icon: AlertTriangle },
    { id: 5, action: 'Purchase order #PO-2024-067 received', user: 'Priya Sharma', time: '2 hr ago', type: 'purchase', icon: Truck },
    { id: 6, action: 'New customer registered: Wellness Store', user: 'Rajesh Kumar', time: '3 hr ago', type: 'customer', icon: Users },
]

const QUICK_ACTIONS = [
    { label: 'New Sale Order', icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-400/10', path: '/sales' },
    { label: 'Create Invoice', icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-400/10', path: '/invoices' },
    { label: 'Add Product', icon: Package, color: 'text-purple-400', bg: 'bg-purple-400/10', path: '/products' },
    { label: 'New Purchase', icon: Truck, color: 'text-orange-400', bg: 'bg-orange-400/10', path: '/purchase' },
    { label: 'Start Production', icon: Factory, color: 'text-amber-400', bg: 'bg-amber-400/10', path: '/production' },
    { label: 'View Reports', icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-400/10', path: '/reports' },
]

// ============ COMPONENTS ============

function KPICard({ item }: { item: typeof KPI_DATA[0] }) {
    return (
        <div className={cn(
            'glass-card p-5 hover:border-dark-200 transition-all duration-300 group cursor-pointer',
            item.alert && 'border-red-500/30 hover:border-red-500/50'
        )}>
            <div className="flex items-start justify-between">
                <div className="space-y-3">
                    <p className="text-sm text-dark-500 font-medium">{item.title}</p>
                    <p className="text-2xl font-bold text-white">
                        {item.format === 'currency' ? formatCurrency(item.value) : item.value.toLocaleString('en-IN')}
                    </p>
                    <div className="flex items-center gap-1.5">
                        {item.trend === 'up' ? (
                            <ArrowUpRight size={14} className={item.alert ? 'text-red-400' : 'text-emerald-400'} />
                        ) : (
                            <ArrowDownRight size={14} className="text-red-400" />
                        )}
                        <span className={cn(
                            'text-xs font-semibold',
                            item.trend === 'up' && !item.alert ? 'text-emerald-400' : 'text-red-400'
                        )}>
                            {item.change}%
                        </span>
                        <span className="text-xs text-dark-600">vs last month</span>
                    </div>
                </div>
                <div className={cn('p-3 rounded-xl', item.bgColor)}>
                    <item.icon size={22} className={item.color} />
                </div>
            </div>
        </div>
    )
}

function CustomTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card p-3 border border-dark-300">
                <p className="text-sm font-semibold text-white">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-xs text-dark-500 mt-1">
                        {entry.name}: {entry.name === 'revenue' ? formatCurrency(entry.value) : entry.value}
                    </p>
                ))}
            </div>
        )
    }
    return null
}

// ============ MAIN DASHBOARD ============

export function DashboardPage() {
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month')

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Command Center</h2>
                    <p className="text-sm text-dark-500 mt-1">Welcome back! Here's your business overview.</p>
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
                                    : 'text-dark-500 hover:text-white hover:bg-dark-200'
                            )}
                        >
                            {range.charAt(0).toUpperCase() + range.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {KPI_DATA.map((item) => (
                    <KPICard key={item.title} item={item} />
                ))}
            </div>

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
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={REVENUE_DATA}>
                            <defs>
                                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis dataKey="month" stroke="#52525b" fontSize={12} />
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
                </div>

                {/* Order Status Pie */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-6">Order Status</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={ORDER_STATUS_DATA}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={80}
                                paddingAngle={4}
                                dataKey="value"
                            >
                                {ORDER_STATUS_DATA.map((entry, index) => (
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
                        {ORDER_STATUS_DATA.map((item) => (
                            <div key={item.name} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-xs text-dark-500">{item.name}</span>
                                <span className="text-xs font-semibold text-white ml-auto">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {QUICK_ACTIONS.map((action) => (
                            <button
                                key={action.label}
                                className={cn(
                                    'flex flex-col items-center gap-2 p-4 rounded-xl border border-dark-300/50',
                                    'hover:border-brand-500/30 hover:bg-dark-200/50 transition-all group'
                                )}
                            >
                                <div className={cn('p-2 rounded-lg', action.bg)}>
                                    <action.icon size={18} className={action.color} />
                                </div>
                                <span className="text-xs text-dark-500 group-hover:text-white transition-colors text-center">
                                    {action.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Top Products */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Top Products</h3>
                    <div className="space-y-3">
                        {TOP_PRODUCTS.map((product, index) => (
                            <div key={product.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-200/30 transition-colors">
                                <span className="text-xs font-bold text-dark-500 w-5">#{index + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{product.name}</p>
                                    <p className="text-xs text-dark-500">{product.sold} units sold</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-white">{formatCurrency(product.revenue)}</p>
                                    <p className={cn(
                                        'text-xs font-medium',
                                        product.growth > 0 ? 'text-emerald-400' : 'text-red-400'
                                    )}>
                                        {product.growth > 0 ? '+' : ''}{product.growth}%
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                        {RECENT_ACTIVITY.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-dark-200/30 transition-colors">
                                <div className={cn(
                                    'p-1.5 rounded-lg mt-0.5',
                                    activity.type === 'order' && 'bg-blue-400/10 text-blue-400',
                                    activity.type === 'invoice' && 'bg-emerald-400/10 text-emerald-400',
                                    activity.type === 'production' && 'bg-amber-400/10 text-amber-400',
                                    activity.type === 'alert' && 'bg-red-400/10 text-red-400',
                                    activity.type === 'purchase' && 'bg-orange-400/10 text-orange-400',
                                    activity.type === 'customer' && 'bg-purple-400/10 text-purple-400',
                                )}>
                                    <activity.icon size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white">{activity.action}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-dark-500">{activity.user}</span>
                                        <span className="text-xs text-dark-600">•</span>
                                        <span className="text-xs text-dark-600">{activity.time}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}