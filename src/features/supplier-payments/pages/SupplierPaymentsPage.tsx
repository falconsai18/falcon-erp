import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Search, Download, Trash2, X, Save, ChevronLeft, ChevronRight,
    FileText, Check, Wallet, RotateCcw, Calendar, IndianRupee,
    Building2, ArrowRight, AlertCircle, Receipt, CreditCard,
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
    getSupplierBills, getSupplierBillById, createSupplierBill, deleteSupplierBill,
    updateSupplierBillStatus, recordSupplierPayment, getSupplierBillStats,
    getUnbilledPurchaseOrders, getPOItemsForBill, getBillsForPayment,
    getPaymentMethods, deleteSupplierPayment, getSupplierPayments,
    calculateBillItem, calculateBillTotals,
    type SupplierBill, type SupplierBillItem, type SupplierBillFormData, type SupplierPayment,
    EMPTY_BILL_FORM,
} from '@/services/supplierPaymentService'
import { getSuppliers } from '@/services/supplierService'
import { exportToCSV } from '@/services/exportService'

// ============ BILL STATUS BADGE ============
function BillStatusBadge({ status }: { status: string }) {
    const config: Record<string, { variant: any; label: string }> = {
        unpaid: { variant: 'warning', label: 'Unpaid' },
        partial: { variant: 'info', label: 'Partial' },
        paid: { variant: 'success', label: 'Paid' },
        overdue: { variant: 'danger', label: 'Overdue' },
        cancelled: { variant: 'default', label: 'Cancelled' },
    }
    const c = config[status] || config.unpaid
    return <Badge variant={c.variant}>{c.label}</Badge>
}

