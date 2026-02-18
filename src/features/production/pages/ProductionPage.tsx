import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Search, Download, Trash2, X, Save, ChevronLeft, ChevronRight,
    AlertCircle, Factory, Package, Check, ArrowRight, Minus,
    Calendar, FlaskConical, Layers, Play, CheckCircle, ClipboardList,
    BarChart3, LayoutList,
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
    getWorkOrders, getWorkOrderById, createWorkOrder,
    updateWorkOrderStatus, completeWorkOrder, deleteWorkOrder,
    getWorkOrderStats, getFormulationsForWO,
    type WorkOrder, type WorkOrderFormData, WO_STATUSES, EMPTY_WO_FORM,
} from '@/services/workOrderService'
import { getFormulationIngredients } from '@/services/formulationService'

// Manufacturing 2.0 Components
import { ProductionKPIs } from '@/features/production/components/ProductionKPIs'
import { GanttChart } from '@/features/production/components/GanttChart'
import { ScrapButton } from '@/features/production/components/ScrapModal'

// ============ PROGRESS BAR ============
function ProdProgress({ current }: { current: string }) {
    const steps = WO_STATUSES.map(s => s.value).filter(v => v !== 'cancelled')
    const currentIndex = steps.indexOf(current)
    if (current === 'cancelled') return <div className="flex items-center gap-2"><X size={16} className="text-red-400" /><span className="text-sm text-red-400">Cancelled</span></div>

    return (
        <div className="flex items-center gap-1 w-full">
            {steps.map((step, index) => (
                <div key={step} className="flex items-center flex-1">
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                        index <= currentIndex ? 'bg-purple-500 text-white' : 'bg-dark-300 text-dark-500',
                        index === currentIndex && 'ring-2 ring-purple-500/30')}>
                        {index <= currentIndex ? <Check size={12} /> : index + 1}
                    </div>
                    {index < steps.length - 1 && (
                        <div className={cn('flex-1 h-0.5 mx-1', index < currentIndex ? 'bg-purple-500' : 'bg-dark-300')} />
                    )}
                </div>
            ))}
        </div>
    )
}

// ============ ORDER PROGRESS (%) ============
function OrderProgressBar({ order }: { order: WorkOrder }) {
    const completion = order.status === 'completed' ? 100 :
        (order.actual_quantity && order.batch_size) 
            ? Math.min(100, Math.round((order.actual_quantity / order.batch_size) * 100))
            : 0

    let barColor = 'bg-blue-500'
    if (order.status === 'completed') barColor = 'bg-emerald-500'
    else if (completion > 75) barColor = 'bg-amber-500'

    const today = new Date()
    const endDate = order.planned_end_date ? new Date(order.planned_end_date) : null
    const isDelayed = endDate && endDate < today && order.status !== 'completed'

    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-dark-300 rounded-full overflow-hidden">
                <div 
                    className={cn('h-full rounded-full transition-all duration-500', barColor)}
                    style={{ width: `${completion}%` }}
                />
            </div>
            <span className={cn('text-[10px] font-medium min-w-[32px]', isDelayed ? 'text-red-400' : 'text-dark-500')}>
                {completion}%
            </span>
            {isDelayed && <AlertCircle size={12} className="text-red-400" />}
        </div>
    )
}

