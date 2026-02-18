import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Search, Download, X, Save, TrendingUp, ChevronLeft, ChevronRight,
    AlertCircle, Warehouse, Package, AlertTriangle, Calendar,
    IndianRupee, ArrowUpCircle, ArrowDownCircle, RefreshCw,
    Clock, XCircle, CheckCircle, Filter, History,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
    getInventory, getStockMovements, addStock, adjustStock, getInventoryStats,
    type InventoryItem, type StockMovement, type AddStockFormData, EMPTY_STOCK_FORM,
} from '@/services/inventoryService'

// ============ EXPIRY BADGE ============
function ExpiryBadge({ days }: { days: number | null }) {
    if (days === null) return <span className="text-xs text-gray-400 dark:text-dark-600">No expiry</span>
    if (days < 0) return <Badge variant="danger" dot>Expired</Badge>
    if (days <= 30) return <Badge variant="danger" dot>{days}d left</Badge>
    if (days <= 90) return <Badge variant="warning" dot>{days}d left</Badge>
    return <Badge variant="success" dot>{days}d left</Badge>
}

// ============ MOVEMENT ICON ============
function MovementIcon({ type }: { type: string }) {
    const config: Record<string, { icon: any; color: string }> = {
        in: { icon: ArrowUpCircle, color: 'text-emerald-400' },
        out: { icon: ArrowDownCircle, color: 'text-red-400' },
        adjustment: { icon: RefreshCw, color: 'text-amber-400' },
        transfer: { icon: RefreshCw, color: 'text-blue-400' },
        production: { icon: Package, color: 'text-purple-400' },
        return: { icon: ArrowUpCircle, color: 'text-cyan-400' },
    }
    const c = config[type] || { icon: RefreshCw, color: 'text-gray-500 dark:text-dark-500' }
    return <c.icon size={16} className={c.color} />
}

