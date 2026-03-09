import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportStatusBadge } from '../components/ExportStatusBadge'
import { CountryFlag } from '../components/CountryFlag'
import { ExportOrderForm } from '../components/ExportOrderForm'
import { formatUSD } from '@/lib/utils'
import { toast } from 'sonner'
import {
    getExportOrders,
    getExportCustomers,
    createExportOrder,
} from '../services/exportService'
import type { ExportOrder, ExportOrderFormData, ExportOrderItemFormData } from '../types/export.types'
import type { ExportOrderFilters } from '../types/export.types'

export function ExportOrdersPage() {
    const navigate = useNavigate()
    const [orders, setOrders] = useState<ExportOrder[]>([])
    const [customers, setCustomers] = useState<{ value: string; label: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [customerFilter, setCustomerFilter] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    const loadOrders = useCallback(async () => {
        try {
            setLoading(true)
            const filters: ExportOrderFilters = {}
            if (statusFilter !== 'ALL') filters.status = statusFilter as ExportOrderFilters['status']
            if (customerFilter) filters.customer_id = customerFilter
            if (dateFrom && dateTo) filters.date_range = { start: dateFrom, end: dateTo }
            if (search) filters.search = search
            const data = await getExportOrders(filters)
            setOrders(data)
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to load orders')
        } finally {
            setLoading(false)
        }
    }, [search, statusFilter, customerFilter, dateFrom, dateTo])

    useEffect(() => {
        loadOrders()
    }, [loadOrders])

    useEffect(() => {
        getExportCustomers({ is_active: true }).then((list) =>
            setCustomers(list.map((c) => ({ value: c.id, label: `${c.company_name} (${c.country})` })))
        )
    }, [])

    const handleCreate = async (data: ExportOrderFormData, items: ExportOrderItemFormData[]) => {
        try {
            setSaving(true)
            await createExportOrder(data, items)
            toast.success('Export order created')
            setModalOpen(false)
            loadOrders()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to create order')
            throw err
        } finally {
            setSaving(false)
        }
    }

    const statusTabs = ['ALL', 'DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED']

    return (
        <div className="space-y-6">
            <PageHeader
                title="Export Orders"
                description={`${orders.length} orders`}
                actions={
                    <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
                        New Export Order
                    </Button>
                }
            />

            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 max-w-md">
                    <Input
                        placeholder="Search order#, customer, buyer PO..."
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
                <div className="flex gap-2 flex-wrap">
                    {statusTabs.map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === s ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-200'}`}
                        >
                            {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="glass-card p-8">
                    <div className="animate-pulse space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-12 bg-gray-200 dark:bg-dark-200 rounded-lg" />
                        ))}
                    </div>
                </div>
            ) : orders.length === 0 ? (
                <EmptyState
                    icon={<ClipboardList size={48} />}
                    title="No export orders yet"
                    description="Create your first export order"
                    actionLabel="New Export Order"
                    onAction={() => setModalOpen(true)}
                />
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-dark-300">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Order#</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Customer</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Country</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Incoterm</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Mode</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o) => (
                                <tr
                                    key={o.id}
                                    className="border-t border-gray-200 dark:border-dark-300 hover:bg-gray-50 dark:hover:bg-dark-200/30 cursor-pointer"
                                    onClick={() => navigate(`/export/orders/${o.id}`)}
                                >
                                    <td className="px-4 py-3 font-mono text-blue-400">{o.order_number}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {new Date(o.order_date).toLocaleDateString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                        {(o.customer as { company_name?: string })?.company_name || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <CountryFlag country={(o.customer as { country?: string })?.country || ''} className="mr-1" />
                                        {(o.customer as { country?: string })?.country || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm">{o.incoterm}</td>
                                    <td className="px-4 py-3">{o.shipment_mode === 'SEA' ? '🚢' : '✈️'}</td>
                                    <td className="px-4 py-3 font-mono font-semibold">{formatUSD(o.total_amount_usd)}</td>
                                    <td className="px-4 py-3">
                                        <ExportStatusBadge status={o.status} />
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
                title="New Export Order"
                size="xl"
            >
                <ExportOrderForm
                    onSubmit={handleCreate}
                    onCancel={() => setModalOpen(false)}
                    isLoading={saving}
                />
            </Modal>
        </div>
    )
}
