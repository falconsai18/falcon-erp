import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Search, Download, Trash2, X, Save, ChevronLeft, ChevronRight,
    AlertCircle, Factory, Package, Check, ArrowRight, Minus,
    Calendar, FlaskConical, Layers, Play, CheckCircle, ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
    getBOMs, getBOMById, getBOMsForProduct, createBOM, deleteBOM,
    getProductionOrders, getProductionOrderById, createProductionOrder,
    updateProductionStatus, completeProduction, deleteProductionOrder,
    getProductionStats, PROD_STEPS,
    type BOM, type BOMItem, type ProductionOrder, type BOMFormData,
    type ProdOrderFormData, EMPTY_BOM_FORM, EMPTY_PROD_FORM,
} from '@/services/productionService'

// ============ PROGRESS BAR ============
function ProdProgress({ current }: { current: string }) {
    const currentIndex = PROD_STEPS.indexOf(current)
    if (current === 'cancelled') return <div className="flex items-center gap-2"><X size={16} className="text-red-400" /><span className="text-sm text-red-400">Cancelled</span></div>
    if (current === 'on_hold') return <div className="flex items-center gap-2"><AlertCircle size={16} className="text-amber-400" /><span className="text-sm text-amber-400">On Hold</span></div>

    return (
        <div className="flex items-center gap-1 w-full">
            {PROD_STEPS.map((step, index) => (
                <div key={step} className="flex items-center flex-1">
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                        index <= currentIndex ? 'bg-purple-500 text-white' : 'bg-dark-300 text-dark-500',
                        index === currentIndex && 'ring-2 ring-purple-500/30')}>
                        {index <= currentIndex ? <Check size={12} /> : index + 1}
                    </div>
                    {index < PROD_STEPS.length - 1 && (
                        <div className={cn('flex-1 h-0.5 mx-1', index < currentIndex ? 'bg-purple-500' : 'bg-dark-300')} />
                    )}
                </div>
            ))}
        </div>
    )
}

