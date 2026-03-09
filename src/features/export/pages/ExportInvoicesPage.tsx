import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, FileText, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportStatusBadge } from '../components/ExportStatusBadge'
import { ExportInvoiceForm } from '../components/ExportInvoiceForm'
import { formatUSD, formatINR } from '@/lib/utils'
import { toast } from 'sonner'
import {
    getExportInvoices,
    getExportCustomers,
    createExportInvoice,
} from '../services/exportService'
import type { ExportInvoice, ExportInvoiceFormData } from '../types/export.types'
import type { ExportInvoiceFilters } from '../types/export.types'

export function ExportInvoicesPage() {
    const [invoices, setInvoices] = useState<ExportInvoice[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [customerFilter, setCustomerFilter] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [detailModalOpen, setDetailModalOpen] = useState(false)
    const [selectedInvoice, setSelectedInvoice] = useState<ExportInvoice | null>(null)
    const [saving, setSaving] = useState(false)
    const [customers, setCustomers] = useState<{ value: string; label: string }[]>([])

    const loadInvoices = useCallback(async () => {
        try {
            setLoading(true)
            const filters: ExportInvoiceFilters = {}
            if (statusFilter !== 'ALL') filters.status = statusFilter as ExportInvoiceFilters['status']
            if (customerFilter) filters.customer_id = customerFilter
            if (dateFrom && dateTo) filters.date_range = { start: dateFrom, end: dateTo }
            if (search) filters.search = search
            const data = await getExportInvoices(filters)
            setInvoices(data)
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to load invoices')
        } finally {
            setLoading(false)
        }
    }, [search, statusFilter, customerFilter, dateFrom, dateTo])

    useEffect(() => {
        loadInvoices()
    }, [loadInvoices])

    useEffect(() => {
        getExportCustomers({ is_active: true }).then((list) =>
            setCustomers(list.map((c) => ({ value: c.id, label: `${c.company_name} (${c.country})` })))
        )
    }, [])

    const handleCreate = async (data: ExportInvoiceFormData) => {
        try {
            setSaving(true)
            await createExportInvoice(data)
            toast.success('Invoice created')
            setModalOpen(false)
            loadInvoices()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to create invoice')
            throw err
        } finally {
            setSaving(false)
        }
    }

    const statusOptions = [
        { value: 'ALL', label: 'All' },
        { value: 'DRAFT', label: 'Draft' },
        { value: 'SENT', label: 'Sent' },
        { value: 'PAYMENT_PENDING', label: 'Payment Pending' },
        { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
        { value: 'PAID', label: 'Paid' },
        { value: 'CANCELLED', label: 'Cancelled' },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Export Invoices"
                description={`${invoices.length} invoices`}
                actions={
                    <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
                        Create Invoice
                    </Button>
                }
            />

            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 max-w-md">
                    <Input
                        placeholder="Search invoice#, customer..."
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
                    options={statusOptions}
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
            ) : invoices.length === 0 ? (
                <EmptyState
                    icon={<FileText size={48} />}
                    title="No export invoices yet"
                    description="Create your first export invoice"
                    actionLabel="Create Invoice"
                    onAction={() => setModalOpen(true)}
                />
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-dark-300">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Invoice#</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Customer</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Order#</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Amount USD</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Amount INR</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Rate</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Shipping Bill#</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((inv) => (
                                <tr
                                    key={inv.id}
                                    className="border-t border-gray-200 dark:border-dark-300 hover:bg-gray-50 dark:hover:bg-dark-200/30 cursor-pointer"
                                    onClick={() => {
                                        setSelectedInvoice(inv)
                                        setDetailModalOpen(true)
                                    }}
                                >
                                    <td className="px-4 py-3 font-mono text-blue-400">{inv.invoice_number}</td>
                                    <td className="px-4 py-3 text-sm">{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                        {(inv.customer as { company_name?: string })?.company_name || '-'}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm">
                                        {(inv.order as { order_number?: string })?.order_number || '-'}
                                    </td>
                                    <td className="px-4 py-3 font-mono">{formatUSD(inv.amount_usd)}</td>
                                    <td className="px-4 py-3 font-mono">{formatINR(inv.amount_inr)}</td>
                                    <td className="px-4 py-3">₹{inv.exchange_rate?.toFixed(4)}</td>
                                    <td className="px-4 py-3 text-sm">{inv.shipping_bill_number || '-'}</td>
                                    <td className="px-4 py-3">
                                        <ExportStatusBadge status={inv.status} />
                                    </td>
                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                        <Button size="sm" variant="ghost" icon={<Printer size={14} />}>
                                            Print
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Export Invoice" size="lg">
                <ExportInvoiceForm
                    onSubmit={handleCreate}
                    onCancel={() => setModalOpen(false)}
                    isLoading={saving}
                />
            </Modal>

            <Modal
                isOpen={detailModalOpen}
                onClose={() => { setDetailModalOpen(false); setSelectedInvoice(null) }}
                title={selectedInvoice ? `Invoice ${selectedInvoice.invoice_number}` : 'Invoice'}
                size="lg"
                footer={
                    <Button icon={<Printer size={14} />} onClick={() => window.print()}>
                        Print
                    </Button>
                }
            >
                {selectedInvoice && (
                    <div className="space-y-4 text-sm">
                        <p>Customer: {(selectedInvoice.customer as { company_name?: string })?.company_name}</p>
                        <p>Amount: {formatUSD(selectedInvoice.amount_usd)} / {formatINR(selectedInvoice.amount_inr)}</p>
                        {selectedInvoice.lut_arn && (
                            <p className="text-gray-500 dark:text-dark-500">
                                Supply meant for export under LUT without payment of IGST. LUT ARN: {selectedInvoice.lut_arn}
                            </p>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    )
}
