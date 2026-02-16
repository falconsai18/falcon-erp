import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Search, Download, Trash2, X, Save, ChevronLeft, ChevronRight,
    FileText, Send, Check, XCircle, RotateCcw, Calendar, IndianRupee,
    RefreshCw, ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
    getQuotations, getQuotationById, createQuotation, updateQuotation, deleteQuotation,
    updateQuotationStatus, convertToSalesOrder, getQuotationStats,
    calculateQuotationItem, calculateQuotationTotals,
    type Quotation, type QuotationItem, type QuotationFormData, EMPTY_QUOTATION_FORM,
} from '@/services/quotationService'
import { exportToCSV } from '@/services/exportService'

// ============ QUOTATION STATUS BADGE ============
function QuotationStatusBadge({ status }: { status: string }) {
    const config: Record<string, { variant: any; label: string }> = {
        draft: { variant: 'default', label: 'Draft' },
        sent: { variant: 'info', label: 'Sent' },
        accepted: { variant: 'success', label: 'Accepted' },
        rejected: { variant: 'danger', label: 'Rejected' },
        expired: { variant: 'warning', label: 'Expired' },
        converted: { variant: 'purple', label: 'Converted' },
    }
    const c = config[status] || config.draft
    return <Badge variant={c.variant}>{c.label}</Badge>
}