// ============ ORDER DETAIL ============
function ProdOrderDetail({ orderId, onClose, onRefresh }: {
    orderId: string; onClose: () => void; onRefresh: () => void
}) {
    const { user } = useAuthStore()
    const [order, setOrder] = useState<ProductionOrder | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [showComplete, setShowComplete] = useState(false)
    const [actualQty, setActualQty] = useState('')

    useEffect(() => { loadOrder() }, [orderId])

    const loadOrder = async () => {
        try { setLoading(true); setOrder(await getProductionOrderById(orderId)) }
        catch (err: any) { toast.error(err.message) } finally { setLoading(false) }
    }

    const handleStatus = async (status: string) => {
        try { setUpdating(true); await updateProductionStatus(orderId, status); toast.success(`Status: ${status}!`); loadOrder(); onRefresh() }
        catch (err: any) { toast.error(err.message) } finally { setUpdating(false) }
    }

    const handleComplete = async () => {
        const qty = Number(actualQty)
        if (!qty || qty <= 0) { toast.error('Enter actual quantity'); return }
        try {
            setUpdating(true)
            await completeProduction(orderId, qty, user?.id)
            toast.success('Production completed! Stock added to inventory.')
            setShowComplete(false); loadOrder(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    if (loading) return <div className="glass-card p-8"><div className="animate-pulse space-y-4">
        <div className="h-6 bg-dark-200 rounded w-1/3" /><div className="h-32 bg-dark-200 rounded" /></div></div>

    if (!order) return null

    return (
        <div className="glass-card h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-dark-300/50">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-white">{order.order_number}</h2>
                        <StatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-dark-500 mt-1">{order.product_name}</p>
                </div>
                <div className="flex items-center gap-2">
                    {order.status === 'planned' && (
                        <Button size="sm" onClick={() => handleStatus('in_progress')} isLoading={updating} icon={<Play size={14} />}>Start</Button>
                    )}
                    {order.status === 'in_progress' && (
                        <Button size="sm" onClick={() => setShowComplete(true)} icon={<CheckCircle size={14} />}>Complete</Button>
                    )}
                    {order.status === 'planned' && (
                        <Button size="sm" variant="danger" onClick={() => handleStatus('cancelled')} isLoading={updating}>Cancel</Button>
                    )}
                    <button onClick={onClose} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200"><X size={16} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Complete Modal Inline */}
                {showComplete && (
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-semibold text-white">Complete Production</p>
                        <p className="text-xs text-dark-500">Planned: {order.planned_quantity} units</p>
                        <div className="flex gap-2">
                            <Input type="number" value={actualQty} onChange={(e) => setActualQty(e.target.value)}
                                placeholder="Actual quantity produced" label="Actual Quantity *" />
                        </div>
                        <p className="text-[10px] text-dark-600">This will: Deduct raw materials • Add finished goods to inventory • Log movement</p>
                        <div className="flex gap-2">
                            <Button onClick={handleComplete} isLoading={updating} icon={<CheckCircle size={14} />}>Complete & Add to Inventory</Button>
                            <Button variant="ghost" onClick={() => setShowComplete(false)}>Cancel</Button>
                        </div>
                    </div>
                )}

                <div className="bg-dark-200/20 rounded-xl p-4">
                    <p className="text-xs text-dark-500 mb-3 uppercase tracking-wider">Production Progress</p>
                    <ProdProgress current={order.status} />
                    <div className="flex justify-between mt-2">
                        {PROD_STEPS.map(s => <span key={s} className="text-[9px] text-dark-600 capitalize">{s.replace('_', ' ')}</span>)}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Product', value: order.product_name, icon: Package },
                        { label: 'Batch', value: order.batch_number || '-', icon: Layers },
                        { label: 'Planned Qty', value: order.planned_quantity, icon: ClipboardList },
                        { label: 'Actual Qty', value: order.actual_quantity || '-', icon: CheckCircle },
                        { label: 'Start Date', value: order.start_date ? formatDate(order.start_date) : '-', icon: Calendar },
                        { label: 'End Date', value: order.end_date ? formatDate(order.end_date) : '-', icon: Calendar },
                    ].map(d => (
                        <div key={d.label} className="space-y-1">
                            <div className="flex items-center gap-1.5 text-dark-600"><d.icon size={12} /><span className="text-[10px] uppercase tracking-wider">{d.label}</span></div>
                            <p className="text-sm text-white">{d.value}</p>
                        </div>
                    ))}
                </div>

                {/* Materials */}
                <div>
                    <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <FlaskConical size={14} className="text-purple-400" /> Required Materials
                    </p>
                    <div className="space-y-2">
                        {order.materials?.map((mat, idx) => {
                            const sufficient = (mat.current_stock || 0) >= mat.planned_quantity
                            return (
                                <div key={mat.id || idx} className={cn('bg-dark-200/20 rounded-lg p-3',
                                    !sufficient && order.status !== 'completed' && 'border border-red-500/20')}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-white">{mat.material_name}</p>
                                            <p className="text-xs text-dark-500">{mat.material_code}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-mono text-purple-400">{mat.planned_quantity} {mat.unit_of_measure}</p>
                                            {order.status === 'completed' && (
                                                <p className="text-xs text-emerald-400">Used: {mat.actual_quantity}</p>
                                            )}
                                        </div>
                                    </div>
                                    {order.status !== 'completed' && (
                                        <div className="flex items-center justify-between mt-2 text-xs">
                                            <span className="text-dark-500">In Stock: {mat.current_stock} {mat.unit_of_measure}</span>
                                            {sufficient
                                                ? <Badge variant="success">Sufficient</Badge>
                                                : <Badge variant="danger">Insufficient</Badge>
                                            }
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        {(!order.materials || order.materials.length === 0) && (
                            <p className="text-xs text-dark-500 text-center py-4">No materials linked</p>
                        )}
                    </div>
                </div>

                {order.notes && (
                    <div className="space-y-1">
                        <p className="text-[10px] text-dark-600 uppercase">Notes</p>
                        <p className="text-sm text-dark-500 bg-dark-200/20 p-3 rounded-lg">{order.notes}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ============ MAIN PAGE ============
export function ProductionPage() {
    const { user } = useAuthStore()
    const [activeTab, setActiveTab] = useState<'orders' | 'bom'>('orders')

    // Orders state
    const [orders, setOrders] = useState<ProductionOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 25
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
    const [stats, setStats] = useState({ total: 0, planned: 0, inProgress: 0, completed: 0, totalPlanned: 0, totalProduced: 0 })

    // BOM state
    const [boms, setBoms] = useState<BOM[]>([])
    const [bomLoading, setBomLoading] = useState(true)

    // Modals
    const [showCreateOrder, setShowCreateOrder] = useState(false)
    const [showCreateBOM, setShowCreateBOM] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [deletingOrder, setDeletingOrder] = useState<ProductionOrder | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Create Order Form
    const [orderForm, setOrderForm] = useState<ProdOrderFormData>(EMPTY_PROD_FORM)
    const [products, setProducts] = useState<any[]>([])
    const [productBOMs, setProductBOMs] = useState<BOM[]>([])
    const [isSaving, setIsSaving] = useState(false)

    // BOM Form
    const [bomForm, setBomForm] = useState<BOMFormData>(EMPTY_BOM_FORM)
    const [allProducts, setAllProducts] = useState<{ value: string; label: string }[]>([])
    const [allMaterials, setAllMaterials] = useState<any[]>([])
    const [materialSearch, setMaterialSearch] = useState('')

    const loadProducts = async () => {
        const { data } = await supabase.from('products').select('id, name, sku').eq('status', 'active').order('name')
        setProducts(data || [])
        setAllProducts((data || []).map((p: any) => ({ value: p.id, label: p.name })))
    }

    const loadMaterials = async () => {
        const { data } = await supabase.from('raw_materials').select('id, name, code, unit_of_measure, current_stock').eq('status', 'active').order('name')
        setAllMaterials(data || [])
    }

    const fetchOrders = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getProductionOrders({ page, pageSize }, { status: statusFilter, search }),
                getProductionStats(),
            ])
            setOrders(result.data)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
        } catch (err: any) { toast.error(err.message) }
        finally { setIsLoading(false) }
    }, [page, statusFilter, search])

    const fetchBOMs = useCallback(async () => {
        try { setBomLoading(true); const r = await getBOMs({ page: 1, pageSize: 100 }); setBoms(r.data) }
        catch { } finally { setBomLoading(false) }
    }, [])

    useEffect(() => { fetchOrders(); loadProducts(); loadMaterials() }, [fetchOrders])
    useEffect(() => { if (activeTab === 'bom') fetchBOMs() }, [activeTab, fetchBOMs])
    useEffect(() => { const t = setTimeout(() => { setPage(1); fetchOrders() }, 300); return () => clearTimeout(t) }, [search])

    // When product selected for order, load its BOMs
    useEffect(() => {
        if (orderForm.product_id) {
            getBOMsForProduct(orderForm.product_id).then(setProductBOMs).catch(() => setProductBOMs([]))
        } else {
            setProductBOMs([])
        }
    }, [orderForm.product_id])

    const handleCreateOrder = async () => {
        if (!orderForm.product_id) { toast.error('Select product'); return }
        if (!orderForm.bom_id) { toast.error('Select BOM/Recipe'); return }
        if (!orderForm.planned_quantity || orderForm.planned_quantity <= 0) { toast.error('Enter quantity'); return }
        try {
            setIsSaving(true)
            await createProductionOrder(orderForm, orderForm.bom_id, user?.id)
            toast.success('Production order created!')
            setShowCreateOrder(false); setOrderForm(EMPTY_PROD_FORM); fetchOrders()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const handleCreateBOM = async () => {
        if (!bomForm.product_id) { toast.error('Select product'); return }
        if (!bomForm.name) { toast.error('Enter recipe name'); return }
        if (bomForm.items.length === 0) { toast.error('Add materials'); return }
        try {
            setIsSaving(true)
            await createBOM(bomForm)
            toast.success('Recipe/BOM created!')
            setShowCreateBOM(false); setBomForm(EMPTY_BOM_FORM); fetchBOMs()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const addBOMMaterial = (mat: any) => {
        if (bomForm.items.find(i => i.raw_material_id === mat.id)) { toast.error('Already added'); return }
        setBomForm(p => ({
            ...p,
            items: [...p.items, {
                raw_material_id: mat.id, quantity: 1, unit_of_measure: mat.unit_of_measure || 'KG',
                wastage_percent: 0, notes: null, material_name: mat.name, material_code: mat.code,
            }]
        }))
    }

    const handleDelete = async () => {
        if (!deletingOrder) return
        try {
            setIsDeleting(true); await deleteProductionOrder(deletingOrder.id)
            toast.success('Deleted!'); setIsDeleteModalOpen(false); setDeletingOrder(null)
            if (selectedOrderId === deletingOrder.id) setSelectedOrderId(null); fetchOrders()
        } catch (err: any) { toast.error(err.message) } finally { setIsDeleting(false) }
    }

    const filteredMaterials = allMaterials.filter(m =>
        m.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
        (m.code || '').toLowerCase().includes(materialSearch.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <PageHeader title="Production"
                description={`${stats.total} orders • Produced: ${stats.totalProduced} units`}
                actions={<div className="flex items-center gap-3">
                    <Button variant="secondary" icon={<Layers size={16} />} onClick={() => { setShowCreateBOM(true); setActiveTab('bom') }}>New Recipe</Button>
                    <Button icon={<Plus size={16} />} onClick={() => setShowCreateOrder(true)}>New Production</Button>
                </div>} />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Total Orders', value: stats.total, color: 'text-purple-400' },
                    { label: 'Planned', value: stats.planned, color: 'text-dark-500' },
                    { label: 'In Progress', value: stats.inProgress, color: 'text-blue-400', alert: stats.inProgress > 0 },
                    { label: 'Completed', value: stats.completed, color: 'text-emerald-400' },
                    { label: 'Planned Qty', value: stats.totalPlanned, color: 'text-purple-400' },
                    { label: 'Produced', value: stats.totalProduced, color: 'text-emerald-400' },
                ].map(k => (
                    <div key={k.label} className={cn('glass-card p-3', k.alert && 'border-purple-500/30')}>
                        <p className="text-[10px] text-dark-500 uppercase">{k.label}</p>
                        <p className={cn('text-lg font-bold mt-0.5', k.color)}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 border-b border-dark-300/30">
                {[
                    { key: 'orders', label: 'Production Orders', icon: Factory },
                    { key: 'bom', label: 'Recipes / BOM', icon: Layers },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                        className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px',
                            activeTab === tab.key ? 'border-purple-500 text-purple-400' : 'border-transparent text-dark-500 hover:text-white')}>
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
                <>
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 max-w-md">
                            <Input placeholder="Search orders..." value={search}
                                onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
                        </div>
                        <div className="flex items-center gap-2">
                            {['all', ...PROD_STEPS, 'cancelled', 'on_hold'].map(s => (
                                <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                                    className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                        statusFilter === s ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                                    {s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={cn('flex gap-6', selectedOrderId ? 'items-start' : '')}>
                        <div className={cn('transition-all duration-300', selectedOrderId ? 'w-1/2' : 'w-full')}>
                            {isLoading ? (
                                <div className="glass-card p-8"><div className="animate-pulse space-y-3">
                                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-dark-200 rounded-lg" />)}
                                </div></div>
                            ) : orders.length === 0 ? (
                                <EmptyState icon={<Factory size={48} />} title="No production orders"
                                    description="Create a recipe first, then start production" actionLabel="New Production" onAction={() => setShowCreateOrder(true)} />
                            ) : (
                                <div className="glass-card overflow-hidden">
                                    <table className="w-full">
                                        <thead><tr className="border-b border-dark-300/50">
                                            {['Order', 'Product', 'Batch', 'Planned', 'Actual', 'Status', ''].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                            ))}
                                        </tr></thead>
                                        <tbody className="divide-y divide-dark-300/30">
                                            {orders.map(o => (
                                                <tr key={o.id} onClick={() => setSelectedOrderId(o.id)}
                                                    className={cn('hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                        selectedOrderId === o.id && 'bg-purple-500/5 border-l-2 border-purple-500')}>
                                                    <td className="px-4 py-3"><p className="text-sm font-medium text-purple-400 font-mono">{o.order_number}</p></td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm text-white">{o.product_name}</p>
                                                        <p className="text-xs text-dark-500">{o.product_sku}</p>
                                                    </td>
                                                    <td className="px-4 py-3">{o.batch_number ? <Badge variant="default">{o.batch_number}</Badge> : <span className="text-dark-600">-</span>}</td>
                                                    <td className="px-4 py-3 text-sm font-mono text-white">{o.planned_quantity}</td>
                                                    <td className="px-4 py-3 text-sm font-mono text-emerald-400">{o.actual_quantity || '-'}</td>
                                                    <td className="px-4 py-3"><StatusBadge status={o.status === 'in_progress' ? 'processing' : o.status} /></td>
                                                    <td className="px-4 py-3">
                                                        {o.status === 'planned' && (
                                                            <button onClick={(e) => { e.stopPropagation(); setDeletingOrder(o); setIsDeleteModalOpen(true) }}
                                                                className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-dark-200"><Trash2 size={14} /></button>
                                                        )}
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

                        {selectedOrderId && (
                            <div className="w-1/2 sticky top-20">
                                <ProdOrderDetail orderId={selectedOrderId}
                                    onClose={() => setSelectedOrderId(null)} onRefresh={fetchOrders} />
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* BOM TAB */}
            {activeTab === 'bom' && (
                <>
                    {bomLoading ? (
                        <div className="glass-card p-8"><div className="animate-pulse space-y-3">
                            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-dark-200 rounded-lg" />)}
                        </div></div>
                    ) : boms.length === 0 ? (
                        <EmptyState icon={<Layers size={48} />} title="No recipes / BOM"
                            description="Create a recipe to define raw materials needed for each product"
                            actionLabel="Create Recipe" onAction={() => setShowCreateBOM(true)} />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {boms.map(bom => (
                                <div key={bom.id} className="glass-card p-4 group relative hover:border-purple-500/30 transition-all">
                                    <button onClick={() => deleteBOM(bom.id).then(() => { toast.success('Deleted'); fetchBOMs() })}
                                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-dark-200 text-dark-500 hover:text-red-400">
                                        <Trash2 size={14} />
                                    </button>
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                                            <Layers size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-white">{bom.name}</h3>
                                            <p className="text-xs text-dark-500">{bom.product_name} • v{bom.version}</p>
                                            <p className="text-xs text-dark-500 mt-1">Batch: {bom.batch_size} {bom.batch_unit}</p>
                                            {bom.is_active && <Badge variant="success" className="mt-2">Active</Badge>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* CREATE ORDER MODAL */}
            <Modal isOpen={showCreateOrder} onClose={() => setShowCreateOrder(false)} title="New Production Order" size="md"
                footer={<>
                    <Button variant="secondary" onClick={() => setShowCreateOrder(false)}>Cancel</Button>
                    <Button onClick={handleCreateOrder} isLoading={isSaving} icon={<Save size={16} />}>Create</Button>
                </>}>
                <div className="space-y-4">
                    <Select label="Product *" value={orderForm.product_id}
                        onChange={(e) => setOrderForm(p => ({ ...p, product_id: e.target.value, bom_id: '' }))}
                        options={allProducts} placeholder="Select product to manufacture" />

                    {orderForm.product_id && (
                        productBOMs.length === 0 ? (
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-400">
                                No recipe found for this product. Create a recipe first.
                            </div>
                        ) : (
                            <Select label="Recipe / BOM *" value={orderForm.bom_id}
                                onChange={(e) => setOrderForm(p => ({ ...p, bom_id: e.target.value }))}
                                options={productBOMs.map(b => ({ value: b.id, label: `${b.name} (v${b.version}) - Batch: ${b.batch_size}` }))}
                                placeholder="Select recipe" />
                        )
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Quantity to Produce *" type="number" value={orderForm.planned_quantity}
                            onChange={(e) => setOrderForm(p => ({ ...p, planned_quantity: Number(e.target.value) }))} />
                        <Input label="Batch Number" value={orderForm.batch_number}
                            onChange={(e) => setOrderForm(p => ({ ...p, batch_number: e.target.value.toUpperCase() }))} placeholder="e.g. B-2024-001" />
                    </div>
                    <Input label="Start Date" type="date" value={orderForm.start_date}
                        onChange={(e) => setOrderForm(p => ({ ...p, start_date: e.target.value }))} />
                    <Textarea label="Notes" value={orderForm.notes}
                        onChange={(e) => setOrderForm(p => ({ ...p, notes: e.target.value }))} rows={2} />

                    {orderForm.bom_id && productBOMs.length > 0 && (
                        <div className="bg-dark-200/20 rounded-lg p-3">
                            <p className="text-xs text-dark-500 mb-2 uppercase">Materials Required (auto-calculated)</p>
                            {(() => {
                                const bom = productBOMs.find(b => b.id === orderForm.bom_id)
                                if (!bom || !bom.items) return null
                                const multiplier = (orderForm.planned_quantity || 0) / (bom.batch_size || 1)
                                return bom.items.map((item, idx) => {
                                    const needed = Math.round(item.quantity * multiplier * (1 + (item.wastage_percent || 0) / 100) * 1000) / 1000
                                    const sufficient = (item.current_stock || 0) >= needed
                                    return (
                                        <div key={idx} className="flex items-center justify-between py-1.5 border-b border-dark-300/20 last:border-0">
                                            <span className="text-sm text-white">{item.material_name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-dark-500">Stock: {item.current_stock}</span>
                                                <span className="text-sm font-mono text-purple-400">{needed} {item.unit_of_measure}</span>
                                                {sufficient ? <CheckCircle size={14} className="text-emerald-400" /> : <AlertCircle size={14} className="text-red-400" />}
                                            </div>
                                        </div>
                                    )
                                })
                            })()}
                        </div>
                    )}
                </div>
            </Modal>

            {/* CREATE BOM MODAL */}
            <Modal isOpen={showCreateBOM} onClose={() => setShowCreateBOM(false)} title="Create Recipe / BOM" size="lg"
                footer={<>
                    <Button variant="secondary" onClick={() => setShowCreateBOM(false)}>Cancel</Button>
                    <Button onClick={handleCreateBOM} isLoading={isSaving} icon={<Save size={16} />}>Create Recipe</Button>
                </>}>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Product *" value={bomForm.product_id}
                            onChange={(e) => setBomForm(p => ({ ...p, product_id: e.target.value }))}
                            options={allProducts} placeholder="Select product" />
                        <Input label="Recipe Name *" value={bomForm.name}
                            onChange={(e) => setBomForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Ashwagandha Caps Standard" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Input label="Batch Size" type="number" value={bomForm.batch_size}
                            onChange={(e) => setBomForm(p => ({ ...p, batch_size: Number(e.target.value) }))} />
                        <Select label="Batch Unit" value={bomForm.batch_unit}
                            onChange={(e) => setBomForm(p => ({ ...p, batch_unit: e.target.value }))}
                            options={[{ value: 'PCS', label: 'Pieces' }, { value: 'KG', label: 'KG' }, { value: 'LTR', label: 'Litre' }, { value: 'BOX', label: 'Box' }]} />
                        <Input label="Version" value={bomForm.version}
                            onChange={(e) => setBomForm(p => ({ ...p, version: e.target.value }))} />
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-white mb-2">Raw Materials</p>
                        <Input placeholder="Search materials..." value={materialSearch}
                            onChange={(e) => setMaterialSearch(e.target.value)} icon={<Search size={16} />} />
                        <div className="max-h-36 overflow-y-auto space-y-1 border border-dark-300/30 rounded-lg p-2 mt-2">
                            {filteredMaterials.slice(0, 15).map(m => (
                                <button key={m.id} onClick={() => addBOMMaterial(m)}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-dark-200/50 text-left">
                                    <div><p className="text-sm text-white">{m.name}</p><p className="text-xs text-dark-500">{m.code} • {m.unit_of_measure}</p></div>
                                    <Plus size={14} className="text-dark-500" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {bomForm.items.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-white">Added ({bomForm.items.length})</p>
                            {bomForm.items.map((item, idx) => (
                                <div key={idx} className="bg-dark-200/20 rounded-lg p-3">
                                    <div className="flex items-start justify-between mb-2">
                                        <div><p className="text-sm text-white">{item.material_name}</p><p className="text-xs text-dark-500">{item.material_code}</p></div>
                                        <button onClick={() => setBomForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
                                            className="p-1 text-dark-500 hover:text-red-400"><Minus size={14} /></button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input label="Qty per batch" type="number" value={item.quantity}
                                            onChange={(e) => { const items = [...bomForm.items]; items[idx] = { ...items[idx], quantity: Number(e.target.value) }; setBomForm(p => ({ ...p, items })) }} />
                                        <Select label="Unit" value={item.unit_of_measure}
                                            onChange={(e) => { const items = [...bomForm.items]; items[idx] = { ...items[idx], unit_of_measure: e.target.value }; setBomForm(p => ({ ...p, items })) }}
                                            options={[{ value: 'KG', label: 'KG' }, { value: 'GM', label: 'GM' }, { value: 'LTR', label: 'LTR' }, { value: 'ML', label: 'ML' }, { value: 'PCS', label: 'PCS' }]} />
                                        <Input label="Wastage %" type="number" value={item.wastage_percent}
                                            onChange={(e) => { const items = [...bomForm.items]; items[idx] = { ...items[idx], wastage_percent: Number(e.target.value) }; setBomForm(p => ({ ...p, items })) }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <Textarea label="Notes" value={bomForm.notes}
                        onChange={(e) => setBomForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>
            </Modal>

            {/* Delete Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setDeletingOrder(null) }}
                title="Delete Production Order" size="sm"
                footer={<>
                    <Button variant="secondary" onClick={() => { setIsDeleteModalOpen(false); setDeletingOrder(null) }}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
                </>}>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                    <AlertCircle size={20} className="text-red-400 mt-0.5" />
                    <p className="text-sm text-white">Delete <strong>{deletingOrder?.order_number}</strong>?</p>
                </div>
            </Modal>
        </div>
    )
}