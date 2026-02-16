import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Search, Download, Trash2, X, Save, ChevronLeft, ChevronRight,
    FileText, Check, XCircle, RotateCcw, Calendar, IndianRupee,
    RotateCcw as ReceiptRefund, Package, ArrowRight, AlertCircle,
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
    getCreditNotes, getCreditNoteById, createCreditNote, deleteCreditNote,
    updateCreditNoteStatus, approveCreditNote, getCreditNoteStats,
    calculateCNItem, calculateCNTotals,
    getInvoicesForCreditNote, getInvoiceItemsForCN,
    type CreditNote, type CreditNoteItem, type CreditNoteFormData, EMPTY_CN_FORM,
} from '@/services/creditNoteService'
import { exportToCSV } from '@/services/exportService'

// ============ CREDIT NOTE STATUS BADGE ============
function CNStatusBadge({ status }: { status: string }) {
    const config: Record<string, { variant: any; label: string }> = {
        draft: { variant: 'default', label: 'Draft' },
        approved: { variant: 'success', label: 'Approved' },
        cancelled: { variant: 'danger', label: 'Cancelled' },
    }
    const c = config[status] || config.draft
    return <Badge variant={c.variant}>{c.label}</Badge>
}

// ============ CREDIT NOTE DETAIL PANEL ============
function CreditNoteDetail({ creditNoteId, onClose, onRefresh }: {
    creditNoteId: string; onClose: () => void; onRefresh: () => void
}) {
    const { user } = useAuthStore()
    const [creditNote, setCreditNote] = useState<CreditNote | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)

    useEffect(() => { loadCreditNote() }, [creditNoteId])

    const loadCreditNote = async () => {
        try {
            setLoading(true)
            setCreditNote(await getCreditNoteById(creditNoteId))
        } catch (err: any) { toast.error(err.message) }
        finally { setLoading(false) }
    }

    const handleApprove = async () => {
        try {
            setUpdating(true)
            await approveCreditNote(creditNoteId, user?.id)
            toast.success('Credit note approved! Invoice adjusted and inventory updated.')
            loadCreditNote(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handleStatusChange = async (status: string) => {
        try {
            setUpdating(true)
            await updateCreditNoteStatus(creditNoteId, status)
            toast.success(`Credit note ${status}!`)
            loadCreditNote(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    if (loading) return (
        <div className="glass-card p-8"><div className="animate-pulse space-y-4">
            <div className="h-6 bg-dark-200 rounded w-1/3" />
            <div className="h-32 bg-dark-200 rounded" />
        </div></div>
    )

    if (!creditNote) return null

    const hasInventoryReturns = creditNote.items?.some(item => item.return_to_inventory && item.quantity > 0)

    return (
        <div className="glass-card h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-300/50">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-white">{creditNote.credit_note_number}</h2>
                        <CNStatusBadge status={creditNote.status} />
                    </div>
                    <p className="text-xs text-dark-500 mt-1">{formatDate(creditNote.issue_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                    {creditNote.status === 'draft' && (
                        <Button size="sm" variant="success" onClick={handleApprove} isLoading={updating} icon={<Check size={14} />}>Approve</Button>
                    )}
                    {creditNote.status === 'draft' && (
                        <Button size="sm" variant="danger" onClick={() => handleStatusChange('cancelled')} isLoading={updating} icon={<XCircle size={14} />}>Cancel</Button>
                    )}
                    {creditNote.status === 'cancelled' && (
                        <Button size="sm" variant="secondary" onClick={() => handleStatusChange('draft')} isLoading={updating} icon={<RotateCcw size={14} />}>Reopen</Button>
                    )}
                    <button onClick={onClose} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200"><X size={16} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Approved Badge */}
                {creditNote.status === 'approved' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                        <Check size={20} className="text-emerald-400" />
                        <div>
                            <p className="text-sm font-medium text-emerald-400">Approved</p>
                            <p className="text-xs text-dark-500">Invoice adjusted • {hasInventoryReturns ? 'Items returned to inventory' : 'No inventory adjustments'}</p>
                        </div>
                    </div>
                )}

                {/* Linked Invoice */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">Linked Invoice</p>
                    <p className="text-sm font-medium text-white">{creditNote.invoice_number}</p>
                </div>

                {/* Customer Info */}
                <div className="bg-dark-200/20 rounded-xl p-4">
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-2">Customer</p>
                    <p className="text-sm font-medium text-white">{creditNote.customer_name}</p>
                    {creditNote.customer_phone && <p className="text-xs text-dark-500">{creditNote.customer_phone}</p>}
                    {creditNote.customer_gst && <p className="text-xs text-dark-500">GST: {creditNote.customer_gst}</p>}
                </div>

                {/* Reason */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                        <AlertCircle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1">Reason for Credit</p>
                            <p className="text-sm text-white">{creditNote.reason}</p>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div>
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-2">Items Being Credited</p>
                    <table className="w-full text-sm">
                        <thead className="text-xs text-dark-500 border-b border-dark-300/30">
                            <tr>
                                <th className="text-left py-2">Product</th>
                                <th className="text-center py-2">Qty</th>
                                <th className="text-right py-2">Price</th>
                                <th className="text-center py-2">To Inv</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-300/30">
                            {(creditNote.items || []).map(item => (
                                <tr key={item.id}>
                                    <td className="py-2">
                                        <p className="text-white">{item.product_name}</p>
                                        <p className="text-xs text-dark-500">{item.product_sku}</p>
                                        {item.batch_number && <p className="text-xs text-brand-400">Batch: {item.batch_number}</p>}
                                    </td>
                                    <td className="py-2 text-center text-dark-500">{item.quantity}</td>
                                    <td className="py-2 text-right font-mono text-white">{formatCurrency(item.total_amount)}</td>
                                    <td className="py-2 text-center">
                                        {item.return_to_inventory ? (
                                            <Package size={14} className="text-emerald-400 mx-auto" />
                                        ) : (
                                            <span className="text-xs text-dark-500">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="bg-dark-200/20 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-dark-500">Subtotal</span>
                        <span className="font-mono text-white">{formatCurrency(creditNote.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-dark-500">Tax</span>
                        <span className="font-mono text-white">{formatCurrency(creditNote.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-dark-300/30">
                        <span className="text-white font-medium">Total Credit</span>
                        <span className="font-mono font-bold text-brand-400">{formatCurrency(creditNote.total_amount)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ============ MAIN PAGE ============
export function CreditNotesPage() {
    const { user } = useAuthStore()
    const [creditNotes, setCreditNotes] = useState<CreditNote[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 25

    // Modals
    const [showModal, setShowModal] = useState(false)
    const [selectedCNId, setSelectedCNId] = useState<string | null>(null)
    const [deletingCN, setDeletingCN] = useState<CreditNote | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [formData, setFormData] = useState<CreditNoteFormData>(EMPTY_CN_FORM)
    const [eligibleInvoices, setEligibleInvoices] = useState<{ id: string; invoice_number: string; customer_name: string; total_amount: number; paid_amount: number }[]>([])
    const [invoiceItems, setInvoiceItems] = useState<any[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [stats, setStats] = useState({ total: 0, draft: 0, approved: 0, cancelled: 0, totalValue: 0 })

    const fetchEligibleInvoices = async () => {
        try {
            const invoices = await getInvoicesForCreditNote()
            setEligibleInvoices(invoices)
        } catch (err: any) { toast.error(err.message) }
    }

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getCreditNotes({ page, pageSize }, { status: statusFilter, search }),
                getCreditNoteStats(),
            ])
            setCreditNotes(result.data)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
        } catch (err: any) { toast.error(err.message) }
        finally { setIsLoading(false) }
    }, [page, statusFilter, search])

    useEffect(() => { fetchData(); fetchEligibleInvoices() }, [fetchData])
    useEffect(() => { const t = setTimeout(() => { setPage(1); fetchData() }, 300); return () => clearTimeout(t) }, [search])

    // Load invoice items when invoice selected
    useEffect(() => {
        if (formData.invoice_id) {
            loadInvoiceItems(formData.invoice_id)
        } else {
            setInvoiceItems([])
            setFormData(p => ({ ...p, items: [] }))
        }
    }, [formData.invoice_id])

    const loadInvoiceItems = async (invoiceId: string) => {
        try {
            const items = await getInvoiceItemsForCN(invoiceId)
            setInvoiceItems(items)
            // Initialize CN items from invoice items
            setFormData(p => ({
                ...p,
                items: items.map((item: any) => ({
                    product_id: item.product_id,
                    quantity: 0,
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate,
                    tax_amount: 0,
                    total_amount: 0,
                    return_to_inventory: true,
                    batch_number: item.batch_number || '',
                    product_name: item.product_name,
                    product_sku: item.product_sku,
                    max_quantity: item.max_quantity,
                }))
            }))
        } catch (err: any) { toast.error(err.message) }
    }

    const handleSave = async () => {
        if (!formData.invoice_id) { toast.error('Select invoice'); return }
        if (!formData.reason.trim()) { toast.error('Enter reason for credit note'); return }
        if (formData.items.length === 0 || formData.items.every(i => i.quantity === 0)) { toast.error('Add at least one item with quantity'); return }

        // Filter out items with 0 quantity
        const validItems = formData.items.filter(item => item.quantity > 0)

        try {
            setIsSaving(true)
            await createCreditNote({ ...formData, items: validItems }, user?.id)
            toast.success('Credit note created!')
            setShowModal(false); setFormData(EMPTY_CN_FORM); setInvoiceItems([]); fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const handleDelete = async () => {
        if (!deletingCN) return
        try {
            setIsDeleting(true)
            await deleteCreditNote(deletingCN.id)
            toast.success('Deleted!')
            setDeletingCN(null)
            if (selectedCNId === deletingCN.id) setSelectedCNId(null)
            fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsDeleting(false) }
    }

    const updateItem = (index: number, field: keyof CreditNoteItem, value: any) => {
        setFormData(p => {
            const items = [...p.items]
            items[index] = { ...items[index], [field]: value }
            
            // Recalculate if quantity or price changed
            if (field === 'quantity' || field === 'unit_price' || field === 'tax_rate') {
                items[index] = calculateCNItem(items[index])
            }
            
            return { ...p, items }
        })
    }

    const handleExport = () => {
        const rows = creditNotes.map(cn => ({
            credit_note_number: cn.credit_note_number,
            invoice_number: cn.invoice_number,
            customer: cn.customer_name,
            issue_date: formatDate(cn.issue_date),
            status: cn.status,
            total: cn.total_amount,
        }))
        exportToCSV(rows, [
            { key: 'credit_note_number', label: 'Credit Note #' },
            { key: 'invoice_number', label: 'Invoice #' },
            { key: 'customer', label: 'Customer' },
            { key: 'issue_date', label: 'Issue Date' },
            { key: 'status', label: 'Status' },
            { key: 'total', label: 'Total' },
        ], 'credit_notes')
        toast.success('Credit notes exported!')
    }

    const selectedInvoice = eligibleInvoices.find(inv => inv.id === formData.invoice_id)
    const totals = calculateCNTotals(formData.items.filter(i => i.quantity > 0))

    return (
        <div className="space-y-6">
            <PageHeader title="Credit Notes"
                description={`${stats.total} credit notes • Value: ${formatCurrency(stats.totalValue)}`}
                actions={<div className="flex items-center gap-3">
                    <Button variant="secondary" icon={<Download size={16} />} size="sm" onClick={handleExport}>Export CSV</Button>
                    <Button icon={<Plus size={16} />} onClick={() => { setFormData(EMPTY_CN_FORM); setInvoiceItems([]); setShowModal(true) }}>New Credit Note</Button>
                </div>} />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total CN', value: stats.total, color: 'text-blue-400' },
                    { label: 'Draft', value: stats.draft, color: 'text-dark-500' },
                    { label: 'Approved', value: stats.approved, color: 'text-emerald-400' },
                    { label: 'Value', value: formatCurrency(stats.totalValue), color: 'text-brand-400' },
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
                    <Input placeholder="Search credit note number..." value={search}
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
            <div className={cn('flex gap-6', selectedCNId ? 'items-start' : '')}>
                <div className={cn('transition-all duration-300', selectedCNId ? 'w-1/2' : 'w-full')}>
                    {isLoading ? (
                        <div className="glass-card p-8"><div className="animate-pulse space-y-3">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-dark-200 rounded-lg" />)}
                        </div></div>
                    ) : creditNotes.length === 0 ? (
                        <EmptyState icon={<ReceiptRefund size={48} />} title="No credit notes"
                            description="Create a credit note to process refunds" actionLabel="New Credit Note"
                            onAction={() => { setFormData(EMPTY_CN_FORM); setInvoiceItems([]); setShowModal(true) }} />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead><tr className="border-b border-dark-300/50">
                                    {['CN #', 'Invoice #', 'Customer', 'Date', 'Amount', 'Status', ''].map(h => (
                                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-dark-300/30">
                                    {creditNotes.map(note => (
                                        <tr key={note.id} onClick={() => setSelectedCNId(note.id)}
                                            className={cn('hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                selectedCNId === note.id && 'bg-brand-500/5 border-l-2 border-brand-500')}>
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-medium text-brand-400 font-mono">{note.credit_note_number}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm text-blue-400 font-mono">{note.invoice_number}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm text-white">{note.customer_name}</p>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-dark-500">{formatDate(note.issue_date)}</td>
                                            <td className="px-3 py-3 text-sm font-mono font-semibold text-white">{formatCurrency(note.total_amount)}</td>
                                            <td className="px-3 py-3"><CNStatusBadge status={note.status} /></td>
                                            <td className="px-3 py-3">
                                                {note.status === 'draft' && (
                                                    <button onClick={(e) => { e.stopPropagation(); setDeletingCN(note) }}
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

                {selectedCNId && (
                    <div className="w-1/2 sticky top-20">
                        <CreditNoteDetail creditNoteId={selectedCNId}
                            onClose={() => setSelectedCNId(null)}
                            onRefresh={fetchData} />
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); setInvoiceItems([]) }}
                title="New Credit Note"
                size="xl"
                footer={<div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={() => { setShowModal(false); setInvoiceItems([]) }}>Cancel</Button>
                    <Button onClick={handleSave} isLoading={isSaving} icon={<Save size={16} />}>Save as Draft</Button>
                </div>}>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {/* Invoice Selection */}
                    <Select label="Invoice *" value={formData.invoice_id}
                        onChange={(e) => setFormData(p => ({ ...p, invoice_id: e.target.value }))}
                        options={eligibleInvoices.map(inv => ({ 
                            value: inv.id, 
                            label: `${inv.invoice_number} - ${inv.customer_name} (Paid: ${formatCurrency(inv.paid_amount)})` 
                        }))}
                        placeholder="Select invoice for credit" />

                    {selectedInvoice && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                            <p className="text-sm text-blue-400 font-medium">{selectedInvoice.invoice_number}</p>
                            <p className="text-xs text-dark-500">Customer: {selectedInvoice.customer_name}</p>
                            <p className="text-xs text-dark-500">Paid: {formatCurrency(selectedInvoice.paid_amount)}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Issue Date *" type="date" value={formData.issue_date}
                            onChange={(e) => setFormData(p => ({ ...p, issue_date: e.target.value }))} />
                    </div>

                    <Textarea label="Reason for Credit *" value={formData.reason}
                        onChange={(e) => setFormData(p => ({ ...p, reason: e.target.value }))} 
                        placeholder="Enter reason for issuing this credit note..." rows={2} />

                    {/* Items */}
                    {invoiceItems.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-white mb-3">Select Items to Credit</p>
                            <div className="space-y-3">
                                {formData.items.map((item, idx) => (
                                    <div key={idx} className="bg-dark-200/30 rounded-lg p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-white">{item.product_name}</p>
                                                <p className="text-xs text-dark-500">{item.product_sku} • Max: {invoiceItems[idx]?.max_quantity || 0}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-dark-500">Price: {formatCurrency(item.unit_price)}</p>
                                                <p className="text-xs text-dark-500">Tax: {item.tax_rate}%</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-4 gap-3 items-end">
                                            <Input label="Return Qty" type="number" value={item.quantity}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value)
                                                    const max = invoiceItems[idx]?.max_quantity || 0
                                                    if (val <= max) {
                                                        updateItem(idx, 'quantity', val)
                                                    }
                                                }}
                                                max={invoiceItems[idx]?.max_quantity || 0} />
                                            <div>
                                                <p className="text-[10px] text-dark-500 uppercase mb-1">Tax Amount</p>
                                                <p className="text-sm font-mono text-white">{formatCurrency(item.tax_amount)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-dark-500 uppercase mb-1">Total</p>
                                                <p className="text-sm font-mono text-brand-400">{formatCurrency(item.total_amount)}</p>
                                            </div>
                                            <div className="flex items-center gap-2 pb-2">
                                                <input type="checkbox" id={`return-${idx}`} 
                                                    checked={item.return_to_inventory}
                                                    onChange={(e) => updateItem(idx, 'return_to_inventory', e.target.checked)}
                                                    className="rounded border-dark-300" />
                                                <label htmlFor={`return-${idx}`} className="text-xs text-dark-500 cursor-pointer">Return to Inventory</label>
                                            </div>
                                        </div>
                                        
                                        <Input label="Batch Number" value={item.batch_number}
                                            onChange={(e) => updateItem(idx, 'batch_number', e.target.value)} placeholder="Optional" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {formData.invoice_id && invoiceItems.length === 0 && (
                        <div className="text-center py-4">
                            <p className="text-sm text-dark-500">No items found for this invoice</p>
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
                                <span className="text-white font-medium">Total Credit</span>
                                <span className="font-mono font-bold text-brand-400">{formatCurrency(totals.total_amount)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Delete Modal */}
            {deletingCN && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeletingCN(null)}>
                    <div className="glass-card p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-2">Delete Credit Note?</h3>
                        <p className="text-sm text-dark-500 mb-4">
                            Delete {deletingCN.credit_note_number}? This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setDeletingCN(null)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