// ============ SUPPLIER BILL DETAIL PANEL ============
function SupplierBillDetail({ billId, onClose, onRefresh }: {
    billId: string; onClose: () => void; onRefresh: () => void
}) {
    const { user } = useAuthStore()
    const [bill, setBill] = useState<SupplierBill | null>(null)
    const [payments, setPayments] = useState<SupplierPayment[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentForm, setPaymentForm] = useState({
        amount: 0,
        payment_method: 'bank_transfer',
        reference_number: '',
        notes: '',
    })
    const [paymentMethods, setPaymentMethods] = useState<string[]>([])

    useEffect(() => { loadBill(); loadPaymentMethods() }, [billId])

    const loadPaymentMethods = async () => {
        try {
            const methods = await getPaymentMethods()
            setPaymentMethods(methods)
        } catch (err: any) { toast.error(err.message) }
    }

    const loadBill = async () => {
        try {
            setLoading(true)
            const [billData, paymentsData] = await Promise.all([
                getSupplierBillById(billId),
                getSupplierPayments({ page: 1, pageSize: 100 }, { bill_id: billId }),
            ])
            setBill(billData)
            setPayments(paymentsData.data)
        } catch (err: any) { toast.error(err.message) }
        finally { setLoading(false) }
    }

    const handleRecordPayment = async () => {
        if (!paymentForm.amount || paymentForm.amount <= 0) {
            toast.error('Enter valid amount')
            return
        }
        if (!bill) return

        try {
            setUpdating(true)
            await recordSupplierPayment(
                billId,
                paymentForm.amount,
                paymentForm.payment_method,
                paymentForm.reference_number,
                paymentForm.notes,
                user?.id
            )
            toast.success('Payment recorded successfully!')
            setShowPaymentModal(false)
            setPaymentForm({ amount: 0, payment_method: 'bank_transfer', reference_number: '', notes: '' })
            loadBill(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handleDeletePayment = async (paymentId: string) => {
        if (!confirm('Delete this payment?')) return
        try {
            setUpdating(true)
            await deleteSupplierPayment(paymentId)
            toast.success('Payment deleted!')
            loadBill(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handleStatusChange = async (status: string) => {
        try {
            setUpdating(true)
            await updateSupplierBillStatus(billId, status)
            toast.success(`Bill ${status}!`)
            loadBill(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    if (loading) return (
        <div className="glass-card p-8"><div className="animate-pulse space-y-4">
            <div className="h-6 bg-dark-200 rounded w-1/3" />
            <div className="h-32 bg-dark-200 rounded" />
        </div></div>
    )

    if (!bill) return null

    const remainingBalance = bill.total_amount - (bill.paid_amount || 0)

    return (
        <div className="glass-card h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-300/50">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-white">{bill.bill_number}</h2>
                        <BillStatusBadge status={bill.status} />
                    </div>
                    <p className="text-xs text-dark-500 mt-1">{formatDate(bill.bill_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                    {remainingBalance > 0 && bill.status !== 'cancelled' && (
                        <Button size="sm" onClick={() => setShowPaymentModal(true)} isLoading={updating} icon={<Wallet size={14} />}>Record Payment</Button>
                    )}
                    {bill.status !== 'cancelled' && bill.status !== 'paid' && (
                        <Button size="sm" variant="danger" onClick={() => handleStatusChange('cancelled')} isLoading={updating}>Cancel</Button>
                    )}
                    {bill.status === 'cancelled' && (
                        <Button size="sm" variant="secondary" onClick={() => handleStatusChange('unpaid')} isLoading={updating} icon={<RotateCcw size={14} />}>Reopen</Button>
                    )}
                    <button onClick={onClose} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200"><X size={16} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Payment Modal Inline */}
                {showPaymentModal && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-semibold text-white">Record Payment</p>
                        <p className="text-xs text-dark-500">Remaining: {formatCurrency(remainingBalance)}</p>
                        <div className="grid grid-cols-2 gap-3">
                            <Input 
                                label="Amount *" 
                                type="number" 
                                value={paymentForm.amount}
                                onChange={(e) => setPaymentForm(p => ({ ...p, amount: Number(e.target.value) }))}
                                max={remainingBalance}
                            />
                            <Select 
                                label="Payment Method *" 
                                value={paymentForm.payment_method}
                                onChange={(e) => setPaymentForm(p => ({ ...p, payment_method: e.target.value }))}
                                options={paymentMethods.map(m => ({ value: m, label: m.replace('_', ' ').toUpperCase() }))}
                            />
                        </div>
                        <Input 
                            label="Reference Number" 
                            value={paymentForm.reference_number}
                            onChange={(e) => setPaymentForm(p => ({ ...p, reference_number: e.target.value }))}
                            placeholder="UTR / Cheque No / Transaction ID"
                        />
                        <Textarea 
                            label="Notes" 
                            value={paymentForm.notes}
                            onChange={(e) => setPaymentForm(p => ({ ...p, notes: e.target.value }))}
                            rows={2}
                        />
                        <div className="flex gap-2">
                            <Button onClick={handleRecordPayment} isLoading={updating} icon={<Check size={14} />}>Record Payment</Button>
                            <Button variant="ghost" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
                        </div>
                    </div>
                )}

                {/* Linked PO */}
                {bill.purchase_order_id && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                        <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">Linked Purchase Order</p>
                        <p className="text-sm font-medium text-white">{bill.po_number}</p>
                    </div>
                )}

                {/* Supplier Info */}
                <div className="bg-dark-200/20 rounded-xl p-4">
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-2">Supplier</p>
                    <p className="text-sm font-medium text-white">{bill.supplier_name}</p>
                    {bill.supplier_phone && <p className="text-xs text-dark-500">{bill.supplier_phone}</p>}
                </div>

                {/* Payment Summary */}
                <div className="bg-dark-200/20 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-dark-500">Total Amount</span>
                        <span className="font-mono text-white">{formatCurrency(bill.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-dark-500">Paid Amount</span>
                        <span className="font-mono text-emerald-400">{formatCurrency(bill.paid_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-dark-300/30">
                        <span className="text-white font-medium">Balance</span>
                        <span className={cn('font-mono font-bold', remainingBalance > 0 ? 'text-amber-400' : 'text-emerald-400')}>
                            {formatCurrency(remainingBalance)}
                        </span>
                    </div>
                </div>

                {/* Items Table */}
                <div>
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-2">Bill Items</p>
                    <table className="w-full text-sm">
                        <thead className="text-xs text-dark-500 border-b border-dark-300/30">
                            <tr>
                                <th className="text-left py-2">Description</th>
                                <th className="text-center py-2">Qty</th>
                                <th className="text-right py-2">Price</th>
                                <th className="text-right py-2">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-300/30">
                            {(bill.items || []).map((item, idx) => (
                                <tr key={idx}>
                                    <td className="py-2">
                                        <p className="text-white">{item.description}</p>
                                    </td>
                                    <td className="py-2 text-center text-dark-500">{item.quantity}</td>
                                    <td className="py-2 text-right font-mono text-dark-500">{formatCurrency(item.unit_price)}</td>
                                    <td className="py-2 text-right font-mono text-white">{formatCurrency(item.total_amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Payments History */}
                {payments.length > 0 && (
                    <div>
                        <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-2">Payment History</p>
                        <div className="space-y-2">
                            {payments.map(payment => (
                                <div key={payment.id} className="bg-dark-200/20 rounded-lg p-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-white">{payment.payment_number}</p>
                                        <p className="text-xs text-dark-500">{formatDate(payment.payment_date)} • {payment.payment_method.replace('_', ' ')}</p>
                                        {payment.reference_number && <p className="text-xs text-brand-400">Ref: {payment.reference_number}</p>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-emerald-400">{formatCurrency(payment.amount)}</span>
                                        <button 
                                            onClick={() => handleDeletePayment(payment.id)}
                                            className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-dark-200"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Notes */}
                {bill.notes && (
                    <div className="bg-dark-200/20 rounded-xl p-4">
                        <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-sm text-dark-500">{bill.notes}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ============ MAIN PAGE ============
export function SupplierPaymentsPage() {
    const { user } = useAuthStore()
    const [bills, setBills] = useState<SupplierBill[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 25

    // Modals
    const [showBillModal, setShowBillModal] = useState(false)
    const [selectedBillId, setSelectedBillId] = useState<string | null>(null)
    const [deletingBill, setDeletingBill] = useState<SupplierBill | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [formData, setFormData] = useState<SupplierBillFormData>(EMPTY_BILL_FORM)
    const [unbilledPOs, setUnbilledPOs] = useState<any[]>([])
    const [poItems, setPoItems] = useState<any[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [stats, setStats] = useState({ total: 0, unpaid: 0, partial: 0, paid: 0, overdue: 0, totalValue: 0, totalPaid: 0, totalPending: 0 })

    const fetchUnbilledPOs = async () => {
        try {
            const pos = await getUnbilledPurchaseOrders()
            setUnbilledPOs(pos)
        } catch (err: any) { toast.error(err.message) }
    }

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getSupplierBills({ page, pageSize }, { status: statusFilter, search }),
                getSupplierBillStats(),
            ])
            setBills(result.data)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
        } catch (err: any) { toast.error(err.message) }
        finally { setIsLoading(false) }
    }, [page, statusFilter, search])

    useEffect(() => { fetchData(); fetchUnbilledPOs() }, [fetchData])
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
            const items = await getPOItemsForBill(poId)
            setPoItems(items)
            // Initialize bill items from PO items
            setFormData(p => ({
                ...p,
                items: items.map((item: any) => ({
                    description: item.material_name || item.description,
                    quantity: item.quantity - (item.received_quantity || 0),
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate,
                    tax_amount: 0,
                    total_amount: 0,
                })).filter((item: any) => item.quantity > 0)
            }))
        } catch (err: any) { toast.error(err.message) }
    }

    const handleSaveBill = async () => {
        if (!formData.supplier_id) { toast.error('Select supplier'); return }
        if (formData.items.length === 0) { toast.error('Add at least one item'); return }

        try {
            setIsSaving(true)
            await createSupplierBill(formData, user?.id)
            toast.success('Supplier bill created!')
            setShowBillModal(false); setFormData(EMPTY_BILL_FORM); setPoItems([]); fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const handleDelete = async () => {
        if (!deletingBill) return
        try {
            setIsDeleting(true)
            await deleteSupplierBill(deletingBill.id)
            toast.success('Deleted!')
            setDeletingBill(null)
            if (selectedBillId === deletingBill.id) setSelectedBillId(null)
            fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsDeleting(false) }
    }

    const updateItem = (index: number, field: keyof SupplierBillItem, value: any) => {
        setFormData(p => {
            const items = [...p.items]
            items[index] = { ...items[index], [field]: value }
            
            // Recalculate if quantity or price changed
            if (field === 'quantity' || field === 'unit_price' || field === 'tax_rate') {
                items[index] = calculateBillItem(items[index])
            }
            
            return { ...p, items }
        })
    }

    const handleExport = () => {
        const rows = bills.map(b => ({
            bill_number: b.bill_number,
            po_number: b.po_number,
            supplier: b.supplier_name,
            bill_date: formatDate(b.bill_date),
            status: b.status,
            total: b.total_amount,
            paid: b.paid_amount,
            balance: b.balance_amount,
        }))
        exportToCSV(rows, [
            { key: 'bill_number', label: 'Bill #' },
            { key: 'po_number', label: 'PO #' },
            { key: 'supplier', label: 'Supplier' },
            { key: 'bill_date', label: 'Date' },
            { key: 'status', label: 'Status' },
            { key: 'total', label: 'Total' },
            { key: 'paid', label: 'Paid' },
            { key: 'balance', label: 'Balance' },
        ], 'supplier_bills')
        toast.success('Bills exported!')
    }

    const selectedPO = unbilledPOs.find(po => po.id === formData.purchase_order_id)
    const totals = calculateBillTotals(formData.items)

    return (
        <div className="space-y-6">
            <PageHeader title="Supplier Payments"
                description={`${stats.total} bills • Pending: ${formatCurrency(stats.totalPending)}`}
                actions={<div className="flex items-center gap-3">
                    <Button variant="secondary" icon={<Download size={16} />} size="sm" onClick={handleExport}>Export CSV</Button>
                    <Button icon={<Plus size={16} />} onClick={() => { setFormData(EMPTY_BILL_FORM); setPoItems([]); setShowBillModal(true) }}>New Bill</Button>
                </div>} />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                    { label: 'Total Bills', value: stats.total, color: 'text-blue-400' },
                    { label: 'Unpaid', value: stats.unpaid, color: 'text-amber-400' },
                    { label: 'Partial', value: stats.partial, color: 'text-blue-400' },
                    { label: 'Paid', value: stats.paid, color: 'text-emerald-400' },
                    { label: 'Overdue', value: stats.overdue, color: 'text-red-400' },
                    { label: 'Total Value', value: formatCurrency(stats.totalValue), color: 'text-brand-400' },
                    { label: 'Pending', value: formatCurrency(stats.totalPending), color: 'text-amber-400' },
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
                    <Input placeholder="Search bill number..." value={search}
                        onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
                </div>
                <div className="flex items-center gap-2">
                    {['all', 'unpaid', 'partial', 'paid', 'overdue', 'cancelled'].map(s => (
                        <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                statusFilter === s ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Split View */}
            <div className={cn('flex gap-6', selectedBillId ? 'items-start' : '')}>
                <div className={cn('transition-all duration-300', selectedBillId ? 'w-1/2' : 'w-full')}>
                    {isLoading ? (
                        <div className="glass-card p-8"><div className="animate-pulse space-y-3">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-dark-200 rounded-lg" />)}
                        </div></div>
                    ) : bills.length === 0 ? (
                        <EmptyState icon={<Receipt size={48} />} title="No supplier bills"
                            description="Create bills to track supplier payments" actionLabel="New Bill"
                            onAction={() => { setFormData(EMPTY_BILL_FORM); setPoItems([]); setShowBillModal(true) }} />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead><tr className="border-b border-dark-300/50">
                                    {['Bill #', 'PO #', 'Supplier', 'Date', 'Total', 'Paid', 'Balance', 'Status', ''].map(h => (
                                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-dark-300/30">
                                    {bills.map(bill => (
                                        <tr key={bill.id} onClick={() => setSelectedBillId(bill.id)}
                                            className={cn('hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                selectedBillId === bill.id && 'bg-brand-500/5 border-l-2 border-brand-500')}>
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-medium text-brand-400 font-mono">{bill.bill_number}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm text-blue-400 font-mono">{bill.po_number || '-'}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm text-white">{bill.supplier_name}</p>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-dark-500">{formatDate(bill.bill_date)}</td>
                                            <td className="px-3 py-3 text-sm font-mono text-white">{formatCurrency(bill.total_amount)}</td>
                                            <td className="px-3 py-3 text-sm font-mono text-emerald-400">{formatCurrency(bill.paid_amount || 0)}</td>
                                            <td className="px-3 py-3 text-sm font-mono text-amber-400">{formatCurrency(bill.balance_amount || 0)}</td>
                                            <td className="px-3 py-3"><BillStatusBadge status={bill.status} /></td>
                                            <td className="px-3 py-3">
                                                {bill.status !== 'paid' && bill.status !== 'cancelled' && (
                                                    <button onClick={(e) => { e.stopPropagation(); setDeletingBill(bill) }}
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

                {selectedBillId && (
                    <div className="w-1/2 sticky top-20">
                        <SupplierBillDetail billId={selectedBillId}
                            onClose={() => setSelectedBillId(null)}
                            onRefresh={fetchData} />
                    </div>
                )}
            </div>

            {/* Create Bill Modal */}
            <Modal isOpen={showBillModal} onClose={() => { setShowBillModal(false); setPoItems([]) }}
                title="New Supplier Bill"
                size="xl"
                footer={<div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={() => { setShowBillModal(false); setPoItems([]) }}>Cancel</Button>
                    <Button onClick={handleSaveBill} isLoading={isSaving} icon={<Save size={16} />}>Create Bill</Button>
                </div>}>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {/* PO Selection */}
                    <Select label="Purchase Order" value={formData.purchase_order_id}
                        onChange={(e) => {
                            const poId = e.target.value
                            const po = unbilledPOs.find(p => p.id === poId)
                            setFormData(p => ({ 
                                ...p, 
                                purchase_order_id: poId,
                                supplier_id: po?.supplier_id || ''
                            }))
                        }}
                        options={unbilledPOs.map(po => ({ 
                            value: po.id, 
                            label: `${po.po_number} - ${po.supplier_name}` 
                        }))}
                        placeholder="Select purchase order (optional)" />

                    {selectedPO && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                            <p className="text-sm text-blue-400 font-medium">{selectedPO.po_number}</p>
                            <p className="text-xs text-dark-500">Supplier: {selectedPO.supplier_name}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Bill Date *" type="date" value={formData.bill_date}
                            onChange={(e) => setFormData(p => ({ ...p, bill_date: e.target.value }))} />
                        <Input label="Due Date" type="date" value={formData.due_date}
                            onChange={(e) => setFormData(p => ({ ...p, due_date: e.target.value }))} />
                    </div>

                    <Textarea label="Notes" value={formData.notes}
                        onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} 
                        placeholder="Enter any notes about this bill..." rows={2} />

                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-white">Bill Items</p>
                            <Button 
                                size="sm" 
                                variant="secondary" 
                                onClick={() => setFormData(p => ({
                                    ...p,
                                    items: [...p.items, { description: '', quantity: 1, unit_price: 0, tax_rate: 0, tax_amount: 0, total_amount: 0 }]
                                }))}
                                icon={<Plus size={14} />}
                            >
                                Add Item
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {formData.items.map((item, idx) => (
                                <div key={idx} className="bg-dark-200/30 rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Input 
                                            label="Description" 
                                            value={item.description}
                                            onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                            placeholder="Item description"
                                            className="flex-1 mr-2"
                                        />
                                        <button 
                                            onClick={() => setFormData(p => ({
                                                ...p,
                                                items: p.items.filter((_, i) => i !== idx)
                                            }))}
                                            className="p-2 rounded-lg text-dark-500 hover:text-red-400 hover:bg-dark-200 mt-6"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-3">
                                        <Input 
                                            label="Qty" 
                                            type="number" 
                                            value={item.quantity}
                                            onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                                        />
                                        <Input 
                                            label="Price" 
                                            type="number" 
                                            value={item.unit_price}
                                            onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))}
                                        />
                                        <Input 
                                            label="Tax %" 
                                            type="number" 
                                            value={item.tax_rate}
                                            onChange={(e) => updateItem(idx, 'tax_rate', Number(e.target.value))}
                                        />
                                        <div>
                                            <p className="text-[10px] text-dark-500 uppercase mb-1">Total</p>
                                            <p className="text-sm font-mono text-brand-400">{formatCurrency(item.total_amount)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {formData.items.length === 0 && (
                        <div className="text-center py-4">
                            <p className="text-sm text-dark-500">No items added. Click "Add Item" to add bill items.</p>
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
                                <span className="text-white font-medium">Total Amount</span>
                                <span className="font-mono font-bold text-brand-400">{formatCurrency(totals.total_amount)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Delete Modal */}
            {deletingBill && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeletingBill(null)}>
                    <div className="glass-card p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-2">Delete Bill?</h3>
                        <p className="text-sm text-dark-500 mb-4">
                            Delete {deletingBill.bill_number}? This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setDeletingBill(null)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