// ============ QUOTATION DETAIL PANEL ============
function QuotationDetail({ quotationId, onClose, onRefresh }: {
    quotationId: string; onClose: () => void; onRefresh: () => void
}) {
    const [quotation, setQuotation] = useState<Quotation | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)

    useEffect(() => { loadQuotation() }, [quotationId])

    const loadQuotation = async () => {
        try {
            setLoading(true)
            setQuotation(await getQuotationById(quotationId))
        } catch (err: any) { toast.error(err.message) }
        finally { setLoading(false) }
    }

    const handleStatusChange = async (status: string) => {
        try {
            setUpdating(true)
            await updateQuotationStatus(quotationId, status)
            toast.success(`Quotation ${status}!`)
            loadQuotation(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handleConvert = async () => {
        try {
            setUpdating(true)
            const salesOrder = await convertToSalesOrder(quotationId)
            toast.success(`Converted to Sales Order ${salesOrder.order_number}!`)
            loadQuotation(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    if (loading) return (
        <div className="glass-card p-8"><div className="animate-pulse space-y-4">
            <div className="h-6 bg-dark-200 rounded w-1/3" />
            <div className="h-32 bg-dark-200 rounded" />
        </div></div>
    )

    if (!quotation) return null

    return (
        <div className="glass-card h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-300/50">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-white">{quotation.quotation_number}</h2>
                        <QuotationStatusBadge status={quotation.status} />
                    </div>
                    <p className="text-xs text-dark-500 mt-1">{quotation.customer_name} • Valid until {quotation.valid_until ? formatDate(quotation.valid_until) : 'N/A'}</p>
                </div>
                <div className="flex items-center gap-2">
                    {quotation.status === 'draft' && (
                        <Button size="sm" onClick={() => handleStatusChange('sent')} isLoading={updating} icon={<Send size={14} />}>Send</Button>
                    )}
                    {quotation.status === 'sent' && (
                        <>
                            <Button size="sm" variant="success" onClick={() => handleStatusChange('accepted')} isLoading={updating} icon={<Check size={14} />}>Accept</Button>
                            <Button size="sm" variant="danger" onClick={() => handleStatusChange('rejected')} isLoading={updating} icon={<XCircle size={14} />}>Reject</Button>
                        </>
                    )}
                    {quotation.status === 'accepted' && (
                        <Button size="sm" onClick={handleConvert} isLoading={updating} icon={<ArrowRight size={14} />} className="bg-purple-500 hover:bg-purple-600 text-white">Convert to SO</Button>
                    )}
                    {quotation.status === 'rejected' && (
                        <Button size="sm" variant="secondary" onClick={() => handleStatusChange('draft')} isLoading={updating} icon={<RotateCcw size={14} />}>Reopen</Button>
                    )}
                    <button onClick={onClose} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200"><X size={16} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Customer Info */}
                <div className="bg-dark-200/20 rounded-xl p-4">
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-2">Customer</p>
                    <p className="text-sm font-medium text-white">{quotation.customer_name}</p>
                    {quotation.customer_phone && <p className="text-xs text-dark-500">{quotation.customer_phone}</p>}
                    {quotation.customer_gst && <p className="text-xs text-dark-500">GST: {quotation.customer_gst}</p>}
                </div>

                {/* Items Table */}
                <div>
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-2">Items</p>
                    <table className="w-full text-sm">
                        <thead className="text-xs text-dark-500 border-b border-dark-300/30">
                            <tr>
                                <th className="text-left py-2">Product</th>
                                <th className="text-center py-2">Qty</th>
                                <th className="text-right py-2">Price</th>
                                <th className="text-right py-2">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-300/30">
                            {(quotation.items || []).map(item => (
                                <tr key={item.id}>
                                    <td className="py-2">
                                        <p className="text-white">{item.product_name}</p>
                                        <p className="text-xs text-dark-500">{item.product_sku}</p>
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
                        <span className="font-mono text-white">{formatCurrency(quotation.subtotal)}</span>
                    </div>
                    {quotation.discount_amount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-dark-500">Discount</span>
                            <span className="font-mono text-emerald-400">-{formatCurrency(quotation.discount_amount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm">
                        <span className="text-dark-500">Tax</span>
                        <span className="font-mono text-white">{formatCurrency(quotation.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-dark-300/30">
                        <span className="text-white font-medium">Total</span>
                        <span className="font-mono font-bold text-brand-400">{formatCurrency(quotation.total_amount)}</span>
                    </div>
                </div>

                {/* Notes */}
                {quotation.notes && (
                    <div className="bg-dark-200/20 rounded-xl p-4">
                        <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-sm text-dark-500">{quotation.notes}</p>
                    </div>
                )}

                {/* Linked Sales Order */}
                {quotation.sales_order_id && (
                    <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4">
                        <p className="text-[10px] text-brand-400 uppercase tracking-wider mb-1">Converted to Sales Order</p>
                        <p className="text-sm text-white">This quotation has been converted to a sales order.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ============ MAIN PAGE ============
export function QuotationsPage() {
    const { user } = useAuthStore()
    const [quotations, setQuotations] = useState<Quotation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 25

    // Modals
    const [showModal, setShowModal] = useState(false)
    const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null)
    const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null)
    const [deletingQuotation, setDeletingQuotation] = useState<Quotation | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [formData, setFormData] = useState<QuotationFormData>(EMPTY_QUOTATION_FORM)
    const [customers, setCustomers] = useState<{ value: string; label: string }[]>([])
    const [products, setProducts] = useState<{ value: string; label: string; unit_price: number; tax_rate: number }[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [stats, setStats] = useState({ total: 0, draft: 0, sent: 0, accepted: 0, rejected: 0, expired: 0, converted: 0, totalValue: 0 })

    const fetchCustomers = async () => {
        const { data } = await supabase.from('customers').select('id, name').eq('status', 'active').order('name')
        setCustomers((data || []).map((c: any) => ({ value: c.id, label: c.name })))
    }

    const fetchProducts = async () => {
        const { data } = await supabase.from('products').select('id, name, selling_price, tax_rate').eq('status', 'active').order('name')
        setProducts((data || []).map((p: any) => ({ value: p.id, label: p.name, unit_price: p.selling_price || 0, tax_rate: p.tax_rate || 0 })))
    }

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getQuotations({ page, pageSize }, { status: statusFilter, search }),
                getQuotationStats(),
            ])
            setQuotations(result.data)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
        } catch (err: any) { toast.error(err.message) }
        finally { setIsLoading(false) }
    }, [page, statusFilter, search])

    useEffect(() => { fetchData(); fetchCustomers(); fetchProducts() }, [fetchData])
    useEffect(() => { const t = setTimeout(() => { setPage(1); fetchData() }, 300); return () => clearTimeout(t) }, [search])

    const handleSave = async () => {
        if (!formData.customer_id) { toast.error('Select customer'); return }
        if (formData.items.length === 0) { toast.error('Add at least one item'); return }

        try {
            setIsSaving(true)
            if (editingQuotation) {
                await updateQuotation(editingQuotation.id, formData)
                toast.success('Quotation updated!')
            } else {
                await createQuotation(formData, user?.id)
                toast.success('Quotation created!')
            }
            setShowModal(false); setEditingQuotation(null); setFormData(EMPTY_QUOTATION_FORM); fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const handleDelete = async () => {
        if (!deletingQuotation) return
        try {
            setIsDeleting(true)
            await deleteQuotation(deletingQuotation.id)
            toast.success('Deleted!')
            setDeletingQuotation(null)
            if (selectedQuotationId === deletingQuotation.id) setSelectedQuotationId(null)
            fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsDeleting(false) }
    }

    const openEdit = (q: Quotation) => {
        setEditingQuotation(q)
        setFormData({
            customer_id: q.customer_id,
            quotation_date: q.quotation_date,
            valid_until: q.valid_until || '',
            notes: q.notes || '',
            items: q.items?.map(item => ({ ...item })) || [],
        })
        setShowModal(true)
    }

    const addItem = () => {
        setFormData(p => ({
            ...p,
            items: [...p.items, { product_id: '', quantity: 1, unit_price: 0, discount_percent: 0, tax_rate: 0, tax_amount: 0, total_amount: 0 }],
        }))
    }

    const removeItem = (index: number) => {
        setFormData(p => ({ ...p, items: p.items.filter((_, i) => i !== index) }))
    }

    const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
        setFormData(p => {
            const items = [...p.items]
            items[index] = { ...items[index], [field]: value }

            // Auto-fill price and tax when product selected
            if (field === 'product_id') {
                const prod = products.find(p => p.value === value)
                if (prod) {
                    items[index].unit_price = prod.unit_price
                    items[index].tax_rate = prod.tax_rate
                }
            }

            // Recalculate line item
            items[index] = calculateQuotationItem(items[index])

            return { ...p, items }
        })
    }

    const totals = calculateQuotationTotals(formData.items)

    const handleExport = () => {
        const rows = quotations.map(q => ({
            quotation_number: q.quotation_number,
            customer: q.customer_name,
            date: formatDate(q.quotation_date),
            valid_until: q.valid_until ? formatDate(q.valid_until) : '-',
            status: q.status,
            total: q.total_amount,
        }))
        exportToCSV(rows, [
            { key: 'quotation_number', label: 'Quotation #' },
            { key: 'customer', label: 'Customer' },
            { key: 'date', label: 'Date' },
            { key: 'valid_until', label: 'Valid Until' },
            { key: 'status', label: 'Status' },
            { key: 'total', label: 'Total' },
        ], 'quotations')
        toast.success('Quotations exported!')
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Quotations"
                description={`${stats.total} quotations • Value: ${formatCurrency(stats.totalValue)}`}
                actions={<div className="flex items-center gap-3">
                    <Button variant="secondary" icon={<Download size={16} />} size="sm" onClick={handleExport}>Export CSV</Button>
                    <Button icon={<Plus size={16} />} onClick={() => { setEditingQuotation(null); setFormData(EMPTY_QUOTATION_FORM); setShowModal(true) }}>New Quotation</Button>
                </div>} />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Total', value: stats.total, color: 'text-blue-400' },
                    { label: 'Draft', value: stats.draft, color: 'text-dark-500' },
                    { label: 'Sent', value: stats.sent, color: 'text-amber-400' },
                    { label: 'Accepted', value: stats.accepted, color: 'text-emerald-400' },
                    { label: 'Converted', value: stats.converted, color: 'text-purple-400' },
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
                    <Input placeholder="Search quotation number..." value={search}
                        onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
                </div>
                <div className="flex items-center gap-2">
                    {['all', 'draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'].map(s => (
                        <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                statusFilter === s ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Split View */}
            <div className={cn('flex gap-6', selectedQuotationId ? 'items-start' : '')}>
                <div className={cn('transition-all duration-300', selectedQuotationId ? 'w-1/2' : 'w-full')}>
                    {isLoading ? (
                        <div className="glass-card p-8"><div className="animate-pulse space-y-3">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-dark-200 rounded-lg" />)}
                        </div></div>
                    ) : quotations.length === 0 ? (
                        <EmptyState icon={<FileText size={48} />} title="No quotations"
                            description="Create a quotation to get started" actionLabel="New Quotation"
                            onAction={() => { setEditingQuotation(null); setFormData(EMPTY_QUOTATION_FORM); setShowModal(true) }} />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead><tr className="border-b border-dark-300/50">
                                    {['Quotation #', 'Customer', 'Date', 'Valid Until', 'Amount', 'Status', ''].map(h => (
                                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-dark-300/30">
                                    {quotations.map(q => (
                                        <tr key={q.id} onClick={() => setSelectedQuotationId(q.id)}
                                            className={cn('hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                selectedQuotationId === q.id && 'bg-brand-500/5 border-l-2 border-brand-500')}>
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-medium text-brand-400 font-mono">{q.quotation_number}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm text-white">{q.customer_name}</p>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-dark-500">{formatDate(q.quotation_date)}</td>
                                            <td className="px-3 py-3 text-sm text-dark-500">{q.valid_until ? formatDate(q.valid_until) : '-'}</td>
                                            <td className="px-3 py-3 text-sm font-mono font-semibold text-white">{formatCurrency(q.total_amount)}</td>
                                            <td className="px-3 py-3"><QuotationStatusBadge status={q.status} /></td>
                                            <td className="px-3 py-3">
                                                {q.status === 'draft' && (
                                                    <button onClick={(e) => { e.stopPropagation(); setDeletingQuotation(q) }}
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

                {selectedQuotationId && (
                    <div className="w-1/2 sticky top-20">
                        <QuotationDetail quotationId={selectedQuotationId}
                            onClose={() => setSelectedQuotationId(null)}
                            onRefresh={fetchData} />
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingQuotation(null) }}
                title={editingQuotation ? 'Edit Quotation' : 'New Quotation'}
                size="xl"
                footer={<div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={() => { setShowModal(false); setEditingQuotation(null) }}>Cancel</Button>
                    <Button onClick={handleSave} isLoading={isSaving} icon={<Save size={16} />}>Save</Button>
                </div>}>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="grid grid-cols-3 gap-4">
                        <Select label="Customer *" value={formData.customer_id}
                            onChange={(e) => setFormData(p => ({ ...p, customer_id: e.target.value }))}
                            options={customers} placeholder="Select customer" />
                        <Input label="Quotation Date *" type="date" value={formData.quotation_date}
                            onChange={(e) => setFormData(p => ({ ...p, quotation_date: e.target.value }))} />
                        <Input label="Valid Until *" type="date" value={formData.valid_until}
                            onChange={(e) => setFormData(p => ({ ...p, valid_until: e.target.value }))} />
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-white">Items</p>
                            <Button size="sm" variant="secondary" onClick={addItem} icon={<Plus size={14} />}>Add Item</Button>
                        </div>
                        <div className="space-y-2">
                            {formData.items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-dark-200/30 rounded-lg p-3">
                                    <div className="col-span-4">
                                        <Select label="Product" value={item.product_id}
                                            onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                                            options={products} placeholder="Select product" />
                                    </div>
                                    <div className="col-span-2">
                                        <Input label="Qty" type="number" value={item.quantity}
                                            onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} />
                                    </div>
                                    <div className="col-span-2">
                                        <Input label="Price (₹)" type="number" value={item.unit_price}
                                            onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))} />
                                    </div>
                                    <div className="col-span-2">
                                        <Input label="Disc %" type="number" value={item.discount_percent}
                                            onChange={(e) => updateItem(idx, 'discount_percent', Number(e.target.value))} />
                                    </div>
                                    <div className="col-span-1">
                                        <p className="text-[10px] text-dark-500 uppercase">Tax</p>
                                        <p className="text-sm font-mono text-dark-500">{item.tax_rate}%</p>
                                    </div>
                                    <div className="col-span-1">
                                        <button onClick={() => removeItem(idx)}
                                            className="p-2 rounded-lg text-dark-500 hover:text-red-400 hover:bg-dark-200"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                            {formData.items.length === 0 && (
                                <p className="text-sm text-dark-500 text-center py-4">No items added</p>
                            )}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="bg-dark-200/20 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-dark-500">Subtotal</span>
                            <span className="font-mono text-white">{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-dark-500">Discount</span>
                            <span className="font-mono text-emerald-400">-{formatCurrency(totals.discount_amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-dark-500">Tax</span>
                            <span className="font-mono text-white">{formatCurrency(totals.tax_amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-dark-300/30">
                            <span className="text-white font-medium">Total</span>
                            <span className="font-mono font-bold text-brand-400">{formatCurrency(totals.total_amount)}</span>
                        </div>
                    </div>

                    <Textarea label="Notes" value={formData.notes}
                        onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>
            </Modal>

            {/* Delete Modal */}
            {deletingQuotation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeletingQuotation(null)}>
                    <div className="glass-card p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-2">Delete Quotation?</h3>
                        <p className="text-sm text-dark-500 mb-4">
                            Delete {deletingQuotation.quotation_number}? This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setDeletingQuotation(null)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
