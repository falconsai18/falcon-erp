import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Search, Download, Trash2, X, Save, ChevronLeft, ChevronRight,
    FileText, Check, XCircle, RotateCcw, Calendar, IndianRupee,
    FileMinus, Package, ArrowRight, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
    getDebitNotes, getDebitNoteById, createDebitNote, deleteDebitNote,
    updateDebitNoteStatus, approveDebitNote, getDebitNoteStats,
    calculateDNItem, calculateDNTotals,
    getPurchaseOrdersForDN, getPOItemsForDN,
    type DebitNote, type DebitNoteItem, type DebitNoteFormData, EMPTY_DN_FORM,
} from '@/services/debitNoteService'
import { exportToCSV } from '@/services/exportService'

// ============ DEBIT NOTE STATUS BADGE ============
function DNStatusBadge({ status }: { status: string }) {
    const config: Record<string, { variant: any; label: string }> = {
        draft: { variant: 'default', label: 'Draft' },
        approved: { variant: 'success', label: 'Approved' },
        cancelled: { variant: 'danger', label: 'Cancelled' },
    }
    const c = config[status] || config.draft
    return <Badge variant={c.variant}>{c.label}</Badge>
}

// ============ DEBIT NOTE DETAIL PANEL ============
function DebitNoteDetail({ debitNoteId, onClose, onRefresh }: {
    debitNoteId: string; onClose: () => void; onRefresh: () => void
}) {
    const { user } = useAuthStore()
    const [debitNote, setDebitNote] = useState<DebitNote | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)

    useEffect(() => { loadDebitNote() }, [debitNoteId])

    const loadDebitNote = async () => {
        try {
            setLoading(true)
            setDebitNote(await getDebitNoteById(debitNoteId))
        } catch (err: any) { toast.error(err.message) }
        finally { setLoading(false) }
    }

    const handleApprove = async () => {
        try {
            setUpdating(true)
            await approveDebitNote(debitNoteId, user?.id)
            toast.success('Debit note approved! Stock has been deducted.')
            loadDebitNote(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handleStatusChange = async (status: string) => {
        try {
            setUpdating(true)
            await updateDebitNoteStatus(debitNoteId, status)
            toast.success(`Debit note ${status}!`)
            loadDebitNote(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    if (loading) return (
        <div className="glass-card p-8"><div className="animate-pulse space-y-4">
            <div className="h-6 bg-dark-200 rounded w-1/3" />
            <div className="h-32 bg-dark-200 rounded" />
        </div></div>
    )

    if (!debitNote) return null

    return (
        <div className="glass-card h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-300/50">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-white">{debitNote.debit_note_number}</h2>
                        <DNStatusBadge status={debitNote.status} />
                    </div>
                    <p className="text-xs text-dark-500 mt-1">{formatDate(debitNote.issue_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                    {debitNote.status === 'draft' && (
                        <Button size="sm" variant="success" onClick={handleApprove} isLoading={updating} icon={<Check size={14} />}>Approve</Button>
                    )}
                    {debitNote.status === 'draft' && (
                        <Button size="sm" variant="danger" onClick={() => handleStatusChange('cancelled')} isLoading={updating} icon={<XCircle size={14} />}>Cancel</Button>
                    )}
                    {debitNote.status === 'cancelled' && (
                        <Button size="sm" variant="secondary" onClick={() => handleStatusChange('draft')} isLoading={updating} icon={<RotateCcw size={14} />}>Reopen</Button>
                    )}
                    <button title="Close" onClick={onClose} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200"><X size={16} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Approved Badge */}
                {debitNote.status === 'approved' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                        <Check size={20} className="text-emerald-400" />
                        <div>
                            <p className="text-sm font-medium text-emerald-400">Approved</p>
                            <p className="text-xs text-dark-500">Stock adjusted • Supplier claim recorded</p>
                        </div>
                    </div>
                )}

                {/* Linked PO */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">Linked Purchase Order</p>
                    <p className="text-sm font-medium text-white">{debitNote.po_number}</p>
                </div>

                {/* Supplier Info */}
                <div className="bg-dark-200/20 rounded-xl p-4">
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-2">Supplier</p>
                    <p className="text-sm font-medium text-white">{debitNote.supplier_name}</p>
                    {debitNote.supplier_phone && <p className="text-xs text-dark-500">{debitNote.supplier_phone}</p>}
                    {debitNote.supplier_gst && <p className="text-xs text-dark-500">GST: {debitNote.supplier_gst}</p>}
                </div>

                {/* Reason */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                        <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Reason for Debit</p>
                            <p className="text-sm text-white">{debitNote.reason}</p>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div>
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-2">Items Being Returned</p>
                    <table className="w-full text-sm">
                        <thead className="text-xs text-dark-500 border-b border-dark-300/30">
                            <tr>
                                <th className="text-left py-2">Item</th>
                                <th className="text-center py-2">Qty</th>
                                <th className="text-right py-2">Price</th>
                                <th className="text-right py-2">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-300/30">
                            {(debitNote.items || []).map(item => (
                                <tr key={item.id}>
                                    <td className="py-2">
                                        <p className="text-white">{item.material_name || item.product_name}</p>
                                        <p className="text-xs text-dark-500">{item.material_code || item.product_sku}</p>
                                    </td>
                                    <td className="py-2 text-center text-dark-500">{item.quantity}</td>
                                    <td className="py-2 text-right text-dark-500">{formatCurrency(item.unit_price)}</td>
                                    <td className="py-2 text-right font-mono text-white">{formatCurrency(item.total_amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="bg-dark-200/20 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-dark-500">Subtotal</span>
                        <span className="font-mono text-white">{formatCurrency(debitNote.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-dark-500">Tax</span>
                        <span className="font-mono text-white">{formatCurrency(debitNote.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-dark-300/30">
                        <span className="text-white font-medium">Total Debit</span>
                        <span className="font-mono font-bold text-red-400">{formatCurrency(debitNote.total_amount)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ============ MAIN PAGE ============
export function DebitNotesPage() {
    const { user } = useAuthStore()
    const [debitNotes, setDebitNotes] = useState<DebitNote[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 25

    // Modals
    const [showModal, setShowModal] = useState(false)
    const [selectedDNId, setSelectedDNId] = useState<string | null>(null)
    const [deletingDN, setDeletingDN] = useState<DebitNote | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [formData, setFormData] = useState<DebitNoteFormData>(EMPTY_DN_FORM)
    const [eligiblePOs, setEligiblePOs] = useState<{ id: string; po_number: string; supplier_name: string; total_amount: number }[]>([])
    const [poItems, setPoItems] = useState<any[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [stats, setStats] = useState({ total: 0, draft: 0, approved: 0, cancelled: 0, totalValue: 0 })

    const fetchEligiblePOs = async () => {
        try {
            const pos = await getPurchaseOrdersForDN()
            setEligiblePOs(pos)
        } catch (err: any) { toast.error(err.message) }
    }

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getDebitNotes({ page, pageSize }, { status: statusFilter, search }),
                getDebitNoteStats(),
            ])
            setDebitNotes(result.data)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
        } catch (err: any) { toast.error(err.message) }
        finally { setIsLoading(false) }
    }, [page, statusFilter, search])

    useEffect(() => { fetchData(); fetchEligiblePOs() }, [fetchData])
    useEffect(() => { const t = setTimeout(() => { setPage(1); fetchData() }, 300); return () => clearTimeout(t) }, [search])

    // Load PO items when PO selected
    useEffect(() => {
        if (formData.purchase_order_id) {
            loadPOItems(formData.purchase_order_id)
        } else {
            setPoItems([])
            setFormData(p => ({ ...p, items: [] }))
        }
    }, [formData.purchase_order_id])

    const loadPOItems = async (poId: string) => {
        try {
            const items = await getPOItemsForDN(poId)
            setPoItems(items)
            // Initialize DN items from PO items
            setFormData(p => ({
                ...p,
                items: items.map((item: any) => ({
                    raw_material_id: item.raw_material_id,
                    product_id: item.product_id,
                    quantity: 0,
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate,
                    tax_amount: 0,
                    total_amount: 0,
                    material_name: item.material_name,
                    product_name: item.product_name,
                    unit_of_measure: item.unit_of_measure,
                    received_quantity: item.received_quantity,
                }))
            }))
        } catch (err: any) { toast.error(err.message) }
    }

    const handleSave = async () => {
        if (!formData.purchase_order_id) { toast.error('Select purchase order'); return }
        if (!formData.reason.trim()) { toast.error('Enter reason for debit note'); return }
        if (formData.items.length === 0 || formData.items.every(i => i.quantity === 0)) { toast.error('Add at least one item with quantity'); return }

        // Filter out items with 0 quantity
        const validItems = formData.items.filter(item => item.quantity > 0)

        try {
            setIsSaving(true)
            await createDebitNote({ ...formData, items: validItems }, user?.id)
            toast.success('Debit note created!')
            setShowModal(false); setFormData(EMPTY_DN_FORM); setPoItems([]); fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const handleDelete = async () => {
        if (!deletingDN) return
        try {
            setIsDeleting(true)
            await deleteDebitNote(deletingDN.id)
            toast.success('Deleted!')
            setDeletingDN(null)
            if (selectedDNId === deletingDN.id) setSelectedDNId(null)
            fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsDeleting(false) }
    }

    const updateItem = (index: number, field: keyof DebitNoteItem, value: any) => {
        setFormData(p => {
            const items = [...p.items]
            items[index] = { ...items[index], [field]: value }
            
            // Recalculate if quantity or price changed
            if (field === 'quantity' || field === 'unit_price' || field === 'tax_rate') {
                items[index] = calculateDNItem(items[index])
            }
            
            return { ...p, items }
        })
    }

    const handleExport = () => {
        const rows = debitNotes.map(dn => ({
            debit_note_number: dn.debit_note_number,
            po_number: dn.po_number,
            supplier: dn.supplier_name,
            issue_date: formatDate(dn.issue_date),
            status: dn.status,
            total: dn.total_amount,
        }))
        exportToCSV(rows, [
            { key: 'debit_note_number', label: 'Debit Note #' },
            { key: 'po_number', label: 'PO #' },
            { key: 'supplier', label: 'Supplier' },
            { key: 'issue_date', label: 'Issue Date' },
            { key: 'status', label: 'Status' },
            { key: 'total', label: 'Total' },
        ], 'debit_notes')
        toast.success('Debit notes exported!')
    }

    const selectedPO = eligiblePOs.find(po => po.id === formData.purchase_order_id)
    const totals = calculateDNTotals(formData.items.filter(i => i.quantity > 0))

    return (
        <div className="space-y-6">
            <PageHeader title="Debit Notes"
                description={`${stats.total} debit notes • Value: ${formatCurrency(stats.totalValue)}`}
                actions={<div className="flex items-center gap-3">
                    <Button variant="secondary" icon={<Download size={16} />} size="sm" onClick={handleExport}>Export CSV</Button>
                    <Button icon={<Plus size={16} />} onClick={() => { setFormData(EMPTY_DN_FORM); setPoItems([]); setShowModal(true) }}>New Debit Note</Button>
                </div>} />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total DN', value: stats.total, color: 'text-blue-400' },
                    { label: 'Draft', value: stats.draft, color: 'text-dark-500' },
                    { label: 'Approved', value: stats.approved, color: 'text-emerald-400' },
                    { label: 'Value', value: formatCurrency(stats.totalValue), color: 'text-red-400' },
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
                    <Input placeholder="Search debit note number..." value={search}
                        onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
                </div>
                <div className="flex items-center gap-2">
                    {['all', 'draft', 'approved', 'cancelled'].map(s => (
                        <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                statusFilter === s ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Split View */}
            <div className={cn('flex gap-6', selectedDNId ? 'items-start' : '')}>
                <div className={cn('transition-all duration-300', selectedDNId ? 'w-1/2' : 'w-full')}>
                    {isLoading ? (
                        <div className="glass-card p-8"><div className="animate-pulse space-y-3">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-dark-200 rounded-lg" />)}
                        </div></div>
                    ) : debitNotes.length === 0 ? (
                        <EmptyState icon={<FileMinus size={48} />} title="No debit notes"
                            description="Create a debit note to process supplier returns" actionLabel="New Debit Note"
                            onAction={() => { setFormData(EMPTY_DN_FORM); setPoItems([]); setShowModal(true) }} />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead><tr className="border-b border-dark-300/50">
                                    {['DN #', 'PO #', 'Supplier', 'Date', 'Amount', 'Status', ''].map(h => (
                                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-dark-300/30">
                                    {debitNotes.map(note => (
                                        <tr key={note.id} onClick={() => setSelectedDNId(note.id)}
                                            className={cn('hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                selectedDNId === note.id && 'bg-brand-500/5 border-l-2 border-brand-500')}>
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-medium text-brand-400 font-mono">{note.debit_note_number}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm text-blue-400 font-mono">{note.po_number}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm text-white">{note.supplier_name}</p>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-dark-500">{formatDate(note.issue_date)}</td>
                                            <td className="px-3 py-3 text-sm font-mono font-semibold text-red-400">{formatCurrency(note.total_amount)}</td>
                                            <td className="px-3 py-3"><DNStatusBadge status={note.status} /></td>
                                            <td className="px-3 py-3">
                                                {note.status === 'draft' && (
                                                    <button onClick={(e) => { e.stopPropagation(); setDeletingDN(note) }}
                                                        className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-dark-200" title="Delete"><Trash2 size={14} /></button>
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

                {selectedDNId && (
                    <div className="w-1/2 sticky top-20">
                        <DebitNoteDetail debitNoteId={selectedDNId}
                            onClose={() => setSelectedDNId(null)}
                            onRefresh={fetchData} />
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); setPoItems([]) }}
                title="New Debit Note"
                size="xl"
                footer={<div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={() => { setShowModal(false); setPoItems([]) }}>Cancel</Button>
                    <Button onClick={handleSave} isLoading={isSaving} icon={<Save size={16} />}>Save as Draft</Button>
                </div>}>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {/* PO Selection */}
                    <Select label="Purchase Order *" value={formData.purchase_order_id}
                        onChange={(e) => setFormData(p => ({ ...p, purchase_order_id: e.target.value }))}
                        options={eligiblePOs.map(po => ({ 
                            value: po.id, 
                            label: `${po.po_number} - ${po.supplier_name} (${formatCurrency(po.total_amount)})` 
                        }))}
                        placeholder="Select purchase order" />

                    {selectedPO && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                            <p className="text-sm text-blue-400 font-medium">{selectedPO.po_number}</p>
                            <p className="text-xs text-dark-500">Supplier: {selectedPO.supplier_name}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Issue Date *" type="date" value={formData.issue_date}
                            onChange={(e) => setFormData(p => ({ ...p, issue_date: e.target.value }))} />
                    </div>

                    <Textarea label="Reason for Debit *" value={formData.reason}
                        onChange={(e) => setFormData(p => ({ ...p, reason: e.target.value }))} 
                        placeholder="e.g., Defective goods received, Wrong items delivered, Quality rejection..." rows={2} />

                    {/* Items */}
                    {poItems.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-white mb-3">Select Items to Return</p>
                            <div className="space-y-3">
                                {formData.items.map((item, idx) => (
                                    <div key={idx} className="bg-dark-200/30 rounded-lg p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-white">{item.material_name || item.product_name}</p>
                                                <p className="text-xs text-dark-500">{item.material_code || item.product_sku} • {item.unit_of_measure}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-dark-500">Received: <span className="text-white font-medium">{poItems[idx]?.received_quantity || 0}</span></p>
                                                <p className="text-xs text-dark-500">Current Stock: <span className="text-amber-400">{poItems[idx]?.current_stock || 0}</span></p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-4 gap-3 items-end">
                                            <Input label="Return Qty" type="number" value={item.quantity}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value)
                                                    const max = poItems[idx]?.received_quantity || 0
                                                    if (val <= max) {
                                                        updateItem(idx, 'quantity', val)
                                                    }
                                                }}
                                                max={poItems[idx]?.received_quantity || 0} />
                                            <div>
                                                <p className="text-[10px] text-dark-500 uppercase mb-1">Price</p>
                                                <p className="text-sm font-mono text-white">{formatCurrency(item.unit_price)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-dark-500 uppercase mb-1">Tax</p>
                                                <p className="text-sm font-mono text-dark-500">{item.tax_rate}%</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-dark-500 uppercase mb-1">Total</p>
                                                <p className="text-sm font-mono text-brand-400">{formatCurrency(item.total_amount)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {formData.purchase_order_id && poItems.length === 0 && (
                        <div className="text-center py-4">
                            <p className="text-sm text-dark-500">No items found for this PO</p>
                        </div>
                    )}

                    {/* Totals */}
                    {totals.total_amount > 0 && (
                        <div className="bg-dark-200/20 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-500">Subtotal</span>
                                <span className="font-mono text-white">{formatCurrency(totals.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-500">Tax</span>
                                <span className="font-mono text-white">{formatCurrency(totals.tax_amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t border-dark-300/30">
                                <span className="text-white font-medium">Total Debit</span>
                                <span className="font-mono font-bold text-red-400">{formatCurrency(totals.total_amount)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Delete Modal */}
            {deletingDN && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeletingDN(null)}>
                    <div className="glass-card p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-2">Delete Debit Note?</h3>
                        <p className="text-sm text-dark-500 mb-4">
                            Delete {deletingDN.debit_note_number}? This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setDeletingDN(null)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
