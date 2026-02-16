import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Search, Download, Trash2, X, Save, ChevronLeft, ChevronRight,
    FileText, Check, Truck, RotateCcw, Calendar, Package,
    Printer, ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
    getChallans, getChallanById, createChallan, deleteChallan,
    updateChallanStatus, dispatchChallan, deliverChallan, generateChallanPDF,
    getChallanStats,
    getDispatchableSOs, getSOItemsForChallan,
    type DeliveryChallan, type ChallanItem, type ChallanFormData, EMPTY_CHALLAN_FORM,
} from '@/services/challanService'
import { exportToCSV } from '@/services/exportService'

// ============ CHALLAN STATUS BADGE ============
function ChallanStatusBadge({ status }: { status: string }) {
    const config: Record<string, { variant: any; label: string }> = {
        draft: { variant: 'default', label: 'Draft' },
        dispatched: { variant: 'info', label: 'Dispatched' },
        delivered: { variant: 'success', label: 'Delivered' },
        cancelled: { variant: 'danger', label: 'Cancelled' },
    }
    const c = config[status] || config.draft
    return <Badge variant={c.variant}>{c.label}</Badge>
}

// ============ CHALLAN DETAIL PANEL ============
function ChallanDetail({ challanId, onClose, onRefresh }: {
    challanId: string; onClose: () => void; onRefresh: () => void
}) {
    const { user } = useAuthStore()
    const [challan, setChallan] = useState<DeliveryChallan | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)

    useEffect(() => { loadChallan() }, [challanId])

    const loadChallan = async () => {
        try {
            setLoading(true)
            setChallan(await getChallanById(challanId))
        } catch (err: any) { toast.error(err.message) }
        finally { setLoading(false) }
    }

    const handleDispatch = async () => {
        try {
            setUpdating(true)
            await dispatchChallan(challanId, user?.id)
            toast.success('Challan dispatched! Inventory has been deducted.')
            loadChallan(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handleDeliver = async () => {
        try {
            setUpdating(true)
            await deliverChallan(challanId)
            toast.success('Challan marked as delivered!')
            loadChallan(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handleDownloadPDF = async () => {
        try {
            await generateChallanPDF(challanId)
            toast.success('PDF downloaded!')
        } catch (err: any) { toast.error(err.message) }
    }

    if (loading) return (
        <div className="glass-card p-8"><div className="animate-pulse space-y-4">
            <div className="h-6 bg-dark-200 rounded w-1/3" />
            <div className="h-32 bg-dark-200 rounded" />
        </div></div>
    )

    if (!challan) return null

    return (
        <div className="glass-card h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-300/50">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-white">{challan.challan_number}</h2>
                        <ChallanStatusBadge status={challan.status} />
                    </div>
                    <p className="text-xs text-dark-500 mt-1">{formatDate(challan.challan_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                    {challan.status === 'draft' && (
                        <Button size="sm" onClick={handleDispatch} isLoading={updating} icon={<Truck size={14} />}>Dispatch</Button>
                    )}
                    {challan.status === 'dispatched' && (
                        <>
                            <Button size="sm" variant="success" onClick={handleDeliver} isLoading={updating} icon={<Check size={14} />}>Mark Delivered</Button>
                            <Button size="sm" variant="secondary" onClick={handleDownloadPDF} icon={<Printer size={14} />}>PDF</Button>
                        </>
                    )}
                    {challan.status === 'delivered' && (
                        <Button size="sm" variant="secondary" onClick={handleDownloadPDF} icon={<Printer size={14} />}>Download PDF</Button>
                    )}
                    <button onClick={onClose} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200"><X size={16} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Status Badge */}
                {challan.status === 'delivered' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                        <Check size={20} className="text-emerald-400" />
                        <div>
                            <p className="text-sm font-medium text-emerald-400">Delivered</p>
                            <p className="text-xs text-dark-500">Goods have been successfully delivered</p>
                        </div>
                    </div>
                )}

                {challan.status === 'dispatched' && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
                        <Truck size={20} className="text-blue-400" />
                        <div>
                            <p className="text-sm font-medium text-blue-400">Dispatched</p>
                            <p className="text-xs text-dark-500">Inventory has been deducted • Goods in transit</p>
                        </div>
                    </div>
                )}

                {/* Linked SO */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">Linked Sales Order</p>
                    <p className="text-sm font-medium text-white">{challan.order_number}</p>
                </div>

                {/* Customer Info */}
                <div className="bg-dark-200/20 rounded-xl p-4">
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-2">Customer</p>
                    <p className="text-sm font-medium text-white">{challan.customer_name}</p>
                    {challan.customer_phone && <p className="text-xs text-dark-500">{challan.customer_phone}</p>}
                    {challan.customer_address && challan.customer_address !== '-' && (
                        <p className="text-xs text-dark-500">{challan.customer_address}</p>
                    )}
                </div>

                {/* Vehicle & Transporter */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-dark-200/20 rounded-xl p-4">
                        <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1">Vehicle Number</p>
                        <p className="text-sm font-medium text-white">{challan.vehicle_number || '-'}</p>
                    </div>
                    <div className="bg-dark-200/20 rounded-xl p-4">
                        <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1">Transporter</p>
                        <p className="text-sm font-medium text-white">{challan.transporter || '-'}</p>
                    </div>
                </div>

                {/* Items Table */}
                <div>
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-2">Items Dispatched</p>
                    <table className="w-full text-sm">
                        <thead className="text-xs text-dark-500 border-b border-dark-300/30">
                            <tr>
                                <th className="text-left py-2">Product</th>
                                <th className="text-center py-2">Qty</th>
                                <th className="text-left py-2">Batch</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-300/30">
                            {(challan.items || []).map(item => (
                                <tr key={item.id}>
                                    <td className="py-2">
                                        <p className="text-white">{item.product_name}</p>
                                        <p className="text-xs text-dark-500">{item.product_sku}</p>
                                    </td>
                                    <td className="py-2 text-center text-dark-500">{item.quantity}</td>
                                    <td className="py-2 text-sm text-brand-400">{item.batch_number || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Notes */}
                {challan.notes && (
                    <div className="bg-dark-200/20 rounded-xl p-4">
                        <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-sm text-dark-500">{challan.notes}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ============ MAIN PAGE ============
export function ChallansPage() {
    const { user } = useAuthStore()
    const [challans, setChallans] = useState<DeliveryChallan[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 25

    // Modals
    const [showModal, setShowModal] = useState(false)
    const [selectedChallanId, setSelectedChallanId] = useState<string | null>(null)
    const [deletingChallan, setDeletingChallan] = useState<DeliveryChallan | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [formData, setFormData] = useState<ChallanFormData>(EMPTY_CHALLAN_FORM)
    const [dispatchableSOs, setDispatchableSOs] = useState<{ id: string; order_number: string; customer_name: string; total_amount: number }[]>([])
    const [soItems, setSoItems] = useState<any[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [stats, setStats] = useState({ total: 0, draft: 0, dispatched: 0, delivered: 0, cancelled: 0 })

    const fetchDispatchableSOs = async () => {
        try {
            const sos = await getDispatchableSOs()
            setDispatchableSOs(sos)
        } catch (err: any) { toast.error(err.message) }
    }

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getChallans({ page, pageSize }, { status: statusFilter, search }),
                getChallanStats(),
            ])
            setChallans(result.data)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
        } catch (err: any) { toast.error(err.message) }
        finally { setIsLoading(false) }
    }, [page, statusFilter, search])

    useEffect(() => { fetchData(); fetchDispatchableSOs() }, [fetchData])
    useEffect(() => { const t = setTimeout(() => { setPage(1); fetchData() }, 300); return () => clearTimeout(t) }, [search])

    // Load SO items when SO selected
    useEffect(() => {
        if (formData.sales_order_id) {
            loadSOItems(formData.sales_order_id)
        } else {
            setSoItems([])
            setFormData(p => ({ ...p, items: [] }))
        }
    }, [formData.sales_order_id])

    const loadSOItems = async (soId: string) => {
        try {
            const items = await getSOItemsForChallan(soId)
            setSoItems(items)
            // Initialize challan items from SO items
            setFormData(p => ({
                ...p,
                items: items.map((item: any) => ({
                    product_id: item.product_id,
                    quantity: 0,
                    batch_number: item.available_batches?.[0]?.batch_number || '',
                    product_name: item.product_name,
                    product_sku: item.product_sku,
                    ordered_quantity: item.ordered_quantity,
                    dispatched_quantity: item.dispatched_quantity,
                    remaining_quantity: item.remaining_quantity,
                    available_batches: item.available_batches,
                }))
            }))
        } catch (err: any) { toast.error(err.message) }
    }

    const handleSave = async () => {
        if (!formData.sales_order_id) { toast.error('Select sales order'); return }
        if (formData.items.length === 0 || formData.items.every(i => i.quantity === 0)) { toast.error('Add at least one item with quantity'); return }

        // Filter out items with 0 quantity
        const validItems = formData.items.filter(item => item.quantity > 0)

        try {
            setIsSaving(true)
            await createChallan({ ...formData, items: validItems }, user?.id)
            toast.success('Delivery challan created!')
            setShowModal(false); setFormData(EMPTY_CHALLAN_FORM); setSoItems([]); fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const handleDelete = async () => {
        if (!deletingChallan) return
        try {
            setIsDeleting(true)
            await deleteChallan(deletingChallan.id)
            toast.success('Deleted!')
            setDeletingChallan(null)
            if (selectedChallanId === deletingChallan.id) setSelectedChallanId(null)
            fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsDeleting(false) }
    }

    const updateItem = (index: number, field: keyof ChallanItem, value: any) => {
        setFormData(p => {
            const items = [...p.items]
            items[index] = { ...items[index], [field]: value }
            return { ...p, items }
        })
    }

    const handleExport = () => {
        const rows = challans.map(c => ({
            challan_number: c.challan_number,
            order_number: c.order_number,
            customer: c.customer_name,
            challan_date: formatDate(c.challan_date),
            vehicle: c.vehicle_number,
            status: c.status,
        }))
        exportToCSV(rows, [
            { key: 'challan_number', label: 'Challan #' },
            { key: 'order_number', label: 'SO #' },
            { key: 'customer', label: 'Customer' },
            { key: 'challan_date', label: 'Date' },
            { key: 'vehicle', label: 'Vehicle' },
            { key: 'status', label: 'Status' },
        ], 'delivery_challans')
        toast.success('Challans exported!')
    }

    const selectedSO = dispatchableSOs.find(so => so.id === formData.sales_order_id)

    return (
        <div className="space-y-6">
            <PageHeader title="Delivery Challans"
                description={`${stats.total} challans • ${stats.dispatched} in transit`}
                actions={<div className="flex items-center gap-3">
                    <Button variant="secondary" icon={<Download size={16} />} size="sm" onClick={handleExport}>Export CSV</Button>
                    <Button icon={<Plus size={16} />} onClick={() => { setFormData(EMPTY_CHALLAN_FORM); setSoItems([]); setShowModal(true) }}>New Challan</Button>
                </div>} />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: 'Total Challans', value: stats.total, color: 'text-blue-400' },
                    { label: 'Draft', value: stats.draft, color: 'text-dark-500' },
                    { label: 'Dispatched', value: stats.dispatched, color: 'text-amber-400' },
                    { label: 'Delivered', value: stats.delivered, color: 'text-emerald-400' },
                    { label: 'Cancelled', value: stats.cancelled, color: 'text-red-400' },
                ].map(k => (
                    <div key={k.label} className="glass-card p-3">
                        <p className="text-[10px] text-dark-500 uppercase">{k.label}</p>
                        <p className={cn('text-lg font-bold mt-0.5', k.color)}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 max-w-md">
                    <Input placeholder="Search challan number..." value={search}
                        onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
                </div>
                <div className="flex items-center gap-2">
                    {['all', 'draft', 'dispatched', 'delivered', 'cancelled'].map(s => (
                        <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                statusFilter === s ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Split View */}
            <div className={cn('flex gap-6', selectedChallanId ? 'items-start' : '')}>
                <div className={cn('transition-all duration-300', selectedChallanId ? 'w-1/2' : 'w-full')}>
                    {isLoading ? (
                        <div className="glass-card p-8"><div className="animate-pulse space-y-3">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-dark-200 rounded-lg" />)}
                        </div></div>
                    ) : challans.length === 0 ? (
                        <EmptyState icon={<Truck size={48} />} title="No challans"
                            description="Create a delivery challan to dispatch goods" actionLabel="New Challan"
                            onAction={() => { setFormData(EMPTY_CHALLAN_FORM); setSoItems([]); setShowModal(true) }} />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead><tr className="border-b border-dark-300/50">
                                    {['Challan #', 'SO #', 'Customer', 'Date', 'Vehicle', 'Status', ''].map(h => (
                                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-dark-300/30">
                                    {challans.map(challan => (
                                        <tr key={challan.id} onClick={() => setSelectedChallanId(challan.id)}
                                            className={cn('hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                selectedChallanId === challan.id && 'bg-brand-500/5 border-l-2 border-brand-500')}>
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-medium text-brand-400 font-mono">{challan.challan_number}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm text-blue-400 font-mono">{challan.order_number}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm text-white">{challan.customer_name}</p>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-dark-500">{formatDate(challan.challan_date)}</td>
                                            <td className="px-3 py-3 text-sm text-dark-500">{challan.vehicle_number || '-'}</td>
                                            <td className="px-3 py-3"><ChallanStatusBadge status={challan.status} /></td>
                                            <td className="px-3 py-3">
                                                {challan.status === 'draft' && (
                                                    <button onClick={(e) => { e.stopPropagation(); setDeletingChallan(challan) }}
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

                {selectedChallanId && (
                    <div className="w-1/2 sticky top-20">
                        <ChallanDetail challanId={selectedChallanId}
                            onClose={() => setSelectedChallanId(null)}
                            onRefresh={fetchData} />
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSoItems([]) }}
                title="New Delivery Challan"
                size="xl"
                footer={<div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={() => { setShowModal(false); setSoItems([]) }}>Cancel</Button>
                    <Button onClick={handleSave} isLoading={isSaving} icon={<Save size={16} />}>Save as Draft</Button>
                </div>}>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {/* SO Selection */}
                    <Select label="Sales Order *" value={formData.sales_order_id}
                        onChange={(e) => setFormData(p => ({ ...p, sales_order_id: e.target.value }))}
                        options={dispatchableSOs.map(so => ({ 
                            value: so.id, 
                            label: `${so.order_number} - ${so.customer_name} (${formatDate(new Date().toISOString())})` 
                        }))}
                        placeholder="Select sales order" />

                    {selectedSO && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                            <p className="text-sm text-blue-400 font-medium">{selectedSO.order_number}</p>
                            <p className="text-xs text-dark-500">Customer: {selectedSO.customer_name}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Challan Date *" type="date" value={formData.challan_date}
                            onChange={(e) => setFormData(p => ({ ...p, challan_date: e.target.value }))} />
                        <Input label="Vehicle Number" value={formData.vehicle_number}
                            onChange={(e) => setFormData(p => ({ ...p, vehicle_number: e.target.value.toUpperCase() }))} placeholder="e.g., MH02AB1234" />
                    </div>

                    <Input label="Transporter" value={formData.transporter}
                        onChange={(e) => setFormData(p => ({ ...p, transporter: e.target.value }))} placeholder="Transporter company name" />

                    {/* Items */}
                    {soItems.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-white mb-3">Select Items to Dispatch</p>
                            <div className="space-y-3">
                                {formData.items.map((item, idx) => (
                                    <div key={idx} className="bg-dark-200/30 rounded-lg p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-white">{item.product_name}</p>
                                                <p className="text-xs text-dark-500">{item.product_sku}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-dark-500">Ordered: <span className="text-white font-medium">{soItems[idx]?.ordered_quantity}</span></p>
                                                <p className="text-xs text-dark-500">Dispatched: <span className="text-amber-400">{soItems[idx]?.dispatched_quantity}</span></p>
                                                <p className="text-xs text-brand-400">Remaining: {soItems[idx]?.remaining_quantity}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input label="Dispatch Qty" type="number" value={item.quantity}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value)
                                                    const max = soItems[idx]?.remaining_quantity || 0
                                                    if (val <= max) {
                                                        updateItem(idx, 'quantity', val)
                                                    }
                                                }}
                                                max={soItems[idx]?.remaining_quantity || 0} />
                                            <Select label="Batch Number" value={item.batch_number}
                                                onChange={(e) => updateItem(idx, 'batch_number', e.target.value)}
                                                options={(soItems[idx]?.available_batches || []).map((batch: any) => ({
                                                    value: batch.batch_number,
                                                    label: `${batch.batch_number} (Qty: ${batch.available_quantity})`
                                                }))}
                                                placeholder="Select batch" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {formData.sales_order_id && soItems.length === 0 && (
                        <div className="text-center py-4">
                            <p className="text-sm text-dark-500">No remaining items to dispatch for this SO</p>
                        </div>
                    )}

                    <Textarea label="Notes" value={formData.notes}
                        onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>
            </Modal>

            {/* Delete Modal */}
            {deletingChallan && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeletingChallan(null)}>
                    <div className="glass-card p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-2">Delete Challan?</h3>
                        <p className="text-sm text-dark-500 mb-4">
                            Delete {deletingChallan.challan_number}? This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setDeletingChallan(null)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
