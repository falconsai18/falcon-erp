import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft, FileText, IndianRupee, AlertTriangle,
    RefreshCw, Mail, Phone, Building2, CreditCard,
    DollarSign, Eye, Plus, Download, Search, X,
    Calendar, CheckCircle, TrendingDown
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { getCustomerLedger, getCustomerById, type Customer } from '@/services/customerService'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { logActivity, AUDIT_ACTIONS } from '@/services/auditService'

interface LedgerEntry {
    id: string
    date: string
    type: 'invoice' | 'payment' | 'credit_note'
    reference: string
    description: string
    debit: number
    credit: number
    balance: number
    status?: string
    amount: number
    balance_due?: number
}

// ─── Date Helpers ──────────────────────────────────────────────
const getDefaultDates = () => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 90) // Last 90 days default
    return {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
    }
}

// ─── Export Helpers ────────────────────────────────────────────
const exportToCSV = (entries: LedgerEntry[], customerName: string) => {
    const headers = ['Date', 'Type', 'Reference', 'Description', 'Debit (Dr)', 'Credit (Cr)', 'Balance', 'Status']
    const rows = entries.map(e => [
        formatDate(e.date),
        e.type,
        e.reference,
        e.description,
        e.debit > 0 ? e.debit : '',
        e.credit > 0 ? e.credit : '',
        e.balance,
        e.status || '',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger_${customerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported successfully!')
}

const exportToPDF = async (entries: LedgerEntry[], customer: Customer, summary: any) => {
    try {
        // Dynamic import to keep bundle lean
        const { jsPDF } = await import('jspdf')
        const doc = new jsPDF({ orientation: 'landscape' })

        // Header
        doc.setFontSize(18)
        doc.setTextColor(99, 102, 241) // brand color
        doc.text('Customer Ledger Report', 14, 18)

        doc.setFontSize(11)
        doc.setTextColor(60, 60, 60)
        doc.text(`Customer: ${customer.name}`, 14, 28)
        doc.text(`GST: ${customer.gst_number || 'N/A'}`, 14, 34)
        doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 14, 40)

        // Summary row
        doc.setFontSize(10)
        doc.text(`Total Invoiced: ${formatCurrency(summary.total_invoiced)}`, 14, 50)
        doc.text(`Total Paid: ${formatCurrency(summary.total_paid)}`, 70, 50)
        doc.text(`Outstanding: ${formatCurrency(summary.total_outstanding)}`, 130, 50)
        doc.text(`Overdue: ${formatCurrency(summary.overdue_amount)}`, 200, 50)

        // Table headers
        const startY = 58
        const cols = [14, 40, 70, 100, 160, 195, 232, 270]
        const headers = ['Date', 'Type', 'Reference', 'Description', 'Debit', 'Credit', 'Balance', 'Status']
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        headers.forEach((h, i) => doc.text(h, cols[i], startY))
        doc.line(14, startY + 2, 290, startY + 2)

        let y = startY + 8
        doc.setTextColor(30, 30, 30)
        entries.forEach((e) => {
            if (y > 190) {
                doc.addPage()
                y = 20
            }
            const rowData = [
                formatDate(e.date),
                e.type,
                e.reference,
                e.description.substring(0, 28),
                e.debit > 0 ? formatCurrency(e.debit) : '-',
                e.credit > 0 ? formatCurrency(e.credit) : '-',
                formatCurrency(e.balance),
                e.status || '-',
            ]
            rowData.forEach((d, i) => doc.text(String(d), cols[i], y))
            y += 7
        })

        doc.save(`ledger_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
        toast.success('PDF exported successfully!')
    } catch (err) {
        console.error('PDF export error:', err)
        toast.error('PDF export failed. Try CSV instead.')
    }
}

// ─── Payment Modal ─────────────────────────────────────────────
interface PaymentModalProps {
    customerId: string
    customerName: string
    outstanding: number
    onClose: () => void
    onSuccess: () => void
}

function PaymentModal({ customerId, customerName, outstanding, onClose, onSuccess }: PaymentModalProps) {
    const [amount, setAmount] = useState(outstanding > 0 ? outstanding.toFixed(2) : '')
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
    const [paymentMode, setPaymentMode] = useState('bank_transfer')
    const [reference, setReference] = useState('')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    const handleSubmit = async () => {
        const amt = parseFloat(amount)
        if (!amt || amt <= 0) return toast.error('Enter valid amount')
        if (!reference.trim()) return toast.error('Reference number required')

        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('company_id')
                .eq('id', user!.id)
                .maybeSingle()

            const { error } = await supabase.from('payments').insert({
                customer_id: customerId,
                company_id: profile?.company_id,
                amount: amt,
                payment_date: paymentDate,
                payment_mode: paymentMode,
                reference_number: reference,
                notes,
                created_by: user!.id,
            })

            if (error) throw error

            logActivity({
                action: AUDIT_ACTIONS.PAYMENT_RECEIVED,
                entity_type: 'payment',
                details: {
                    customer_id: customerId,
                    amount: amt,
                    reference,
                    notes
                }
            })

            toast.success(`₹${amt.toLocaleString()} payment recorded for ${customerName}!`)
            onSuccess()
            onClose()
        } catch (err: any) {
            toast.error(err.message || 'Failed to record payment')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-card bg-white dark:bg-dark-100 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Record Payment</h2>
                        <p className="text-sm text-gray-500 dark:text-dark-500">{customerName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 text-gray-400">
                        <X size={18} />
                    </button>
                </div>

                {/* Outstanding Alert */}
                {outstanding > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                        <TrendingDown size={16} className="text-amber-500" />
                        <span className="text-sm text-amber-700 dark:text-amber-400">
                            Outstanding: <strong>{formatCurrency(outstanding)}</strong>
                        </span>
                    </div>
                )}

                {/* Amount */}
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-dark-600 mb-1 block">Amount (₹) *</label>
                    <div className="relative">
                        <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                </div>

                {/* Date + Mode */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-dark-600 mb-1 block">Date *</label>
                        <input
                            type="date"
                            value={paymentDate}
                            onChange={e => setPaymentDate(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-dark-600 mb-1 block">Mode *</label>
                        <select
                            value={paymentMode}
                            onChange={e => setPaymentMode(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                            <option value="upi">UPI</option>
                            <option value="card">Card</option>
                        </select>
                    </div>
                </div>

                {/* Reference */}
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-dark-600 mb-1 block">Reference No. *</label>
                    <input
                        type="text"
                        value={reference}
                        onChange={e => setReference(e.target.value)}
                        placeholder="UTR / Cheque No. / TXN ID"
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                </div>

                {/* Notes */}
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-dark-600 mb-1 block">Notes</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Optional notes..."
                        rows={2}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                    <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={saving} className="flex-1 gap-2">
                        {saving ? (
                            <RefreshCw size={16} className="animate-spin" />
                        ) : (
                            <CheckCircle size={16} />
                        )}
                        {saving ? 'Saving...' : 'Record Payment'}
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ─── Main Page ─────────────────────────────────────────────────
export default function CustomerLedgerPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const defaultDates = getDefaultDates()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [customer, setCustomer] = useState<Customer | null>(null)
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [dateFrom, setDateFrom] = useState(defaultDates.from)
    const [dateTo, setDateTo] = useState(defaultDates.to)
    const [searchRef, setSearchRef] = useState('')
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [exportLoading, setExportLoading] = useState(false)

    // ── Derived Summary ──
    const summary = useMemo(() => {
        if (!Array.isArray(ledgerEntries)) return { total_invoiced: 0, total_paid: 0, total_outstanding: 0, overdue_amount: 0 }
        return {
            total_invoiced: ledgerEntries.filter(e => e.type === 'invoice').reduce((sum, e) => sum + e.amount, 0),
            total_paid: ledgerEntries.filter(e => e.type === 'payment').reduce((sum, e) => sum + e.amount, 0),
            total_outstanding: ledgerEntries.length > 0 ? ledgerEntries[0].balance : 0,
            overdue_amount: ledgerEntries
                .filter(e => e.type === 'invoice' && e.status === 'overdue')
                .reduce((sum, e) => sum + (e.balance_due || 0), 0)
        }
    }, [ledgerEntries])

    // ── Filtered Ledger (type + date range + search) ──
    const filteredLedger = useMemo(() => {
        if (!Array.isArray(ledgerEntries)) return []
        return ledgerEntries.filter(e => {
            const matchType = typeFilter === 'all' || e.type === typeFilter
            const entryDate = e.date?.split('T')[0]
            const matchFrom = !dateFrom || entryDate >= dateFrom
            const matchTo = !dateTo || entryDate <= dateTo
            const matchSearch = !searchRef || e.reference?.toLowerCase().includes(searchRef.toLowerCase()) || e.description?.toLowerCase().includes(searchRef.toLowerCase())
            return matchType && matchFrom && matchTo && matchSearch
        })
    }, [ledgerEntries, typeFilter, dateFrom, dateTo, searchRef])

    // ── Load Data ──
    const loadLedger = useCallback(async () => {
        if (!id) return
        try {
            setLoading(true)
            setError(null)
            const [custData, entries] = await Promise.all([
                getCustomerById(id),
                getCustomerLedger(id)
            ])
            setCustomer(custData)
            setLedgerEntries(Array.isArray(entries) ? entries : [])
        } catch (err: any) {
            console.error('Error fetching ledger:', err)
            setError(err.message || 'Failed to fetch ledger data')
            toast.error('Failed to load ledger')
            setLedgerEntries([])
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { loadLedger() }, [loadLedger])

    useEffect(() => {
        if (customer) document.title = `${customer.name} | Falcon ERP`
    }, [customer])

    // ── Quick Date Presets ──
    const applyPreset = (days: number) => {
        const to = new Date()
        const from = new Date()
        from.setDate(from.getDate() - days)
        setDateFrom(from.toISOString().split('T')[0])
        setDateTo(to.toISOString().split('T')[0])
    }

    const clearFilters = () => {
        setDateFrom(defaultDates.from)
        setDateTo(defaultDates.to)
        setTypeFilter('all')
        setSearchRef('')
    }

    const handleExportCSV = () => {
        if (!filteredLedger.length) return toast.error('No data to export')
        exportToCSV(filteredLedger, customer?.name || 'customer')
    }

    const handleExportPDF = async () => {
        if (!filteredLedger.length) return toast.error('No data to export')
        if (!customer) return
        setExportLoading(true)
        await exportToPDF(filteredLedger, customer, summary)
        setExportLoading(false)
    }

    // ─── Loading skeleton ───
    if (loading && !customer) {
        return (
            <div className="p-6 space-y-6 animate-pulse">
                <div className="h-10 w-48 bg-gray-200 dark:bg-dark-300 rounded-lg" />
                <div className="h-32 w-full bg-gray-200 dark:bg-dark-300 rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-24 bg-gray-200 dark:bg-dark-300 rounded-xl" />
                    ))}
                </div>
                <div className="h-64 bg-gray-200 dark:bg-dark-300 rounded-xl" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{error}</h2>
                <Button onClick={loadLedger} className="gap-2"><RefreshCw size={18} /> Retry</Button>
            </div>
        )
    }

    if (!customer) return null

    return (
        <>
            <div className="p-6 space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <Button variant="secondary" onClick={() => navigate(-1)} className="gap-2">
                        <ArrowLeft size={18} /> Back to Customers
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleExportCSV} className="gap-2" title="Export CSV">
                            <Download size={16} /> CSV
                        </Button>
                        <Button variant="secondary" onClick={handleExportPDF} disabled={exportLoading} className="gap-2" title="Export PDF">
                            <FileText size={16} /> {exportLoading ? 'Generating...' : 'PDF'}
                        </Button>
                        <Button onClick={loadLedger} variant="secondary" className="gap-2">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </Button>
                    </div>
                </div>

                {/* Customer Info Card */}
                <Card className="glass-card p-6 border-none shadow-xl bg-white/50 dark:bg-dark-100/50 backdrop-blur-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="flex items-start gap-3 col-span-1 lg:col-span-1">
                            <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500 flex-shrink-0">
                                <Building2 size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{customer.name}</h1>
                                <Badge variant="default" className="mt-1">{customer.customer_type}</Badge>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-dark-500">
                                <Mail size={14} /> {customer.email || 'No email'}
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-dark-500">
                                <Phone size={14} /> {customer.phone || 'No phone'}
                            </div>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-dark-500">
                                <CreditCard size={14} /> <span className="font-medium text-gray-400">GST:</span> {customer.gst_number || 'N/A'}
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-dark-500">
                                <IndianRupee size={14} /> <span className="font-medium text-gray-400">Credit Limit:</span> {formatCurrency(customer.credit_limit)}
                            </div>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-400">Status:</span>
                                <Badge variant={customer.status === 'active' ? 'success' : 'danger'}>{customer.status}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-400">Due Days:</span>
                                <span className="text-gray-900 dark:text-white">{customer.credit_days} days</span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="glass-card p-4 border-none shadow-lg bg-white/50 dark:bg-dark-100/50">
                        <p className="text-sm text-gray-500 dark:text-dark-500 mb-1">Total Invoiced</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.total_invoiced)}</p>
                    </Card>
                    <Card className="glass-card p-4 border-none shadow-lg bg-white/50 dark:bg-dark-100/50">
                        <p className="text-sm text-gray-500 dark:text-dark-500 mb-1">Total Paid</p>
                        <p className="text-2xl font-bold text-emerald-500">{formatCurrency(summary.total_paid)}</p>
                    </Card>
                    <Card className="glass-card p-4 border-none shadow-lg bg-white/50 dark:bg-dark-100/50">
                        <p className="text-sm text-gray-500 dark:text-dark-500 mb-1">Outstanding</p>
                        <p className="text-2xl font-bold text-amber-500">{formatCurrency(summary.total_outstanding)}</p>
                    </Card>
                    <Card className="glass-card p-4 border-none shadow-lg bg-white/50 dark:bg-dark-100/50">
                        <p className="text-sm text-gray-500 dark:text-dark-500 mb-1">Overdue Amount</p>
                        <p className={cn("text-2xl font-bold", summary.overdue_amount > 0 ? "text-red-500" : "text-gray-900 dark:text-white")}>
                            {formatCurrency(summary.overdue_amount)}
                        </p>
                    </Card>
                </div>

                {/* Ledger Table */}
                <div className="glass-card p-6 border-none shadow-xl bg-white/50 dark:bg-dark-100/50">
                    {/* ── Toolbar ── */}
                    <div className="space-y-4 mb-6">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Transaction Ledger</h2>
                            <Button onClick={() => setShowPaymentModal(true)} className="gap-2">
                                <Plus className="w-4 h-4" /> Record Payment
                            </Button>
                        </div>

                        {/* Filters Row */}
                        <div className="flex flex-wrap gap-3 items-center">
                            {/* Type filter chips */}
                            <div className="flex gap-1.5 flex-wrap">
                                {['all', 'invoice', 'payment', 'credit_note'].map(filter => (
                                    <button
                                        key={filter}
                                        onClick={() => setTypeFilter(filter)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${typeFilter === filter
                                            ? 'bg-brand-500 text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-dark-600 hover:bg-gray-200 dark:hover:bg-dark-300'
                                            }`}
                                    >
                                        {filter === 'all' ? 'All' : filter === 'invoice' ? 'Invoices' : filter === 'payment' ? 'Payments' : 'Credit Notes'}
                                    </button>
                                ))}
                            </div>

                            {/* Date range */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <Calendar size={15} className="text-gray-400 hidden sm:block" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={e => setDateFrom(e.target.value)}
                                    className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                                <span className="text-gray-400 text-sm">to</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={e => setDateTo(e.target.value)}
                                    className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>

                            {/* Quick presets */}
                            <div className="flex gap-1.5">
                                {[
                                    { label: '30D', days: 30 },
                                    { label: '90D', days: 90 },
                                    { label: '1Y', days: 365 },
                                ].map(p => (
                                    <button
                                        key={p.label}
                                        onClick={() => applyPreset(p.days)}
                                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-dark-600 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 transition-all"
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            {/* Search */}
                            <div className="relative ml-auto">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search reference..."
                                    value={searchRef}
                                    onChange={e => setSearchRef(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 w-44"
                                />
                                {searchRef && (
                                    <button onClick={() => setSearchRef('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Clear all */}
                            <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-dark-500 underline whitespace-nowrap">
                                Clear filters
                            </button>
                        </div>

                        {/* Results count */}
                        <p className="text-xs text-gray-500 dark:text-dark-500">
                            Showing <strong className="text-gray-700 dark:text-dark-400">{filteredLedger.length}</strong> of {ledgerEntries.length} transactions
                        </p>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-dark-300">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Date</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Type</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Reference</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Description</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Debit (Dr)</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Credit (Cr)</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Balance</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-dark-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLedger.map((entry) => (
                                    <tr
                                        key={`${entry.type}-${entry.id}`}
                                        className="border-b border-gray-100 dark:border-dark-300 hover:bg-gray-50 dark:hover:bg-dark-200/50 transition-colors"
                                    >
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                                            {formatDate(entry.date)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge variant={
                                                entry.type === 'invoice' ? 'warning' :
                                                    entry.type === 'payment' ? 'success' : 'info'
                                            }>
                                                {entry.type === 'invoice' ? (
                                                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Invoice</span>
                                                ) : entry.type === 'payment' ? (
                                                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Payment</span>
                                                ) : (
                                                    <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Credit Note</span>
                                                )}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                                            {entry.reference}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-dark-600 max-w-xs truncate">
                                            {entry.description}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-right font-medium text-red-600 dark:text-red-400">
                                            {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-right font-medium text-green-600 dark:text-green-400">
                                            {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-right font-semibold whitespace-nowrap">
                                            <span className={cn(
                                                entry.balance > 0 ? 'text-red-500' :
                                                    entry.balance < 0 ? 'text-emerald-500' :
                                                        'text-gray-900 dark:text-white'
                                            )}>
                                                {formatCurrency(Math.abs(entry.balance))}
                                                {entry.balance > 0 ? ' Dr' : entry.balance < 0 ? ' Cr' : ''}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-center gap-1">
                                                {entry.type === 'invoice' && (entry.balance_due || 0) > 0 && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setShowPaymentModal(true)}
                                                        title="Record Payment"
                                                        className="text-emerald-600 hover:text-emerald-700"
                                                    >
                                                        <DollarSign className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        if (entry.type === 'invoice') navigate(`/invoices`)
                                                        else toast.success(`Payment Ref: ${entry.reference}`)
                                                    }}
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty State */}
                    {filteredLedger.length === 0 && (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 mx-auto text-gray-400 dark:text-dark-500 mb-3" />
                            <p className="text-gray-600 dark:text-dark-600 mb-2">No transactions found</p>
                            <p className="text-sm text-gray-400 dark:text-dark-500">Try changing the date range or filters</p>
                            <button onClick={clearFilters} className="mt-3 text-sm text-brand-500 hover:text-brand-600 underline">
                                Clear all filters
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && customer && (
                <PaymentModal
                    customerId={customer.id}
                    customerName={customer.name}
                    outstanding={summary.total_outstanding}
                    onClose={() => setShowPaymentModal(false)}
                    onSuccess={loadLedger}
                />
            )}
        </>
    )
}
