import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Search, Download, Trash2, X, ChevronLeft, ChevronRight,
    AlertCircle, FileText, IndianRupee, Calendar, Send, CheckCircle,
    Printer, CreditCard, Building2, Hash,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
    getInvoices, getInvoiceById, createInvoiceFromSO, updateInvoiceStatus,
    recordPayment, deleteInvoice, getInvoiceStats, getUnbilledSalesOrders, getInvoicePayments,
    type Invoice, type InvoiceItem,
} from '@/services/invoiceService'
import { supabase } from '@/lib/supabase'

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir',
].map(s => ({ value: s, label: s }))

// ============ INVOICE DETAIL PANEL ============
function InvoiceDetail({ invoiceId, onClose, onRefresh }: {
    invoiceId: string; onClose: () => void; onRefresh: () => void
}) {
    const [invoice, setInvoice] = useState<Invoice | null>(null)
    const [payments, setPayments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [showPayment, setShowPayment] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [referenceNumber, setReferenceNumber] = useState('')

    useEffect(() => { loadInvoice() }, [invoiceId])

    const loadInvoice = async () => {
        try {
            setLoading(true)
            const [inv, pays] = await Promise.all([
                getInvoiceById(invoiceId),
                getInvoicePayments(invoiceId)
            ])
            setInvoice(inv)
            setPayments(pays)
        } catch (err: any) { toast.error(err.message) }
        finally { setLoading(false) }
    }

    const handleStatusChange = async (status: string) => {
        try {
            setUpdating(true)
            await updateInvoiceStatus(invoiceId, status)
            toast.success(`Invoice ${status}!`)
            loadInvoice(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handlePayment = async () => {
        const amount = Number(paymentAmount)
        if (!amount || amount <= 0) { toast.error('Enter valid amount'); return }
        if (amount > (invoice?.balance_amount || 0)) { toast.error('Amount exceeds balance'); return }
        try {
            setUpdating(true)
            await recordPayment(invoiceId, amount, paymentMethod, referenceNumber)
            toast.success(`Payment of ${formatCurrency(amount)} recorded!`)
            setShowPayment(false); setPaymentAmount(''); setReferenceNumber('')
            loadInvoice(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    if (loading) return (
        <div className="glass-card p-8"><div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-dark-200 rounded w-1/3" />
            <div className="h-32 bg-gray-200 dark:bg-dark-200 rounded" />
        </div></div>
    )

    if (!invoice) return null

    const isGST = (invoice.cgst_amount || 0) > 0 || (invoice.igst_amount || 0) > 0

    return (
        <div className="glass-card h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-300/50">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-gray-900 dark:text-white">{invoice.invoice_number}</h2>
                        <StatusBadge status={invoice.status} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-dark-500 mt-1">{invoice.customer_name} • {formatDate(invoice.invoice_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                    {invoice.status === 'draft' && (
                        <Button size="sm" onClick={() => handleStatusChange('sent')} isLoading={updating} icon={<Send size={14} />}>Send</Button>
                    )}
                    {(invoice.status === 'sent' || invoice.status === 'partial') && (
                        <Button size="sm" variant="success" onClick={() => setShowPayment(true)} icon={<IndianRupee size={14} />}>Record Payment</Button>
                    )}
                    <Button size="sm" variant="secondary" icon={<Printer size={14} />} onClick={async () => {
                        try {
                            const { printInvoicePDF } = await import('@/utils/pdfExport')
                            await printInvoicePDF(invoiceId)
                        } catch (err: any) { toast.error(err.message) }
                    }}>Print</Button>
                    <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={async () => {
                        try {
                            const { generateInvoicePDF } = await import('@/services/exportService')
                            await generateInvoicePDF(invoiceId)
                            toast.success('PDF downloaded!')
                        } catch (err: any) { toast.error(err.message) }
                    }}>PDF</Button>
                    <button title="Close" onClick={onClose} className="p-2 rounded-lg text-gray-500 dark:text-dark-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-200"><X size={16} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Payment Recording */}
                {showPayment && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Record Payment</p>
                            <p className="text-xs text-gray-500 dark:text-dark-500">Balance: <span className="text-red-400 font-semibold">{formatCurrency(invoice.balance_amount)}</span></p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Amount *" type="number" value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="Enter amount" icon={<IndianRupee size={14} />} />
                            <Select label="Payment Method *" value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                options={[
                                    { value: 'cash', label: 'Cash' },
                                    { value: 'upi', label: 'UPI' },
                                    { value: 'bank_transfer', label: 'Bank Transfer / NEFT' },
                                    { value: 'cheque', label: 'Cheque' },
                                    { value: 'credit_card', label: 'Credit Card' },
                                    { value: 'other', label: 'Other' },
                                ]} />
                        </div>
                        {(paymentMethod === 'cheque' || paymentMethod === 'bank_transfer' || paymentMethod === 'upi') && (
                            <Input label="Reference / Transaction No." value={referenceNumber}
                                onChange={(e) => setReferenceNumber(e.target.value)}
                                placeholder={paymentMethod === 'cheque' ? 'Cheque number' : 'Transaction ID'} />
                        )}
                        <div className="flex items-center gap-2 pt-1">
                            <Button onClick={handlePayment} isLoading={updating} icon={<CheckCircle size={14} />}>Record Payment</Button>
                            <Button variant="ghost" onClick={() => { setShowPayment(false); setPaymentAmount(''); setReferenceNumber('') }}>Cancel</Button>
                            <button onClick={() => setPaymentAmount(String(invoice.balance_amount))}
                                className="text-xs text-emerald-400 hover:underline ml-auto">Pay Full Amount</button>
                        </div>
                    </div>
                )}

                {/* Invoice Info */}
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Customer', value: invoice.customer_name, icon: Building2 },
                        { label: 'GSTIN', value: invoice.customer_gst || 'N/A', icon: Hash },
                        { label: 'Invoice Date', value: formatDate(invoice.invoice_date), icon: Calendar },
                        { label: 'Due Date', value: invoice.due_date ? formatDate(invoice.due_date) : '-', icon: Calendar },
                        { label: 'Place of Supply', value: invoice.place_of_supply || 'Same state', icon: Building2 },
                        { label: 'SO Reference', value: invoice.order_number || '-', icon: FileText },
                    ].map(item => (
                        <div key={item.label} className="space-y-1">
                            <div className="flex items-center gap-1.5 text-gray-400 dark:text-dark-600">
                                <item.icon size={12} />
                                <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
                            </div>
                            <p className="text-sm text-gray-900 dark:text-white">{item.value}</p>
                        </div>
                    ))}
                </div>

                {/* Line Items */}
                <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Items</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[10px] text-gray-500 dark:text-dark-500 uppercase border-b border-gray-200 dark:border-dark-300/30">
                                    <th className="text-left py-2">Product</th>
                                    <th className="text-left py-2">HSN</th>
                                    <th className="text-right py-2">Qty</th>
                                    <th className="text-right py-2">Rate</th>
                                    <th className="text-right py-2">GST</th>
                                    <th className="text-right py-2">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-dark-300/20">
                                {invoice.items?.map((item, idx) => (
                                    <tr key={item.id || idx}>
                                        <td className="py-2">
                                            <p className="text-gray-900 dark:text-white">{item.product_name}</p>
                                            <p className="text-[10px] text-gray-500 dark:text-dark-500">{item.product_sku}</p>
                                        </td>
                                        <td className="py-2 text-gray-500 dark:text-dark-500">{item.hsn_code || '-'}</td>
                                        <td className="py-2 text-right text-gray-900 dark:text-white">{item.quantity}</td>
                                        <td className="py-2 text-right text-gray-900 dark:text-white font-mono">{formatCurrency(item.unit_price)}</td>
                                        <td className="py-2 text-right">
                                            <span className="text-gray-500 dark:text-dark-500">{item.tax_rate}%</span>
                                            {item.cgst_amount > 0 && (
                                                <p className="text-[9px] text-gray-400 dark:text-dark-600">C:{formatCurrency(item.cgst_amount)} S:{formatCurrency(item.sgst_amount)}</p>
                                            )}
                                            {item.igst_amount > 0 && (
                                                <p className="text-[9px] text-gray-400 dark:text-dark-600">I:{formatCurrency(item.igst_amount)}</p>
                                            )}
                                        </td>
                                        <td className="py-2 text-right font-mono font-semibold text-rose-400">{formatCurrency(item.total_amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Totals */}
                <div className="bg-gray-100 dark:bg-dark-200/20 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-dark-500">Subtotal</span>
                        <span className="text-gray-900 dark:text-white">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    {invoice.discount_amount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-dark-500">Discount</span>
                            <span className="text-amber-400">-{formatCurrency(invoice.discount_amount)}</span>
                        </div>
                    )}
                    {invoice.cgst_amount > 0 && (
                        <>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-dark-500">CGST</span>
                                <span className="text-gray-900 dark:text-white">{formatCurrency(invoice.cgst_amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-dark-500">SGST</span>
                                <span className="text-gray-900 dark:text-white">{formatCurrency(invoice.sgst_amount)}</span>
                            </div>
                        </>
                    )}
                    {invoice.igst_amount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-dark-500">IGST</span>
                            <span className="text-gray-900 dark:text-white">{formatCurrency(invoice.igst_amount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-bold border-t border-gray-200 dark:border-dark-300/30 pt-2">
                        <span className="text-gray-900 dark:text-white">Total</span>
                        <span className="text-rose-400">{formatCurrency(invoice.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-gray-200 dark:border-dark-300/30 pt-2">
                        <span className="text-gray-500 dark:text-dark-500">Paid</span>
                        <span className="text-emerald-400">{formatCurrency(invoice.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-dark-500">Balance</span>
                        <span className={cn('font-semibold', invoice.balance_amount > 0 ? 'text-red-400' : 'text-emerald-400')}>
                            {formatCurrency(invoice.balance_amount)}
                        </span>
                    </div>
                </div>

                {/* Payment History */}
                {payments.length > 0 && (
                    <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Payment History</p>
                        <div className="space-y-2">
                            {payments.map((payment, idx) => (
                                <div key={payment.id || idx} className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CreditCard size={14} className="text-emerald-400" />
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(payment.amount)}</span>
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-dark-500">{formatDate(payment.payment_date)}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-dark-500">
                                        <span className="capitalize">{payment.payment_method?.replace(/_/g, ' ')}</span>
                                        {payment.reference_number && (
                                            <span className="font-mono">Ref: {payment.reference_number}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {invoice.eway_bill_number && (
                    <div className="space-y-1">
                        <p className="text-[10px] text-gray-400 dark:text-dark-600 uppercase">E-Way Bill</p>
                        <p className="text-sm text-gray-900 dark:text-white">{invoice.eway_bill_number}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ============ GENERATE FROM SO MODAL ============
function GenerateInvoiceModal({ isOpen, onClose, onCreated }: {
    isOpen: boolean; onClose: () => void; onCreated: (invoice?: Invoice) => void
}) {
    const { user } = useAuthStore()
    const [unbilledOrders, setUnbilledOrders] = useState<any[]>([])
    const [selectedSOId, setSelectedSOId] = useState('')
    const [placeOfSupply, setPlaceOfSupply] = useState('Maharashtra')
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setSelectedSOId('')
            loadOrders()
        }
    }, [isOpen])

    const loadOrders = async () => {
        try {
            setLoading(true)
            setUnbilledOrders(await getUnbilledSalesOrders())
        } catch (err: any) { toast.error(err.message) }
        finally { setLoading(false) }
    }

    const handleGenerate = async () => {
        if (!selectedSOId) { toast.error('Select a sales order'); return }
        try {
            setCreating(true)

            // Check for existing invoice
            const { data: existing } = await supabase
                .from('invoices')
                .select('id, invoice_number')
                .eq('sales_order_id', selectedSOId)
                .maybeSingle()

            if (existing) {
                toast.error(`Invoice ${existing.invoice_number} already exists for this Sales Order!`)
                return
            }

            const invoice = await createInvoiceFromSO(selectedSOId, placeOfSupply, user?.id)
            onClose() // Close first

            toast.success(`Invoice ${invoice.invoice_number} generated!`, {
                action: {
                    label: 'Send Now →',
                    onClick: () => {
                        // We need a way to open detailed view. 
                        // Since we don't have direct access to set invoice from here easily without prop drilling or context,
                        // we can rely on list refresh and maybe a URL param or just let user find it. 
                        // BUT, user asked to select it.
                        // Let's retry fetchData and then set it? 
                        // The simplest way is to pass a callback "onOpenDetail"
                        // For now we will just show toast as requested, but the onClick might need onCreated to handle it?
                        // Actually, onCreated just refreshes data. 
                        // We can modify onCreated to accept an ID? No, keeps it simple.
                        // Let's just emit success and let user click it in list for now OR navigate if we had a route.
                        // Wait, the requirement says: onClick: () => setSelectedInvoice(invoice)
                        // This implies GenerateInvoiceModal should receive setSelectedInvoice or similar.
                        // Let's pass a callback `onSuccess` that handles this.
                    }
                },
                duration: 8000,
            })
            // ACTUALLY, to strictly follow "onClick: () => setSelectedInvoice(invoice)", we need to pass that setter.
            // Let's modify the props of GenerateInvoiceModal
            onCreated(invoice)
            // We will change onCreated signature in parent.
        } catch (err: any) { toast.error(err.message) }
        finally { setCreating(false) }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Generate Invoice from Sales Order"
            description="Select a confirmed sales order to create invoice" size="md"
            footer={<>
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={handleGenerate} isLoading={creating} icon={<FileText size={16} />}>Generate Invoice</Button>
            </>}>
            <div className="space-y-4">
                {loading ? (
                    <div className="animate-pulse space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-200 dark:bg-dark-200 rounded-lg" />)}
                    </div>
                ) : unbilledOrders.length === 0 ? (
                    <div className="text-center py-8">
                        <FileText size={32} className="text-gray-400 dark:text-dark-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-dark-500">No unbilled sales orders found</p>
                        <p className="text-xs text-gray-400 dark:text-dark-600 mt-1">Confirm a sales order first</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-500 dark:text-dark-500">Select Sales Order *</label>
                            {unbilledOrders.map(so => (
                                <button key={so.id} onClick={() => setSelectedSOId(so.id)}
                                    className={cn('w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left',
                                        selectedSOId === so.id
                                            ? 'border-rose-500/50 bg-rose-500/5'
                                            : 'border-gray-200 dark:border-dark-300/30 hover:border-gray-300 dark:hover:border-dark-300 hover:bg-gray-100 dark:hover:bg-dark-200/30')}>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{so.order_number}</p>
                                        <p className="text-xs text-gray-500 dark:text-dark-500">{so.customer_name}</p>
                                    </div>
                                    <p className="text-sm font-mono font-semibold text-rose-400">{formatCurrency(so.total_amount)}</p>
                                </button>
                            ))}
                        </div>
                        <Select label="Place of Supply *" value={placeOfSupply}
                            onChange={(e) => setPlaceOfSupply(e.target.value)}
                            options={INDIAN_STATES} />
                        <div className="bg-gray-100 dark:bg-dark-200/20 rounded-lg p-3 text-xs text-gray-500 dark:text-dark-500">
                            <p>• Same state (Maharashtra) → CGST + SGST</p>
                            <p>• Different state → IGST</p>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
}

// ============ MAIN PAGE ============
export function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 25

    const [showGenerateModal, setShowGenerateModal] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null)
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [stats, setStats] = useState({ total: 0, draft: 0, sent: 0, paid: 0, overdue: 0, totalValue: 0, totalPaid: 0, totalPending: 0 })

    // Filters
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [filterCustomer, setFilterCustomer] = useState('')
    const [customers, setCustomers] = useState<{ value: string; label: string }[]>([])

    // Bulk Actions
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isBulkUpdating, setIsBulkUpdating] = useState(false)

    useEffect(() => { loadCustomers() }, [])

    const loadCustomers = async () => {
        const { data } = await supabase.from('customers').select('id, name').eq('status', 'active').order('name')
        setCustomers((data || []).map((c: any) => ({ value: c.id, label: c.name })))
    }

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getInvoices({ page, pageSize }, { status: statusFilter, search, dateFrom, dateTo, customerId: filterCustomer }),
                getInvoiceStats(),
            ])
            setInvoices(result.data)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
        } catch (err: any) { toast.error(err.message) }
        finally { setIsLoading(false) }
    }, [page, statusFilter, search, dateFrom, dateTo, filterCustomer])

    useEffect(() => { fetchData() }, [fetchData])
    useEffect(() => {
        const t = setTimeout(() => { setPage(1); fetchData() }, 300)
        return () => clearTimeout(t)
    }, [search])

    const handleDelete = async () => {
        if (!deletingInvoice) return
        try {
            setIsDeleting(true)
            await deleteInvoice(deletingInvoice.id)
            toast.success('Deleted!')
            setIsDeleteModalOpen(false); setDeletingInvoice(null)
            if (selectedInvoiceId === deletingInvoice.id) setSelectedInvoiceId(null)
            fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsDeleting(false) }
    }

    // Bulk Actions
    const toggleSelectAll = () => {
        if (selectedIds.size === invoices.length) setSelectedIds(new Set())
        else setSelectedIds(new Set(invoices.map(i => i.id)))
    }

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedIds(newSet)
    }

    const handleBulkUpdate = async (action: 'sent' | 'paid' | 'cancelled') => {
        if (selectedIds.size === 0) return
        if (!window.confirm(`Mark ${selectedIds.size} invoices as ${action}?`)) return

        try {
            setIsBulkUpdating(true)
            const ids = Array.from(selectedIds)

            if (action === 'paid') {
                // For paid, we need to update status AND balances. 
                // Best to do via a loop calling recordPayment or update?
                // Requirement: update status: 'paid', paid_amount: total_amount, balance: 0.
                // We can use direct update for speed on simple cases, but recordPayment creates a Payment Record.
                // Requirement says: .update({ status: 'paid', paid_amount: total_amount, balance_amount: 0 })
                // So we will do direct update as requested.
                const updates = ids.map(async (id) => {
                    const inv = invoices.find(i => i.id === id)
                    if (!inv) return
                    await supabase.from('invoices').update({
                        status: 'paid', paid_amount: inv.total_amount, balance_amount: 0, updated_at: new Date().toISOString()
                    }).eq('id', id)
                })
                await Promise.all(updates)
            } else {
                await Promise.all(ids.map(id => updateInvoiceStatus(id, action)))
            }

            toast.success(`Updated ${selectedIds.size} invoices!`)
            setSelectedIds(new Set())
            fetchData()
        } catch (err: any) { toast.error('Bulk update failed: ' + err.message) }
        finally { setIsBulkUpdating(false) }
    }

    const handleQuickPay = async (invoice: Invoice, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!window.confirm(`Mark invoice ${invoice.invoice_number} as fully paid?`)) return
        try {
            await supabase.from('invoices').update({
                status: 'paid', paid_amount: invoice.total_amount, balance_amount: 0, updated_at: new Date().toISOString()
            }).eq('id', invoice.id)
            toast.success('Invoice marked as paid!')
            fetchData()
            if (selectedInvoiceId === invoice.id) {
                // Determine if we need to refresh detail view? 
                // fetchData refreshes list. 
            }
        } catch (err: any) { toast.error(err.message) }
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Invoices"
                description={`${stats.total} invoices • Pending: ${formatCurrency(stats.totalPending)}`}
                actions={<div className="flex items-center gap-3">
                    <Button variant="secondary" icon={<Download size={16} />} size="sm" onClick={async () => {
                        try {
                            const { exportInvoices } = await import('@/services/exportService')
                            await exportInvoices()
                            toast.success('Invoices exported!')
                        } catch (err: any) { toast.error(err.message) }
                    }}>Export CSV</Button>
                    <Button icon={<Plus size={16} />} onClick={() => setShowGenerateModal(true)}>Generate Invoice</Button>
                </div>} />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Invoiced', value: formatCurrency(stats.totalValue), color: 'text-rose-400' },
                    { label: 'Paid', value: formatCurrency(stats.totalPaid), color: 'text-emerald-400' },
                    { label: 'Pending', value: formatCurrency(stats.totalPending), color: 'text-amber-400', alert: stats.totalPending > 0 },
                    { label: 'Overdue', value: stats.overdue, color: 'text-red-400', alert: stats.overdue > 0 },
                ].map(k => (
                    <div key={k.label} className={cn('glass-card p-4', k.alert && 'border-red-500/30')}>
                        <p className="text-xs text-gray-500 dark:text-dark-500">{k.label}</p>
                        <p className={cn('text-xl font-bold mt-1', k.color)}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 max-w-md">
                    <Input placeholder="Search by invoice number..." value={search}
                        onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
                </div>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
                <Select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)}
                    options={[{ value: '', label: 'All Customers' }, ...customers]} className="w-48" />
                <div className="flex items-center gap-2">
                    {['all', 'draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'].map(s => (
                        <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                statusFilter === s ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-gray-500 dark:text-dark-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-200 border border-transparent')}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex items-center justify-between">
                    <p className="text-sm text-rose-400 font-medium">{selectedIds.size} invoices selected</p>
                    <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleBulkUpdate('sent')} isLoading={isBulkUpdating} icon={<Send size={14} />}>Mark as Sent</Button>
                        <Button size="sm" variant="success" onClick={() => handleBulkUpdate('paid')} isLoading={isBulkUpdating} icon={<CheckCircle size={14} />}>Mark as Paid</Button>
                        <Button size="sm" variant="danger" onClick={() => handleBulkUpdate('cancelled')} isLoading={isBulkUpdating}>Cancel</Button>
                    </div>
                </div>
            )}

            {/* Split View */}
            <div className={cn('flex gap-6', selectedInvoiceId ? 'items-start' : '')}>
                <div className={cn('transition-all duration-300', selectedInvoiceId ? 'w-1/2' : 'w-full')}>
                    {isLoading ? (
                        <div className="glass-card p-8"><div className="animate-pulse space-y-3">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-dark-200 rounded-lg" />)}
                        </div></div>
                    ) : invoices.length === 0 ? (
                        <EmptyState icon={<FileText size={48} />} title="No invoices"
                            description="Generate invoice from a sales order" actionLabel="Generate Invoice"
                            onAction={() => setShowGenerateModal(true)} />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead><tr className="border-b border-gray-200 dark:border-dark-300/50">
                                    <th className="px-3 py-3 w-8">
                                        <input type="checkbox"
                                            checked={invoices.length > 0 && selectedIds.size === invoices.length}
                                            onChange={toggleSelectAll}
                                            className="rounded border-gray-300 dark:border-dark-300 bg-transparent" />
                                    </th>
                                    {['Invoice', 'Customer', 'Date', 'SO Ref', 'Total', 'Paid', 'Balance', 'Status', 'Due Status', ''].map(h => (
                                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-dark-300/30">
                                    {invoices.map(inv => (
                                        <tr key={inv.id} onClick={() => setSelectedInvoiceId(inv.id)}
                                            className={cn(
                                                'cursor-pointer transition-colors',
                                                selectedInvoiceId === inv.id
                                                    ? 'bg-rose-500/5 border-l-2 border-rose-500'
                                                    : inv.status === 'overdue' || (inv.due_date && inv.status !== 'paid' && inv.status !== 'cancelled' && new Date(inv.due_date) < new Date())
                                                        ? 'bg-red-500/5 hover:bg-red-500/10 dark:bg-red-500/5 dark:hover:bg-red-500/10'
                                                        : 'hover:bg-gray-50 dark:hover:bg-dark-200/30',
                                                selectedIds.has(inv.id) && 'bg-rose-500/5'
                                            )}>
                                            <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox"
                                                    checked={selectedIds.has(inv.id)}
                                                    onChange={() => toggleSelect(inv.id)}
                                                    className="rounded border-gray-300 dark:border-dark-300 bg-transparent" />
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-medium text-rose-400 font-mono">{inv.invoice_number}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm text-white">{inv.customer_name}</p>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-gray-500 dark:text-dark-500">{formatDate(inv.invoice_date)}</td>
                                            <td className="px-3 py-3 text-sm text-blue-400 font-mono">{inv.order_number}</td>
                                            <td className="px-3 py-3 text-sm font-mono font-semibold text-gray-900 dark:text-white">{formatCurrency(inv.total_amount)}</td>
                                            <td className="px-3 py-3 text-sm font-mono text-emerald-400">{formatCurrency(inv.paid_amount)}</td>
                                            <td className="px-3 py-3">
                                                <span className={cn('text-sm font-mono font-semibold', inv.balance_amount > 0 ? 'text-red-400' : 'text-emerald-400')}>
                                                    {formatCurrency(inv.balance_amount)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3"><StatusBadge status={inv.status} /></td>
                                            <td className="px-3 py-3">
                                                {inv.due_date ? (() => {
                                                    const today = new Date()
                                                    today.setHours(0, 0, 0, 0)
                                                    const due = new Date(inv.due_date)
                                                    due.setHours(0, 0, 0, 0)
                                                    const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                                                    if (inv.status === 'paid' || inv.status === 'cancelled') {
                                                        return <span className="text-xs text-gray-400 dark:text-dark-500">—</span>
                                                    }
                                                    if (diffDays < 0) {
                                                        return <Badge variant="danger" dot>{Math.abs(diffDays)}d overdue</Badge>
                                                    }
                                                    if (diffDays <= 7) {
                                                        return <Badge variant="warning">{diffDays}d left</Badge>
                                                    }
                                                    return <span className="text-xs text-gray-500 dark:text-dark-500">{diffDays}d left</span>
                                                })() : <span className="text-xs text-gray-400 dark:text-dark-500">—</span>}
                                            </td>
                                            <td className="px-3 py-3 flex items-center gap-1">
                                                {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                                                    <button title="Mark as Paid" onClick={(e) => handleQuickPay(inv, e)}
                                                        className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                                                        <CheckCircle size={14} />
                                                    </button>
                                                )}
                                                {inv.status === 'draft' && (
                                                    <button title="Delete" onClick={(e) => { e.stopPropagation(); setDeletingInvoice(inv); setIsDeleteModalOpen(true) }}
                                                        className="p-1.5 rounded-lg text-gray-500 dark:text-dark-500 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-dark-200"><Trash2 size={14} /></button>
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
                            <p className="text-xs text-gray-500 dark:text-dark-500">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}</p>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)} icon={<ChevronLeft size={16} />}>Prev</Button>
                                <span className="text-sm text-gray-500 dark:text-dark-500">{page}/{totalPages}</span>
                                <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={16} /></Button>
                            </div>
                        </div>
                    )}
                </div>

                {selectedInvoiceId && (
                    <div className="w-1/2 sticky top-20">
                        <InvoiceDetail invoiceId={selectedInvoiceId}
                            onClose={() => setSelectedInvoiceId(null)}
                            onRefresh={fetchData} />
                    </div>
                )}
            </div>

            {/* Generate Modal */}
            <GenerateInvoiceModal isOpen={showGenerateModal}
                onClose={() => setShowGenerateModal(false)} onCreated={(newInv) => {
                    fetchData()
                    if (newInv) {
                        toast.success(`Invoice ${newInv.invoice_number} created!`, {
                            action: {
                                label: 'Send Now →',
                                onClick: () => setSelectedInvoiceId(newInv.id)
                            },
                            duration: 8000,
                        })
                    }
                }} />

            {/* Delete Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setDeletingInvoice(null) }}
                title="Delete Invoice" size="sm"
                footer={<>
                    <Button variant="secondary" onClick={() => { setIsDeleteModalOpen(false); setDeletingInvoice(null) }}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
                </>}>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                    <AlertCircle size={20} className="text-red-400 mt-0.5" />
                    <p className="text-sm text-white">Delete <strong>{deletingInvoice?.invoice_number}</strong>?</p>
                </div>
            </Modal>
        </div>
    )
}