// ============ ORDER DETAIL ============
function ProdOrderDetail({ orderId, onClose, onRefresh }: {
    orderId: string; onClose: () => void; onRefresh: () => void
}) {
    const { user } = useAuthStore()
    const [order, setOrder] = useState<WorkOrder | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [showComplete, setShowComplete] = useState(false)
    const [actualQty, setActualQty] = useState('')

    useEffect(() => { loadOrder() }, [orderId])

    const loadOrder = async () => {
        try { setLoading(true); setOrder(await getWorkOrderById(orderId)) }
        catch (err: any) { toast.error(err.message) } finally { setLoading(false) }
    }

    const handleStatus = async (status: string) => {
        try { setUpdating(true); await updateWorkOrderStatus(orderId, status); toast.success(`Status: ${status}!`); loadOrder(); onRefresh() }
        catch (err: any) { toast.error(err.message) } finally { setUpdating(false) }
    }

    const handleComplete = async () => {
        const qty = Number(actualQty)
        if (!qty || qty <= 0) { toast.error('Enter actual quantity'); return }
        try {
            setUpdating(true)
            const yieldPercent = Math.round((qty / (order?.batch_size || 1)) * 100)
            await completeWorkOrder(orderId, qty, yieldPercent, order?.batch_number || `B-${new Date().getTime()}`, user?.id)
            toast.success('Work order completed! Stock added to inventory.')
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
                        <h2 className="font-semibold text-white">{order.work_order_number}</h2>
                        <Badge variant={WO_STATUSES.find(s => s.value === order.status)?.color as any || 'default'}>
                            {WO_STATUSES.find(s => s.value === order.status)?.label || order.status}
                        </Badge>
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
                    {(order.status === 'in_progress' || order.status === 'material_issued') && (
                        <ScrapButton workOrder={order} onScrapRecorded={loadOrder} />
                    )}
                    <button title="Close" onClick={onClose} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200"><X size={16} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {showComplete && (
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-semibold text-white">Complete Work Order</p>
                        <p className="text-xs text-dark-500">Planned: {order.batch_size} units</p>
                        <div className="flex gap-2">
                            <Input type="number" value={actualQty} onChange={(e) => setActualQty(e.target.value)}
                                placeholder="Actual quantity produced" label="Actual Quantity *" />
                        </div>
                        <p className="text-[10px] text-dark-600">This will: Deduct raw materials • Add finished goods to inventory • Generate Batch record</p>
                        <div className="flex gap-2">
                            <Button onClick={handleComplete} isLoading={updating} icon={<CheckCircle size={14} />}>Complete & Produce</Button>
                            <Button variant="ghost" onClick={() => setShowComplete(false)}>Cancel</Button>
                        </div>
                    </div>
                )}

                <div className="bg-dark-200/20 rounded-xl p-4">
                    <p className="text-xs text-dark-500 mb-3 uppercase tracking-wider">Manufacturing Progress</p>
                    <ProdProgress current={order.status} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Product', value: order.product_name, icon: Package },
                        { label: 'Batch #', value: order.batch_number || '-', icon: Layers },
                        { label: 'Batch Size', value: order.batch_size, icon: ClipboardList },
                        { label: 'Produced', value: order.actual_quantity || '-', icon: CheckCircle },
                        { label: 'Planned Start', value: formatDate(order.planned_start_date), icon: Calendar },
                        { label: 'Planned End', value: order.planned_end_date ? formatDate(order.planned_end_date) : '-', icon: Calendar },
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
                        <FlaskConical size={14} className="text-purple-400" /> Material Requirements
                    </p>
                    <div className="space-y-2">
                        {order.materials?.map((mat, idx) => (
                            <div key={mat.id || idx} className="bg-dark-200/20 rounded-lg p-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-white">{mat.product_name}</p>
                                        <p className="text-xs text-dark-500">{mat.product_sku}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-mono text-purple-400">{mat.required_quantity}</p>
                                        {mat.issued_quantity > 0 && <p className="text-xs text-emerald-400">Issued: {mat.issued_quantity}</p>}
                                    </div>
                                </div>
                            </div>
                        ))}
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
    const [activeTab, setActiveTab] = useState<'orders' | 'formulations' | 'schedule'>('orders')

    // Orders state
    const [orders, setOrders] = useState<WorkOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 25
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
    const [stats, setStats] = useState({ total: 0, planned: 0, inProgress: 0, completed: 0 })

    // Modals
    const [showCreateOrder, setShowCreateOrder] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [deletingOrder, setDeletingOrder] = useState<WorkOrder | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const [orderForm, setOrderForm] = useState<WorkOrderFormData>(EMPTY_WO_FORM)
    const [formulations, setFormulations] = useState<any[]>([])
    const [selectedFormulationIngredients, setSelectedFormulationIngredients] = useState<any[]>([])
    const [isSaving, setIsSaving] = useState(false)

    const fetchOrders = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getWorkOrders({ page, pageSize }, { status: statusFilter, search }),
                getWorkOrderStats(),
            ])
            setOrders(result.data)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
        } catch (err: any) { toast.error(err.message) }
        finally { setIsLoading(false) }
    }, [page, statusFilter, search])

    const loadDropdowns = async () => {
        try {
            const forms = await getFormulationsForWO()
            setFormulations(forms)
        } catch (err: any) { toast.error(err.message) }
    }

    useEffect(() => { fetchOrders(); loadDropdowns() }, [fetchOrders])
    useEffect(() => { const t = setTimeout(() => { setPage(1); fetchOrders() }, 300); return () => clearTimeout(t) }, [search])

    // When formulation selected, load its ingredients for stock check
    useEffect(() => {
        if (orderForm.formulation_id) {
            getFormulationIngredients(orderForm.formulation_id)
                .then(setSelectedFormulationIngredients)
                .catch(() => setSelectedFormulationIngredients([]))
        } else {
            setSelectedFormulationIngredients([])
        }
    }, [orderForm.formulation_id])

    const handleCreateOrder = async () => {
        if (!orderForm.formulation_id) { toast.error('Select formulation'); return }
        if (!orderForm.batch_size || orderForm.batch_size <= 0) { toast.error('Enter batch size'); return }
        try {
            setIsSaving(true)
            await createWorkOrder(orderForm, user?.id)
            toast.success('Work order created!')
            setShowCreateOrder(false); setOrderForm(EMPTY_WO_FORM); fetchOrders()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const handleDelete = async () => {
        if (!deletingOrder) return
        try {
            setIsDeleting(true); await deleteWorkOrder(deletingOrder.id)
            toast.success('Deleted!'); setIsDeleteModalOpen(false); setDeletingOrder(null)
            if (selectedOrderId === deletingOrder.id) setSelectedOrderId(null); fetchOrders()
        } catch (err: any) { toast.error(err.message) } finally { setIsDeleting(false) }
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Production"
                description={`${stats.total} orders • Active: ${stats.inProgress}`}
                actions={<div className="flex items-center gap-3">
                    <Button icon={<Plus size={16} />} onClick={() => setShowCreateOrder(true)}>New Production</Button>
                </div>} />

            {/* Manufacturing 2.0 KPIs */}
            <ProductionKPIs orders={orders} loading={isLoading} />

            {/* Tabs */}
            <div className="flex items-center gap-4 border-b border-dark-300/30">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={cn(
                        'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                        activeTab === 'orders'
                            ? 'border-purple-500 text-purple-400'
                            : 'border-transparent text-dark-500 hover:text-white'
                    )}>
                    <LayoutList size={16} /> Production Orders
                </button>
                <button
                    onClick={() => setActiveTab('schedule')}
                    className={cn(
                        'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                        activeTab === 'schedule'
                            ? 'border-purple-500 text-purple-400'
                            : 'border-transparent text-dark-500 hover:text-white'
                    )}>
                    <BarChart3 size={16} /> Schedule View
                </button>
            </div>

            {/* SCHEDULE TAB - Manufacturing 2.0 Gantt Chart */}
            {activeTab === 'schedule' && (
                <GanttChart 
                    orders={orders} 
                    onOrderClick={setSelectedOrderId}
                    loading={isLoading}
                />
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
                <>
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 max-w-md">
                            <Input placeholder="Search orders..." value={search}
                                onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
                        </div>
                        <div className="flex items-center gap-2">
                            {['all', 'planned', 'in_progress', 'completed', 'cancelled'].map(s => (
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
                                            {['Order', 'Product', 'Progress', 'Status', ''].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                            ))}
                                        </tr></thead>
                                        <tbody className="divide-y divide-dark-300/30">
                                            {orders.map(o => (
                                                <tr key={o.id} onClick={() => setSelectedOrderId(o.id)}
                                                    className={cn('hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                        selectedOrderId === o.id && 'bg-purple-500/5 border-l-2 border-purple-500')}>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm font-medium text-purple-400 font-mono">{o.work_order_number}</p>
                                                        <p className="text-xs text-dark-500">{o.batch_number || 'No batch'}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm text-white">{o.product_name}</p>
                                                        <p className="text-xs text-dark-500">{o.formulation_name}</p>
                                                    </td>
                                                    <td className="px-4 py-3 w-48">
                                                        <OrderProgressBar order={o} />
                                                        <p className="text-[10px] text-dark-600 mt-1">
                                                            {o.actual_quantity || 0} / {o.batch_size} units
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant={WO_STATUSES.find(s => s.value === o.status)?.color as any || 'default'}>
                                                            {WO_STATUSES.find(s => s.value === o.status)?.label || o.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1">
                                                            {(o.status === 'in_progress' || o.status === 'material_issued') && (
                                                                <ScrapButton workOrder={o} onScrapRecorded={fetchOrders} />
                                                            )}
                                                            {o.status === 'planned' && (
                                                                <button title="Delete" onClick={(e) => { e.stopPropagation(); setDeletingOrder(o); setIsDeleteModalOpen(true) }}
                                                                    className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-dark-200"><Trash2 size={14} /></button>
                                                            )}
                                                        </div>
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

            <Modal isOpen={showCreateOrder} onClose={() => setShowCreateOrder(false)} title="New Production Order" size="md"
                footer={<>
                    <Button variant="secondary" onClick={() => setShowCreateOrder(false)}>Cancel</Button>
                    <Button onClick={handleCreateOrder} isLoading={isSaving} icon={<Save size={16} />}>Create Order</Button>
                </>}>
                <div className="space-y-4">
                    <Select label="Formulation / Recipe *" value={orderForm.formulation_id}
                        onChange={(e) => setOrderForm((p) => ({ ...p, formulation_id: e.target.value }))}
                        options={formulations.map(f => ({ value: f.id, label: `${f.name} (${f.product_name})` }))}
                        placeholder="Select approved formulation" />

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Batch Size / Quantity *" type="number" value={orderForm.batch_size}
                            onChange={(e) => setOrderForm((p) => ({ ...p, batch_size: Number(e.target.value) }))} />
                        <Select label="Priority" value={orderForm.priority}
                            onChange={(e) => setOrderForm((p) => ({ ...p, priority: e.target.value }))}
                            options={[
                                { value: 'low', label: 'Low' },
                                { value: 'medium', label: 'Medium' },
                                { value: 'high', label: 'High' }
                            ]} />
                    </div>

                    <Textarea label="Notes (Optional)" value={orderForm.notes}
                        onChange={(e) => setOrderForm((p) => ({ ...p, notes: e.target.value }))} rows={2} />

                    {orderForm.formulation_id && (
                        <div className="bg-dark-200/20 rounded-lg p-3">
                            <p className="text-xs text-dark-500 mb-2 uppercase">Live Stock Check (Ingredients)</p>
                            {selectedFormulationIngredients.length === 0 ? (
                                <p className="text-xs text-dark-600">No ingredients listed for this formulation.</p>
                            ) : (
                                selectedFormulationIngredients.map((item, idx) => {
                                    const needed = Math.round(item.quantity * (orderForm.batch_size || 0) * 1000) / 1000
                                    // Note: We don't have current_stock in FormulationIngredient interface,
                                    // ideally we'd fetch it but for now let's just show it if it exists
                                    return (
                                        <div key={idx} className="flex items-center justify-between py-1.5 border-b border-dark-300/20 last:border-0">
                                            <span className="text-sm text-white">{item.material_name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-mono text-purple-400">{needed} {item.unit}</span>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}
                </div>
            </Modal>


            {/* Delete Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setDeletingOrder(null) }}
                title="Delete Work Order" size="sm"
                footer={<>
                    <Button variant="secondary" onClick={() => { setIsDeleteModalOpen(false); setDeletingOrder(null) }}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
                </>}>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                    <AlertCircle size={20} className="text-red-400 mt-0.5" />
                    <p className="text-sm text-white">Delete <strong>{deletingOrder?.work_order_number}</strong>?</p>
                </div>
            </Modal>
        </div>
    )
}