import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Search, Download, Trash2, X, Save, ChevronLeft, ChevronRight,
    PackageCheck, Check, XCircle, RotateCcw, Calendar, IndianRupee,
    RefreshCw, ClipboardCheck, Warehouse, ArrowRight,
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
    getGRNs, getGRNById, createGRN, updateGRN, deleteGRN,
    updateGRNStatus, acceptGRN, getGRNStats,
    getReceivablePOs, getPOItemsForGRN,
    type GRN, type GRNItem, type GRNFormData, EMPTY_GRN_FORM,
} from '@/services/grnService'
import { createSupplierBillFromGRN } from '@/services/supplierPaymentService'
import { exportToCSV } from '@/services/exportService'

// ============ GRN STATUS BADGE ============
function GRNStatusBadge({ status }: { status: string }) {
    const config: Record<string, { variant: any; label: string }> = {
        draft: { variant: 'default', label: 'Draft' },
        inspecting: { variant: 'info', label: 'Inspecting' },
        accepted: { variant: 'success', label: 'Accepted' },
        partial: { variant: 'warning', label: 'Partial' },
        rejected: { variant: 'danger', label: 'Rejected' },
    }
    const c = config[status] || config.draft
    return <Badge variant={c.variant}>{c.label}</Badge>
}

// ============ GRN DETAIL PANEL ============
function GRNDetail({ grnId, onClose, onRefresh }: {
    grnId: string; onClose: () => void; onRefresh: () => void
}) {
    const { user } = useAuthStore()
    const [grn, setGrn] = useState<GRN | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [creatingBill, setCreatingBill] = useState(false)

    useEffect(() => { loadGRN() }, [grnId])

    const loadGRN = async () => {
        try {
            setLoading(true)
            setGrn(await getGRNById(grnId))
        } catch (err: any) { toast.error(err.message) }
        finally { setLoading(false) }
    }

    const handleStatusChange = async (status: string) => {
        try {
            setUpdating(true)
            await updateGRNStatus(grnId, status)
            toast.success(`GRN ${status}!`)
            loadGRN(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handleAccept = async () => {
        try {
            setUpdating(true)
            await acceptGRN(grnId, user?.id)
            toast.success('GRN accepted and inventory updated!')
            loadGRN(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handleCreateBill = async () => {
        try {
            setCreatingBill(true)
            const bill = await createSupplierBillFromGRN(grnId, user?.id)
            toast.success(`Supplier Bill ${bill.bill_number} created!`)
            loadGRN(); onRefresh()
        } catch (err: any) {
            toast.error('Failed: ' + err.message)
        } finally {
            setCreatingBill(false)
        }
    }

    if (loading) return (
        <div className="glass-card p-8"><div className="animate-pulse space-y-4">
            <div className="h-6 bg-dark-200 rounded w-1/3" />
            <div className="h-32 bg-dark-200 rounded" />
        </div></div>
    )

    if (!grn) return null

    return (
        <div className="glass-card h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-300/50">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-white">{grn.grn_number}</h2>
                        <GRNStatusBadge status={grn.status} />
                    </div>
                    <p className="text-xs text-dark-500 mt-1">PO: {grn.po_number} • {formatDate(grn.received_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                    {grn.status === 'draft' && (
                        <>
                            <Button size="sm" onClick={() => handleStatusChange('inspecting')} isLoading={updating} icon={<ClipboardCheck size={14} />}>Start Inspection</Button>
                        </>
                    )}
                    {grn.status === 'inspecting' && (
                        <>
                            <Button size="sm" variant="success" onClick={handleAccept} isLoading={updating} icon={<Check size={14} />}>Accept GRN</Button>
                            <Button size="sm" variant="danger" onClick={() => handleStatusChange('rejected')} isLoading={updating} icon={<XCircle size={14} />}>Reject</Button>
                        </>
                    )}
                    {grn.status === 'rejected' && (
                        <Button size="sm" variant="secondary" onClick={() => handleStatusChange('draft')} isLoading={updating} icon={<RotateCcw size={14} />}>Reopen</Button>
                    )}
                    {(grn.status === 'accepted' || grn.status === 'partial') && (
                        <Button size="sm" variant="secondary" onClick={handleCreateBill} isLoading={creatingBill}
                            icon={<IndianRupee size={14} />}>
                            Create Bill
                        </Button>
                    )}
                    <button title="Close" onClick={onClose} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200"><X size={16} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Accepted Badge */}
                {grn.status === 'accepted' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                        <Warehouse size={20} className="text-emerald-400" />
                        <div>
                            <p className="text-sm font-medium text-emerald-400">Inventory Updated</p>
                            <p className="text-xs text-dark-500">All accepted quantities have been added to inventory</p>
                        </div>
                    </div>
                )}

                {/* Supplier Info */}
                <div className="bg-dark-200/20 rounded-xl p-4">
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-2">Supplier</p>
                    <p className="text-sm font-medium text-white">{grn.supplier_name}</p>
                    {grn.supplier_phone && <p className="text-xs text-dark-500">{grn.supplier_phone}</p>}
                </div>

                {/* Items Table */}
                <div>
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-2">Items Received</p>
                    <table className="w-full text-sm">
                        <thead className="text-xs text-dark-500 border-b border-dark-300/30">
                            <tr>
                                <th className="text-left py-2">Item</th>
                                <th className="text-center py-2">Ordered</th>
                                <th className="text-center py-2">Received</th>
                                <th className="text-center py-2">Accepted</th>
                                <th className="text-center py-2">Rejected</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-300/30">
                            {(grn.items || []).map(item => (
                                <tr key={item.id}>
                                    <td className="py-2">
                                        <p className="text-white">{item.material_name || item.product_name}</p>
                                        <p className="text-xs text-dark-500">{item.material_code || item.product_sku}</p>
                                        {item.batch_number && <p className="text-xs text-brand-400">Batch: {item.batch_number}</p>}
                                    </td>
                                    <td className="py-2 text-center text-dark-500">{item.ordered_quantity}</td>
                                    <td className="py-2 text-center text-amber-400">{item.received_quantity}</td>
                                    <td className="py-2 text-center text-emerald-400 font-medium">{item.accepted_quantity}</td>
                                    <td className="py-2 text-center text-red-400">{item.rejected_quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Notes */}
                {grn.notes && (
                    <div className="bg-dark-200/20 rounded-xl p-4">
                        <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-sm text-dark-500">{grn.notes}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ============ MAIN PAGE ============
export function GRNPage() {
    const { user } = useAuthStore()
    const [grns, setGrns] = useState<GRN[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 25

    // Modals
    const [showModal, setShowModal] = useState(false)
    const [editingGRN, setEditingGRN] = useState<GRN | null>(null)
    const [selectedGRNId, setSelectedGRNId] = useState<string | null>(null)
    const [deletingGRN, setDeletingGRN] = useState<GRN | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [formData, setFormData] = useState<GRNFormData>(EMPTY_GRN_FORM)
    const [receivablePOs, setReceivablePOs] = useState<{ id: string; po_number: string; supplier_name: string; total_amount: number }[]>([])
    const [poItems, setPoItems] = useState<any[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [stats, setStats] = useState({ total: 0, draft: 0, inspecting: 0, accepted: 0, partial: 0, rejected: 0 })

    const fetchReceivablePOs = async () => {
        try {
            const pos = await getReceivablePOs()
            setReceivablePOs(pos)
        } catch (err: any) { toast.error(err.message) }
    }

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getGRNs({ page, pageSize }, { status: statusFilter, search }),
                getGRNStats(),
            ])
            setGrns(result.data)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
        } catch (err: any) { toast.error(err.message) }
        finally { setIsLoading(false) }
    }, [page, statusFilter, search])

    useEffect(() => { fetchData(); fetchReceivablePOs() }, [fetchData])
    useEffect(() => { const t = setTimeout(() => { setPage(1); fetchData() }, 300); return () => clearTimeout(t) }, [search])

    // Load PO items when PO selected
    useEffect(() => {
        if (formData.purchase_order_id) {
            loadPOItems(formData.purchase_order_id)
        } else {
            setPoItems([])
        }
    }, [formData.purchase_order_id])

    const loadPOItems = async (poId: string) => {
        try {
            const items = await getPOItemsForGRN(poId)
            setPoItems(items)
            // Initialize GRN items from PO items
            setFormData(p => ({
                ...p,
                items: items.map((item: any) => ({
                    purchase_order_item_id: item.id,
                    raw_material_id: item.raw_material_id,
                    product_id: item.product_id,
                    ordered_quantity: item.ordered_quantity,
                    received_quantity: 0,
                    accepted_quantity: 0,
                    rejected_quantity: 0,
                    batch_number: '',
                    manufacturing_date: '',
                    expiry_date: '',
                    notes: '',
                    material_name: item.material_name,
                    product_name: item.product_name,
                    unit_of_measure: item.unit_of_measure,
                }))
            }))
        } catch (err: any) { toast.error(err.message) }
    }

    const handleSave = async () => {
        if (!formData.purchase_order_id) { toast.error('Select purchase order'); return }
        if (formData.items.length === 0) { toast.error('No items to receive'); return }

        try {
            setIsSaving(true)
            if (editingGRN) {
                await updateGRN(editingGRN.id, formData)
                toast.success('GRN updated!')
            } else {
                await createGRN(formData, user?.id)
                toast.success('GRN created!')
            }
            setShowModal(false); setEditingGRN(null); setFormData(EMPTY_GRN_FORM); setPoItems([]); fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const handleDelete = async () => {
        if (!deletingGRN) return
        try {
            setIsDeleting(true)
            await deleteGRN(deletingGRN.id)
            toast.success('Deleted!')
            setDeletingGRN(null)
            if (selectedGRNId === deletingGRN.id) setSelectedGRNId(null)
            fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsDeleting(false) }
    }

    const updateItem = (index: number, field: keyof GRNItem, value: any) => {
        setFormData(p => {
            const items = [...p.items]
            items[index] = { ...items[index], [field]: value }
            
            // Auto-calculate rejected quantity
            if (field === 'received_quantity' || field === 'accepted_quantity') {
                const received = field === 'received_quantity' ? Number(value) : items[index].received_quantity
                const accepted = field === 'accepted_quantity' ? Number(value) : items[index].accepted_quantity
                items[index].rejected_quantity = received - accepted
            }
            
            return { ...p, items }
        })
    }

    const handleExport = () => {
        const rows = grns.map(g => ({
            grn_number: g.grn_number,
            po_number: g.po_number,
            supplier: g.supplier_name,
            received_date: formatDate(g.received_date),
            status: g.status,
        }))
        exportToCSV(rows, [
            { key: 'grn_number', label: 'GRN #' },
            { key: 'po_number', label: 'PO #' },
            { key: 'supplier', label: 'Supplier' },
            { key: 'received_date', label: 'Received Date' },
            { key: 'status', label: 'Status' },
        ], 'grn')
        toast.success('GRNs exported!')
    }

    const selectedPO = receivablePOs.find(po => po.id === formData.purchase_order_id)

    return (
        <div className="space-y-6">
            <PageHeader title="Goods Receipt Notes"
                description={`${stats.total} GRNs • ${stats.accepted} accepted`}
                actions={<div className="flex items-center gap-3">
                    <Button variant="secondary" icon={<Download size={16} />} size="sm" onClick={handleExport}>Export CSV</Button>
                    <Button icon={<Plus size={16} />} onClick={() => { setEditingGRN(null); setFormData(EMPTY_GRN_FORM); setPoItems([]); setShowModal(true) }}>New GRN</Button>
                </div>} />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: 'Total GRNs', value: stats.total, color: 'text-blue-400' },
                    { label: 'Draft', value: stats.draft, color: 'text-dark-500' },
                    { label: 'Inspecting', value: stats.inspecting, color: 'text-amber-400' },
                    { label: 'Accepted', value: stats.accepted, color: 'text-emerald-400' },
                    { label: 'Rejected', value: stats.rejected, color: 'text-red-400' },
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
                    <Input placeholder="Search GRN number..." value={search}
                        onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
                </div>
                <div className="flex items-center gap-2">
                    {['all', 'draft', 'inspecting', 'accepted', 'partial', 'rejected'].map(s => (
                        <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                statusFilter === s ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Split View */}
            <div className={cn('flex gap-6', selectedGRNId ? 'items-start' : '')}>
                <div className={cn('transition-all duration-300', selectedGRNId ? 'w-1/2' : 'w-full')}>
                    {isLoading ? (
                        <div className="glass-card p-8"><div className="animate-pulse space-y-3">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-dark-200 rounded-lg" />)}
                        </div></div>
                    ) : grns.length === 0 ? (
                        <EmptyState icon={<PackageCheck size={48} />} title="No GRNs"
                            description="Create a GRN to receive goods" actionLabel="New GRN"
                            onAction={() => { setEditingGRN(null); setFormData(EMPTY_GRN_FORM); setPoItems([]); setShowModal(true) }} />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead><tr className="border-b border-dark-300/50">
                                    {['GRN #', 'PO #', 'Supplier', 'Received Date', 'Status', ''].map(h => (
                                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-dark-300/30">
                                    {grns.map(g => (
                                        <tr key={g.id} onClick={() => setSelectedGRNId(g.id)}
                                            className={cn('hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                selectedGRNId === g.id && 'bg-brand-500/5 border-l-2 border-brand-500')}>
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-medium text-brand-400 font-mono">{g.grn_number}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm text-blue-400 font-mono">{g.po_number}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm text-white">{g.supplier_name}</p>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-dark-500">{formatDate(g.received_date)}</td>
                                            <td className="px-3 py-3"><GRNStatusBadge status={g.status} /></td>
                                            <td className="px-3 py-3">
                                                {g.status === 'draft' && (
                                                    <button title="Delete" onClick={(e) => { e.stopPropagation(); setDeletingGRN(g) }}
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

                {selectedGRNId && (
                    <div className="w-1/2 sticky top-20">
                        <GRNDetail grnId={selectedGRNId}
                            onClose={() => setSelectedGRNId(null)}
                            onRefresh={fetchData} />
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingGRN(null); setPoItems([]) }}
                title="New Goods Receipt Note"
                size="xl"
                footer={<div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={() => { setShowModal(false); setEditingGRN(null); setPoItems([]) }}>Cancel</Button>
                    <Button onClick={handleSave} isLoading={isSaving} icon={<Save size={16} />}>Save as Draft</Button>
                </div>}>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {/* PO Selection */}
                    <Select label="Purchase Order *" value={formData.purchase_order_id}
                        onChange={(e) => setFormData(p => ({ ...p, purchase_order_id: e.target.value }))}
                        options={receivablePOs.map(po => ({ value: po.id, label: `${po.po_number} - ${po.supplier_name} (${formatCurrency(po.total_amount)})` }))}
                        placeholder="Select purchase order" />

                    {selectedPO && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                            <p className="text-sm text-blue-400 font-medium">{selectedPO.po_number}</p>
                            <p className="text-xs text-dark-500">Supplier: {selectedPO.supplier_name}</p>
                        </div>
                    )}

                    <Input label="Received Date *" type="date" value={formData.received_date}
                        onChange={(e) => setFormData(p => ({ ...p, received_date: e.target.value }))} />

                    {/* Items */}
                    {poItems.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-white mb-3">Items to Receive</p>
                            <div className="space-y-3">
                                {formData.items.map((item, idx) => (
                                    <div key={idx} className="bg-dark-200/30 rounded-lg p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-white">{item.material_name || item.product_name}</p>
                                                <p className="text-xs text-dark-500">{item.material_code || item.product_sku} • {item.unit_of_measure}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-dark-500">Ordered: <span className="text-white font-medium">{item.ordered_quantity}</span></p>
                                                <p className="text-xs text-dark-500">Already Received: <span className="text-amber-400">{poItems[idx]?.already_received || 0}</span></p>
                                                <p className="text-xs text-brand-400">Remaining: {poItems[idx]?.remaining_quantity || 0}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-4 gap-3">
                                            <Input label="Received Qty" type="number" value={item.received_quantity}
                                                onChange={(e) => updateItem(idx, 'received_quantity', Number(e.target.value))} />
                                            <Input label="Accepted Qty" type="number" value={item.accepted_quantity}
                                                onChange={(e) => updateItem(idx, 'accepted_quantity', Number(e.target.value))} />
                                            <Input label="Rejected Qty" type="number" value={item.rejected_quantity} disabled
                                                className="bg-dark-300/50" />
                                            <Input label="Batch No" value={item.batch_number}
                                                onChange={(e) => updateItem(idx, 'batch_number', e.target.value)} placeholder="Optional" />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input label="Mfg Date" type="date" value={item.manufacturing_date}
                                                onChange={(e) => updateItem(idx, 'manufacturing_date', e.target.value)} />
                                            <Input label="Expiry Date" type="date" value={item.expiry_date}
                                                onChange={(e) => updateItem(idx, 'expiry_date', e.target.value)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {formData.purchase_order_id && poItems.length === 0 && (
                        <div className="text-center py-4">
                            <p className="text-sm text-dark-500">No remaining items to receive for this PO</p>
                        </div>
                    )}

                    <Textarea label="Notes" value={formData.notes}
                        onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>
            </Modal>

            {/* Delete Modal */}
            {deletingGRN && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeletingGRN(null)}>
                    <div className="glass-card p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-2">Delete GRN?</h3>
                        <p className="text-sm text-dark-500 mb-4">
                            Delete {deletingGRN.grn_number}? This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setDeletingGRN(null)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
