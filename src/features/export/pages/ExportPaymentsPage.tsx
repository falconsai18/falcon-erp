import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportStatusBadge } from '../components/ExportStatusBadge'
import { ForexGainLoss } from '../components/ForexGainLoss'
import { formatUSD, formatINR } from '@/lib/utils'
import { toast } from 'sonner'
import {
    getExportPayments,
    getExportCustomers,
    getExportInvoices,
    createExportPayment,
} from '../services/exportService'
import type { ExportPayment, ExportPaymentFormData } from '../types/export.types'
import type { ExportPaymentFilters } from '../types/export.types'
import { cn } from '@/lib/utils'

export function ExportPaymentsPage() {
    const [payments, setPayments] = useState<ExportPayment[]>([])
    const [customers, setCustomers] = useState<{ value: string; label: string }[]>([])
    const [invoices, setInvoices] = useState<{ id: string; invoice_number: string; amount_usd: number; exchange_rate: number; customer_id: string; export_order_id: string | null }[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [customerFilter, setCustomerFilter] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    const [formData, setFormData] = useState<Partial<ExportPaymentFormData>>({
        payment_date: new Date().toISOString().split('T')[0],
        expected_amount_usd: 0,
        received_amount_usd: 0,
        bank_realization_rate: 83,
        bank_reference: null,
        receiving_bank: null,
        payment_method: 'WIRE_TRANSFER',
        status: 'RECEIVED',
        notes: null,
    })

    const loadPayments = useCallback(async () => {
        try {
            setLoading(true)
            const filters: ExportPaymentFilters = {}
            if (statusFilter !== 'ALL') filters.status = statusFilter as ExportPaymentFilters['status']
            if (customerFilter) filters.customer_id = customerFilter
            if (dateFrom && dateTo) filters.date_range = { start: dateFrom, end: dateTo }
            if (search) filters.search = search
            const data = await getExportPayments(filters)
            setPayments(data)
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to load payments')
        } finally {
            setLoading(false)
        }
    }, [search, statusFilter, customerFilter, dateFrom, dateTo])

    useEffect(() => {
        loadPayments()
    }, [loadPayments])

    useEffect(() => {
        getExportCustomers({ is_active: true }).then((list) =>
            setCustomers(list.map((c) => ({ value: c.id, label: `${c.company_name} (${c.country})` })))
        )
    }, [])

    const totalReceivable = payments.reduce((s, p) => s + p.expected_amount_usd, 0)
    const totalReceived = payments.reduce((s, p) => s + p.received_amount_usd, 0)
    const pendingAmount = totalReceivable - totalReceived
    const netForex = payments.reduce((s, p) => s + (p.forex_gain_loss || 0), 0)

    const handleCreate = async () => {
        if (!formData.customer_id || !formData.export_invoice_id || !formData.received_amount_usd || !formData.bank_realization_rate) {
            toast.error('Customer, Invoice, Received amount and Bank rate are required')
            return
        }
        try {
            setSaving(true)
            await createExportPayment(formData as ExportPaymentFormData)
            toast.success('Payment recorded')
            setModalOpen(false)
            loadPayments()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to record payment')
            throw err
        } finally {
            setSaving(false)
        }
    }

    const handleCustomerSelect = async (customerId: string) => {
        setFormData((prev) => ({ ...prev, customer_id: customerId, export_invoice_id: undefined }))
        const invs = await getExportInvoices({ customer_id: customerId })
        setInvoices(
            invs
                .filter((i) => ['SENT', 'PAYMENT_PENDING', 'PARTIALLY_PAID'].includes(i.status))
                .map((i) => ({
                    id: i.id,
                    invoice_number: i.invoice_number,
                    amount_usd: i.amount_usd,
                    exchange_rate: i.exchange_rate,
                    customer_id: i.customer_id,
                    export_order_id: i.export_order_id,
                }))
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Export Payments"
                description="Payment tracking and forex"
                actions={
                    <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
                        Record Payment
                    </Button>
                }
            />

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="glass-card p-4">
                    <p className="text-xs text-gray-500 dark:text-dark-500">Total Receivable</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatUSD(totalReceivable)}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-xs text-gray-500 dark:text-dark-500">Total Received</p>
                    <p className="text-lg font-bold text-emerald-400">{formatUSD(totalReceived)}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-xs text-gray-500 dark:text-dark-500">Pending</p>
                    <p className="text-lg font-bold text-amber-400">{formatUSD(pendingAmount)}</p>
                </div>
                <div className="glass-card p-4 bg-red-500/5 border-red-500/20">
                    <p className="text-xs text-gray-500 dark:text-dark-500">Overdue</p>
                    <p className="text-lg font-bold text-red-400">$0</p>
                </div>
                <div className={cn('glass-card p-4', netForex >= 0 ? 'bg-emerald-500/5' : 'bg-red-500/5')}>
                    <p className="text-xs text-gray-500 dark:text-dark-500">Net Forex G/L</p>
                    <p className={cn('text-lg font-bold', netForex >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {formatINR(netForex)}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 max-w-md">
                    <Input
                        placeholder="Search payment#, customer..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={<Search size={16} />}
                    />
                </div>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
                <Select
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    options={[{ value: '', label: 'All Customers' }, ...customers]}
                    className="w-48"
                />
                <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={[
                        { value: 'ALL', label: 'All' },
                        { value: 'PENDING', label: 'Pending' },
                        { value: 'PARTIAL', label: 'Partial' },
                        { value: 'RECEIVED', label: 'Received' },
                        { value: 'OVERDUE', label: 'Overdue' },
                    ]}
                    className="w-40"
                />
            </div>

            {loading ? (
                <div className="glass-card p-8">
                    <div className="animate-pulse space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-12 bg-gray-200 dark:bg-dark-200 rounded-lg" />
                        ))}
                    </div>
                </div>
            ) : payments.length === 0 ? (
                <EmptyState
                    icon={<DollarSign size={48} />}
                    title="No payments yet"
                    description="Record payments received from export customers"
                    actionLabel="Record Payment"
                    onAction={() => setModalOpen(true)}
                />
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-dark-300">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Payment#</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Customer</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Invoice#</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Expected USD</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Received USD</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Bank Rate</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Realized INR</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Forex G/L</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Bank Ref</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((p) => (
                                <tr
                                    key={p.id}
                                    className={cn(
                                        'border-t border-gray-200 dark:border-dark-300 hover:bg-gray-50 dark:hover:bg-dark-200/30',
                                        p.status === 'OVERDUE' && 'border-l-4 border-l-red-500'
                                    )}
                                >
                                    <td className="px-4 py-3 font-mono text-blue-400">{p.payment_number}</td>
                                    <td className="px-4 py-3 text-sm">{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                        {(p.customer as { company_name?: string })?.company_name || '-'}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm">
                                        {(p.invoice as { invoice_number?: string })?.invoice_number || '-'}
                                    </td>
                                    <td className="px-4 py-3 font-mono">{formatUSD(p.expected_amount_usd)}</td>
                                    <td className="px-4 py-3 font-mono">{formatUSD(p.received_amount_usd)}</td>
                                    <td className="px-4 py-3">₹{p.bank_realization_rate?.toFixed(4)}</td>
                                    <td className="px-4 py-3 font-mono">{formatINR(p.realized_amount_inr)}</td>
                                    <td
                                        className={cn(
                                            'px-4 py-3 font-mono',
                                            (p.forex_gain_loss || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                                        )}
                                    >
                                        {(p.forex_gain_loss || 0) >= 0 ? '+' : ''}
                                        {formatINR(p.forex_gain_loss || 0)}
                                    </td>
                                    <td className="px-4 py-3 text-sm">{p.bank_reference || '-'}</td>
                                    <td className="px-4 py-3">
                                        <ExportStatusBadge status={p.status} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Record Payment"
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} isLoading={saving}>Record</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Select
                        label="Customer *"
                        value={formData.customer_id || ''}
                        onChange={(e) => handleCustomerSelect(e.target.value)}
                        options={[{ value: '', label: 'Select customer' }, ...customers]}
                    />
                    <Select
                        label="Invoice *"
                        value={formData.export_invoice_id || ''}
                        onChange={(e) => {
                            const inv = invoices.find((i) => i.id === e.target.value)
                            setFormData((prev) => ({
                                ...prev,
                                export_invoice_id: e.target.value,
                                export_order_id: inv?.export_order_id ?? undefined,
                                expected_amount_usd: inv?.amount_usd ?? 0,
                                customer_id: inv?.customer_id ?? prev.customer_id,
                            }))
                        }}
                        options={[
                            { value: '', label: 'Select invoice' },
                            ...invoices.map((i) => ({ value: i.id, label: `${i.invoice_number} - ${formatUSD(i.amount_usd)}` })),
                        ]}
                    />
                    <Input
                        label="Payment Date"
                        type="date"
                        value={formData.payment_date || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, payment_date: e.target.value }))}
                    />
                    <Input
                        label="Received Amount USD *"
                        type="number"
                        step="0.01"
                        value={formData.received_amount_usd || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, received_amount_usd: Number(e.target.value) }))}
                    />
                    <Input
                        label="Bank Realization Rate (₹/USD) *"
                        type="number"
                        step="0.0001"
                        value={formData.bank_realization_rate || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, bank_realization_rate: Number(e.target.value) }))}
                    />
                    <Input
                        label="Bank Reference"
                        value={formData.bank_reference || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, bank_reference: e.target.value || null }))}
                    />
                    <Input
                        label="Receiving Bank"
                        value={formData.receiving_bank || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, receiving_bank: e.target.value || null }))}
                    />
                </div>
            </Modal>
        </div>
    )
}