// ============ STOCK DETAIL PANEL ============
function StockDetail({ item, onClose, onAdjust }: {
    item: InventoryItem; onClose: () => void; onAdjust: () => void
}) {
    const [movements, setMovements] = useState<StockMovement[]>([])
    const [loadingMovements, setLoadingMovements] = useState(true)

    useEffect(() => { loadMovements() }, [item.product_id])

    const loadMovements = async () => {
        try {
            setLoadingMovements(true)
            const result = await getStockMovements({ page: 1, pageSize: 20 }, { productId: item.product_id })
            setMovements(result.data)
        } catch { } finally { setLoadingMovements(false) }
    }

    return (
        <div className="glass-card h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-300/50">
                <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
                        item.days_to_expiry !== null && (item.days_to_expiry ?? 999) <= 30
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-orange-500/10 text-orange-400')}>
                        <Warehouse size={20} />
                    </div>
                    <div>
                        <h2 className="font-semibold text-white">{item.product_name}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 dark:text-dark-500">{item.product_sku}</span>
                            {item.batch_number && <Badge variant="default">{item.batch_number}</Badge>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={onAdjust} icon={<RefreshCw size={14} />} title="Adjust Stock">Adjust</Button>
                    <button onClick={onClose} className="p-2 rounded-lg text-gray-500 dark:text-dark-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-200" title="Close"><X size={16} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Stock Summary */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-100 dark:bg-dark-200/20 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-gray-500 dark:text-dark-500 uppercase">Total Qty</p>
                        <p className="text-xl font-bold text-white mt-1">{item.quantity}</p>
                    </div>
                    <div className="bg-dark-200/20 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-dark-500 uppercase">Available</p>
                        <p className="text-xl font-bold text-emerald-400 mt-1">{item.available_quantity}</p>
                    </div>
                    <div className="bg-dark-200/20 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-dark-500 uppercase">Reserved</p>
                        <p className="text-xl font-bold text-amber-400 mt-1">{item.reserved_quantity}</p>
                    </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Unit Cost', value: formatCurrency(item.unit_cost), icon: IndianRupee },
                        { label: 'Total Value', value: formatCurrency(item.quantity * item.unit_cost), icon: IndianRupee },
                        { label: 'Mfg Date', value: item.manufacturing_date ? formatDate(item.manufacturing_date) : '-', icon: Calendar },
                        { label: 'Expiry', value: item.expiry_date ? formatDate(item.expiry_date) : '-', icon: Calendar },
                        { label: 'Location', value: item.warehouse_location || 'Main', icon: Warehouse },
                        { label: 'Status', value: item.status, icon: CheckCircle },
                    ].map(d => (
                        <div key={d.label} className="space-y-1">
                            <div className="flex items-center gap-1.5 text-gray-400 dark:text-dark-600">
                                <d.icon size={12} /><span className="text-[10px] uppercase tracking-wider">{d.label}</span>
                            </div>
                            <p className="text-sm text-white">{d.value}</p>
                        </div>
                    ))}
                </div>

                {/* Expiry Alert */}
                {item.days_to_expiry !== null && (item.days_to_expiry ?? 999) <= 90 && (
                    <div className={cn('rounded-xl p-4 flex items-start gap-3',
                        (item.days_to_expiry ?? 999) < 0 ? 'bg-red-500/10 border border-red-500/20' :
                            (item.days_to_expiry ?? 999) <= 30 ? 'bg-red-500/5 border border-red-500/20' :
                                'bg-amber-500/5 border border-amber-500/20')}>
                        <AlertTriangle size={18} className={(item.days_to_expiry ?? 999) <= 30 ? 'text-red-400' : 'text-amber-400'} />
                        <div>
                            <p className="text-sm font-medium text-white">
                                {(item.days_to_expiry ?? 999) < 0 ? 'EXPIRED' : `Expiring in ${item.days_to_expiry} days`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-dark-500 mt-0.5">
                                {(item.days_to_expiry ?? 999) < 0 ? 'Remove from saleable stock immediately' : 'Consider FEFO allocation for upcoming orders'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Movement History */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <History size={14} className="text-orange-400" />
                        <p className="text-sm font-semibold text-white">Movement History</p>
                    </div>
                    {loadingMovements ? (
                        <div className="animate-pulse space-y-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-dark-200 rounded-lg" />)}
                        </div>
                    ) : movements.length === 0 ? (
                        <p className="text-xs text-dark-500 text-center py-4">No movements recorded</p>
                    ) : (
                        <div className="space-y-2">
                            {movements.slice(0, 10).map(m => (
                                <div key={m.id} className="flex items-center gap-3 bg-dark-200/20 rounded-lg p-2.5">
                                    <MovementIcon type={m.movement_type} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-white capitalize">{m.movement_type}</span>
                                            <span className={cn('text-xs font-mono font-bold',
                                                m.movement_type === 'in' || m.movement_type === 'return' ? 'text-emerald-400' : 'text-red-400')}>
                                                {m.movement_type === 'in' || m.movement_type === 'return' ? '+' : '-'}{Math.abs(m.quantity)}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-dark-500 truncate">{m.notes || m.reference_type || '-'}</p>
                                    </div>
                                    <span className="text-[10px] text-dark-600">{formatDate(m.created_at)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ============ MAIN PAGE ============
export function InventoryPage() {
    const { user } = useAuthStore()
    const [items, setItems] = useState<InventoryItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [expiryFilter, setExpiryFilter] = useState<number | null>(null)
    const [showLowStock, setShowLowStock] = useState(false)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock')
    const pageSize = 25

    // Modals
    const [showAddStock, setShowAddStock] = useState(false)
    const [showAdjust, setShowAdjust] = useState(false)
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
    const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
    const [adjustQty, setAdjustQty] = useState('')
    const [adjustReason, setAdjustReason] = useState('')
    const [formData, setFormData] = useState<AddStockFormData>(EMPTY_STOCK_FORM)
    const [products, setProducts] = useState<{ value: string; label: string; sku?: string }[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [stats, setStats] = useState({ totalBatches: 0, totalQuantity: 0, totalValue: 0, lowStock: 0, expiring30: 0, expiring90: 0, expired: 0 })

    // Movements
    const [movements, setMovements] = useState<StockMovement[]>([])
    const [movementType, setMovementType] = useState('all')
    const [movementPage, setMovementPage] = useState(1)

    const fetchProducts = async () => {
        const { data } = await supabase.from('products').select('id, name, sku').eq('status', 'active').order('name')
        setProducts((data || []).map((p: any) => ({ value: p.id, label: p.name, sku: p.sku })))
    }

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getInventory({ page, pageSize }, {
                    status: statusFilter, search,
                    expiringDays: expiryFilter || undefined,
                    lowStock: showLowStock,
                }),
                getInventoryStats(),
            ])
            setItems(result.data)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
        } catch (err: any) { toast.error(err.message) }
        finally { setIsLoading(false) }
    }, [page, statusFilter, search, expiryFilter, showLowStock])

    const fetchMovements = useCallback(async () => {
        try {
            const result = await getStockMovements({ page: movementPage, pageSize }, { type: movementType })
            setMovements(result.data)
        } catch { }
    }, [movementPage, movementType])

    useEffect(() => { fetchData(); fetchProducts() }, [fetchData])
    useEffect(() => { if (activeTab === 'movements') fetchMovements() }, [activeTab, fetchMovements])
    useEffect(() => { const t = setTimeout(() => { setPage(1); fetchData() }, 300); return () => clearTimeout(t) }, [search])

    const handleAddStock = async () => {
        if (!formData.product_id) { toast.error('Select product'); return }
        if (!formData.quantity || formData.quantity <= 0) { toast.error('Enter quantity'); return }
        try {
            setIsSaving(true)
            await addStock(formData, user?.id)
            toast.success('Stock added!')
            setShowAddStock(false); setFormData(EMPTY_STOCK_FORM); fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const handleAdjust = async () => {
        if (!adjustItem) return
        const qty = Number(adjustQty)
        if (isNaN(qty) || qty < 0) { toast.error('Enter valid quantity'); return }
        if (!adjustReason) { toast.error('Enter reason'); return }
        try {
            setIsSaving(true)
            await adjustStock(adjustItem.id, adjustItem.product_id, qty, adjustReason, user?.id)
            toast.success('Stock adjusted!')
            setShowAdjust(false); setAdjustItem(null); setAdjustQty(''); setAdjustReason('')
            if (selectedItem?.id === adjustItem.id) setSelectedItem(null)
            fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const openAdjust = (item: InventoryItem) => {
        setAdjustItem(item); setAdjustQty(String(item.quantity)); setAdjustReason(''); setShowAdjust(true)
    }

    const updateForm = (field: keyof AddStockFormData, value: any) => setFormData(p => ({ ...p, [field]: value }))

    return (
        <div className="space-y-6">
            <PageHeader title="Stock"
                description={`${stats.totalBatches} batches • Value: ${formatCurrency(stats.totalValue)}`}
                actions={<div className="flex items-center gap-3">
                    <Button variant="secondary" icon={<Download size={16} />} size="sm">Export</Button>
                    <Button icon={<Plus size={16} />} onClick={() => setShowAddStock(true)}>Add Stock</Button>
                </div>} />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                    { label: 'Batches', value: stats.totalBatches, color: 'text-orange-400' },
                    { label: 'Total Qty', value: stats.totalQuantity.toLocaleString(), color: 'text-white' },
                    { label: 'Stock Value', value: formatCurrency(stats.totalValue), color: 'text-orange-400' },
                    { label: 'Low Stock', value: stats.lowStock, color: 'text-amber-400', alert: stats.lowStock > 0 },
                    { label: 'Expiring 30d', value: stats.expiring30, color: 'text-red-400', alert: stats.expiring30 > 0 },
                    { label: 'Expiring 90d', value: stats.expiring90, color: 'text-amber-400' },
                    { label: 'Expired', value: stats.expired, color: 'text-red-400', alert: stats.expired > 0 },
                ].map(k => (
                    <div key={k.label} className={cn('glass-card p-3', k.alert && 'border-red-500/30')}>
                        <p className="text-[10px] text-dark-500 uppercase">{k.label}</p>
                        <p className={cn('text-lg font-bold mt-0.5', k.color)}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 border-b border-dark-300/30">
                {[
                    { key: 'stock', label: 'Stock', icon: Warehouse },
                    { key: 'movements', label: 'Movements', icon: History },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                        className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px',
                            activeTab === tab.key ? 'border-orange-500 text-orange-400' : 'border-transparent text-dark-500 hover:text-white')}>
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'stock' && (
                <>
                    {/* Filters */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex-1 max-w-md">
                            <Input placeholder="Search product, SKU, batch..." value={search}
                                onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
                        </div>
                        <button onClick={() => { setShowLowStock(!showLowStock); setPage(1) }}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all',
                                showLowStock ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                            <AlertTriangle size={12} /> Low Stock
                        </button>
                        {[30, 90].map(d => (
                            <button key={d} onClick={() => { setExpiryFilter(expiryFilter === d ? null : d); setPage(1) }}
                                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all',
                                    expiryFilter === d ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                                <Clock size={12} /> Expiry {d}d
                            </button>
                        ))}
                        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                            options={[
                                { value: 'all', label: 'All Status' },
                                { value: 'available', label: 'Available' },
                                { value: 'reserved', label: 'Reserved' },
                                { value: 'expired', label: 'Expired' },
                                { value: 'quarantine', label: 'Quarantine' },
                            ]} />
                    </div>

                    {/* Split View */}
                    <div className={cn('flex gap-6', selectedItem ? 'items-start' : '')}>
                        <div className={cn('transition-all duration-300', selectedItem ? 'w-1/2' : 'w-full')}>
                            {isLoading ? (
                                <div className="glass-card p-8"><div className="animate-pulse space-y-3">
                                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-dark-200 rounded-lg" />)}
                                </div></div>
                            ) : items.length === 0 ? (
                                <EmptyState icon={<Warehouse size={48} />} title="No stock"
                                    description="Add stock to get started" actionLabel="Add Stock" onAction={() => setShowAddStock(true)} />
                            ) : (
                                <div className="glass-card overflow-hidden">
                                    <table className="w-full">
                                        <thead><tr className="border-b border-dark-300/50">
                                            {['Product', 'Batch', 'Qty', 'Available', 'Cost', 'Value', 'Expiry', ''].map(h => (
                                                <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                            ))}
                                        </tr></thead>
                                        <tbody className="divide-y divide-dark-300/30">
                                            {items.map(item => (
                                                <tr key={item.id} onClick={() => setSelectedItem(item)}
                                                    className={cn('hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                        selectedItem?.id === item.id && 'bg-orange-500/5 border-l-2 border-orange-500',
                                                        item.days_to_expiry !== null && (item.days_to_expiry ?? 999) <= 0 && 'bg-red-500/5')}>
                                                    <td className="px-3 py-3">
                                                        <p className="text-sm font-medium text-white">{item.product_name}</p>
                                                        <p className="text-xs text-dark-500">{item.product_sku}</p>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <Badge variant="default">{item.batch_number || 'N/A'}</Badge>
                                                    </td>
                                                    <td className="px-3 py-3 text-sm font-mono text-white">{item.quantity}</td>
                                                    <td className="px-3 py-3">
                                                        <span className={cn('text-sm font-mono font-semibold',
                                                            item.available_quantity > 0 ? 'text-emerald-400' : 'text-red-400')}>
                                                            {item.available_quantity}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-sm font-mono text-dark-500">{formatCurrency(item.unit_cost)}</td>
                                                    <td className="px-3 py-3 text-sm font-mono text-orange-400">{formatCurrency(item.quantity * item.unit_cost)}</td>
                                                    <td className="px-3 py-3"><ExpiryBadge days={item.days_to_expiry ?? null} /></td>
                                                    <td className="px-3 py-3 flex items-center gap-1">
                                                        <button title="View History" onClick={(e) => { e.stopPropagation(); setSelectedItem(item) }}
                                                            className="p-1.5 rounded-lg text-dark-500 hover:text-cyan-400 hover:bg-dark-200"><History size={14} /></button>
                                                        <button title="Adjust Stock" onClick={(e) => { e.stopPropagation(); openAdjust(item) }}
                                                            className="p-1.5 rounded-lg text-dark-500 hover:text-amber-400 hover:bg-dark-200"><TrendingUp size={14} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-xs text-dark-500">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}</p>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)} icon={<ChevronLeft size={16} />}>Prev</Button>
                                        <span className="text-sm text-dark-500">{page}/{totalPages}</span>
                                        <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={16} /></Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {selectedItem && (
                            <div className="w-1/2 sticky top-20">
                                <StockDetail item={selectedItem}
                                    onClose={() => setSelectedItem(null)}
                                    onAdjust={() => openAdjust(selectedItem)} />
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Movements Tab */}
            {activeTab === 'movements' && (
                <>
                    <div className="flex items-center gap-3">
                        {['all', 'in', 'out', 'adjustment', 'production', 'return'].map(t => (
                            <button key={t} onClick={() => { setMovementType(t); setMovementPage(1); fetchMovements() }}
                                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                    movementType === t ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="glass-card overflow-hidden">
                        <table className="w-full">
                            <thead><tr className="border-b border-dark-300/50">
                                {['Type', 'Product', 'Batch', 'Quantity', 'Reference', 'Notes', 'Date'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-dark-300/30">
                                {movements.map(m => (
                                    <tr key={m.id} className="hover:bg-dark-200/30">
                                        <td className="px-4 py-3"><div className="flex items-center gap-2">
                                            <MovementIcon type={m.movement_type} />
                                            <span className="text-sm text-white capitalize">{m.movement_type}</span>
                                        </div></td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm text-white">{m.product_name}</p>
                                            <p className="text-xs text-dark-500">{m.product_sku}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-dark-500">{m.batch_number || '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn('text-sm font-mono font-bold',
                                                m.quantity > 0 ? 'text-emerald-400' : 'text-red-400')}>
                                                {m.quantity > 0 ? '+' : ''}{m.quantity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-dark-500">{m.reference_type || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-dark-500 max-w-[200px] truncate">{m.notes || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-dark-500">{formatDate(m.created_at)}</td>
                                    </tr>
                                ))}
                                {movements.length === 0 && (
                                    <tr><td colSpan={7} className="px-4 py-8 text-center text-dark-500">No movements found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Add Stock Modal */}
            <Modal isOpen={showAddStock} onClose={() => setShowAddStock(false)} title="Add Stock" size="md"
                footer={<>
                    <Button variant="secondary" onClick={() => setShowAddStock(false)}>Cancel</Button>
                    <Button onClick={handleAddStock} isLoading={isSaving} icon={<Save size={16} />}>Add Stock</Button>
                </>}>
                <div className="space-y-4">
                    <Select label="Product *" value={formData.product_id}
                        onChange={(e) => updateForm('product_id', e.target.value)}
                        options={products} placeholder="Select product" />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Batch Number" value={formData.batch_number}
                            onChange={(e) => updateForm('batch_number', e.target.value.toUpperCase())} placeholder="e.g. B-2024-001" />
                        <Input label="Quantity *" type="number" value={formData.quantity}
                            onChange={(e) => updateForm('quantity', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Mfg Date" type="date" value={formData.manufacturing_date}
                            onChange={(e) => updateForm('manufacturing_date', e.target.value)} />
                        <Input label="Expiry Date" type="date" value={formData.expiry_date}
                            onChange={(e) => updateForm('expiry_date', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Unit Cost (₹)" type="number" value={formData.unit_cost}
                            onChange={(e) => updateForm('unit_cost', e.target.value)} icon={<IndianRupee size={14} />} />
                        <Input label="Location" value={formData.warehouse_location}
                            onChange={(e) => updateForm('warehouse_location', e.target.value)} placeholder="e.g. Rack A-1" />
                    </div>
                    <Textarea label="Notes" value={formData.notes}
                        onChange={(e) => updateForm('notes', e.target.value)} rows={2} />
                </div>
            </Modal>

            {/* Adjust Stock Modal */}
            <Modal isOpen={showAdjust} onClose={() => { setShowAdjust(false); setAdjustItem(null) }}
                title="Adjust Stock" description={adjustItem ? `${adjustItem.product_name} - ${adjustItem.batch_number || 'No batch'}` : ''} size="sm"
                footer={<>
                    <Button variant="secondary" onClick={() => { setShowAdjust(false); setAdjustItem(null) }}>Cancel</Button>
                    <Button onClick={handleAdjust} isLoading={isSaving} icon={<Save size={16} />}>Adjust</Button>
                </>}>
                <div className="space-y-4">
                    <div className="bg-dark-200/20 rounded-lg p-3 flex justify-between">
                        <span className="text-sm text-dark-500">Current Qty</span>
                        <span className="text-sm font-bold text-white">{adjustItem?.quantity}</span>
                    </div>
                    <Input label="New Quantity *" type="number" value={adjustQty}
                        onChange={(e) => setAdjustQty(e.target.value)} />
                    <Textarea label="Reason *" value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)} placeholder="Why adjusting?" rows={2} />
                </div>
            </Modal>
        </div>
    )
}