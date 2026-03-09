import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft,
    FileText,
    Package,
    Ship,
    DollarSign,
    Edit2,
    Printer,
    ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportStatusBadge } from '../components/ExportStatusBadge'
import { CountryFlag } from '../components/CountryFlag'
import { DocumentChecklist } from '../components/DocumentChecklist'
import { ShipmentTracker } from '../components/ShipmentTracker'
import { PaymentTracker } from '../components/PaymentTracker'
import { ExportOrderForm } from '../components/ExportOrderForm'
import { ShipmentForm } from '../components/ShipmentForm'
import { ExportInvoiceForm } from '../components/ExportInvoiceForm'
import { PackingListForm } from '../components/PackingListForm'
import { formatUSD, formatINR, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import {
    getExportOrderById,
    updateExportOrderStatus,
    getDocumentsByOrder,
    updateDocumentStatus,
    createExportInvoice,
    createPackingList,
    createShipment,
} from '../services/exportService'
import type { ExportOrder, ExportOrderStatus, DocumentStatus } from '../types/export.types'
import { EXPORT_ORDER_STATUSES } from '../types/export.types'
import { cn } from '@/lib/utils'

const TABS = [
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'shipment', label: 'Shipment', icon: Ship },
    { id: 'invoice', label: 'Invoice', icon: FileText },
    { id: 'packing', label: 'Packing List', icon: Package },
    { id: 'payments', label: 'Payments', icon: DollarSign },
]

export function ExportOrderDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [order, setOrder] = useState<ExportOrder | null>(null)
    const [documents, setDocuments] = useState<Awaited<ReturnType<typeof getDocumentsByOrder>>>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('details')
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
    const [editOrderModal, setEditOrderModal] = useState(false)
    const [createInvoiceModal, setCreateInvoiceModal] = useState(false)
    const [createPackingModal, setCreatePackingModal] = useState(false)
    const [createShipmentModal, setCreateShipmentModal] = useState(false)
    const [paymentModal, setPaymentModal] = useState(false)

    const loadOrder = async () => {
        if (!id) return
        try {
            setLoading(true)
            const data = await getExportOrderById(id)
            setOrder(data ?? null)
            if (data) {
                const docs = await getDocumentsByOrder(id)
                setDocuments(docs)
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to load order')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadOrder()
    }, [id])

    const handleStatusChange = async (status: ExportOrderStatus) => {
        if (!id) return
        try {
            await updateExportOrderStatus(id, status)
            toast.success('Status updated')
            setStatusDropdownOpen(false)
            loadOrder()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to update status')
        }
    }

    const handleDocumentStatusChange = async (docId: string, status: DocumentStatus) => {
        try {
            await updateDocumentStatus(docId, status)
            loadOrder()
            if (id) {
                const docs = await getDocumentsByOrder(id)
                setDocuments(docs)
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to update document')
        }
    }

    const nextStatuses = order
        ? EXPORT_ORDER_STATUSES.filter((s) => {
            const idx = EXPORT_ORDER_STATUSES.findIndex((x) => x.value === order.status)
            const nextIdx = idx + 1
            return idx >= 0 && nextIdx < EXPORT_ORDER_STATUSES.length && EXPORT_ORDER_STATUSES[nextIdx].value !== 'CANCELLED'
        }).slice(0, 3)
        : []

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-10 w-48 bg-gray-200 dark:bg-dark-200 rounded-lg animate-pulse" />
                <div className="h-64 bg-gray-200 dark:bg-dark-200 rounded-xl animate-pulse" />
            </div>
        )
    }

    if (!order) {
        return (
            <EmptyState
                icon={<FileText size={48} />}
                title="Order not found"
                description="The order may have been deleted"
                actionLabel="Back to Orders"
                onAction={() => navigate('/export/orders')}
            />
        )
    }

    const customer = order.customer as { company_name?: string; country?: string } | undefined

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <button
                        onClick={() => navigate('/export/orders')}
                        className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-500 hover:text-gray-900 dark:hover:text-white mb-2"
                    >
                        <ArrowLeft size={16} /> Back to Orders
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{order.order_number}</h1>
                        <ExportStatusBadge status={order.status} />
                        <CountryFlag country={customer?.country || ''} className="text-xl" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-dark-500 mt-1">
                        {customer?.company_name || 'Customer'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {['DRAFT', 'CONFIRMED'].includes(order.status) && (
                        <Button size="sm" variant="secondary" onClick={() => setEditOrderModal(true)} icon={<Edit2 size={14} />}>
                            Edit Order
                        </Button>
                    )}
                    <div className="relative">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                            icon={<ChevronDown size={14} />}
                        >
                            Change Status
                        </Button>
                        {statusDropdownOpen && (
                            <div className="absolute right-0 mt-1 w-48 rounded-lg border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-100 shadow-lg z-10">
                                {EXPORT_ORDER_STATUSES.filter((s) => s.value !== order.status).map((s) => (
                                    <button
                                        key={s.value}
                                        onClick={() => handleStatusChange(s.value)}
                                        className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-200"
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <Button size="sm" variant="secondary" icon={<Printer size={14} />}>
                        Print
                    </Button>
                    {!order.invoice && (
                        <Button size="sm" onClick={() => setCreateInvoiceModal(true)} icon={<FileText size={14} />}>
                            Create Invoice
                        </Button>
                    )}
                    {!order.packing_list && (
                        <Button size="sm" onClick={() => setCreatePackingModal(true)} icon={<Package size={14} />}>
                            Create Packing List
                        </Button>
                    )}
                    {!order.shipment && (
                        <Button size="sm" onClick={() => setCreateShipmentModal(true)} icon={<Ship size={14} />}>
                            Create Shipment
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex gap-2 border-b border-gray-200 dark:border-dark-300 overflow-x-auto">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            'px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                            activeTab === tab.id
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-gray-500 dark:text-dark-500 hover:text-gray-900 dark:hover:text-white'
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'details' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-card p-6">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Order Information</h3>
                            <dl className="space-y-2 text-sm">
                                <div><dt className="text-gray-500 dark:text-dark-500">Order#</dt><dd className="font-mono">{order.order_number}</dd></div>
                                <div><dt className="text-gray-500 dark:text-dark-500">Date</dt><dd>{formatDate(order.order_date)}</dd></div>
                                <div><dt className="text-gray-500 dark:text-dark-500">Buyer PO#</dt><dd>{order.buyer_po_number || '-'}</dd></div>
                                <div><dt className="text-gray-500 dark:text-dark-500">Buyer PO Date</dt><dd>{order.buyer_po_date ? formatDate(order.buyer_po_date) : '-'}</dd></div>
                                <div><dt className="text-gray-500 dark:text-dark-500">Incoterm</dt><dd>{order.incoterm}</dd></div>
                                <div><dt className="text-gray-500 dark:text-dark-500">Port of Loading</dt><dd>{order.port_of_loading}</dd></div>
                                <div><dt className="text-gray-500 dark:text-dark-500">Port of Destination</dt><dd>{order.port_of_destination}</dd></div>
                                <div><dt className="text-gray-500 dark:text-dark-500">Country</dt><dd>{order.country_of_destination}</dd></div>
                                <div><dt className="text-gray-500 dark:text-dark-500">Shipment Mode</dt><dd>{order.shipment_mode === 'SEA' ? '🚢 Sea' : '✈️ Air'}</dd></div>
                                <div><dt className="text-gray-500 dark:text-dark-500">Expected Shipment</dt><dd>{order.expected_shipment_date ? formatDate(order.expected_shipment_date) : '-'}</dd></div>
                                <div><dt className="text-gray-500 dark:text-dark-500">Delivery Deadline</dt><dd>{order.delivery_deadline ? formatDate(order.delivery_deadline) : '-'}</dd></div>
                            </dl>
                        </div>
                        <div className="glass-card p-6">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Financial Summary</h3>
                            <dl className="space-y-2 text-sm">
                                <div><dt className="text-gray-500 dark:text-dark-500">Total USD</dt><dd className="font-mono font-semibold">{formatUSD(order.total_amount_usd)}</dd></div>
                                <div><dt className="text-gray-500 dark:text-dark-500">Exchange Rate</dt><dd>₹{order.exchange_rate?.toFixed(4)}/USD</dd></div>
                                <div><dt className="text-gray-500 dark:text-dark-500">Total INR</dt><dd className="font-mono font-semibold">{formatINR(order.total_amount_inr)}</dd></div>
                                <div><dt className="text-gray-500 dark:text-dark-500">LUT ARN</dt><dd>{order.lut_arn || '-'}</dd></div>
                                <div><dt className="text-gray-500 dark:text-dark-500">LUT Date</dt><dd>{order.lut_date ? formatDate(order.lut_date) : '-'}</dd></div>
                            </dl>
                        </div>
                    </div>
                    <div className="glass-card overflow-hidden">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white p-4 border-b border-gray-200 dark:border-dark-300">Items</h3>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-dark-200">
                                    <th className="px-4 py-2 text-left">Product</th>
                                    <th className="px-4 py-2 text-left">Code</th>
                                    <th className="px-4 py-2 text-left">HSN</th>
                                    <th className="px-4 py-2 text-left">Qty</th>
                                    <th className="px-4 py-2 text-left">Unit</th>
                                    <th className="px-4 py-2 text-left">Rate USD</th>
                                    <th className="px-4 py-2 text-left">Amount USD</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items?.map((item) => (
                                    <tr key={item.id} className="border-t border-gray-200 dark:border-dark-300">
                                        <td className="px-4 py-2">{item.product_name}</td>
                                        <td className="px-4 py-2">{item.product_code}</td>
                                        <td className="px-4 py-2">{item.hsn_code}</td>
                                        <td className="px-4 py-2">{item.quantity}</td>
                                        <td className="px-4 py-2">{item.unit_of_measure}</td>
                                        <td className="px-4 py-2 font-mono">{formatUSD(item.rate_usd)}</td>
                                        <td className="px-4 py-2 font-mono font-semibold">{formatUSD(item.amount_usd)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-100 dark:bg-dark-200 font-semibold">
                                    <td colSpan={6} className="px-4 py-2 text-right">Total</td>
                                    <td className="px-4 py-2 font-mono">{formatUSD(order.total_amount_usd)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'documents' && (
                <div className="glass-card p-6">
                    <DocumentChecklist
                        documents={documents}
                        onStatusChange={handleDocumentStatusChange}
                    />
                </div>
            )}

            {activeTab === 'shipment' && (
                <div className="glass-card p-6">
                    {order.shipment ? (
                        <ShipmentTracker shipment={order.shipment} />
                    ) : (
                        <EmptyState
                            icon={<Ship size={48} />}
                            title="No shipment yet"
                            description="Create a shipment to track this order"
                            actionLabel="Create Shipment"
                            onAction={() => setCreateShipmentModal(true)}
                        />
                    )}
                </div>
            )}

            {activeTab === 'invoice' && (
                <div className="glass-card p-6">
                    {order.invoice ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-dark-500">Invoice</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {(order.invoice as { invoice_number?: string }).invoice_number}
                                    </p>
                                </div>
                                <Button size="sm" icon={<Printer size={14} />}>Print</Button>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Amount: {formatUSD((order.invoice as { amount_usd?: number }).amount_usd ?? 0)} / {formatINR((order.invoice as { amount_inr?: number }).amount_inr ?? 0)}
                            </p>
                            {(order.invoice as { lut_arn?: string }).lut_arn && (
                                <p className="text-xs text-gray-500 dark:text-dark-500">
                                    Supply meant for export under LUT without payment of IGST. LUT ARN: {(order.invoice as { lut_arn?: string }).lut_arn}
                                </p>
                            )}
                        </div>
                    ) : (
                        <EmptyState
                            icon={<FileText size={48} />}
                            title="No invoice yet"
                            description="Create an export invoice for this order"
                            actionLabel="Create Invoice"
                            onAction={() => setCreateInvoiceModal(true)}
                        />
                    )}
                </div>
            )}

            {activeTab === 'packing' && (
                <div className="glass-card p-6">
                    {order.packing_list ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {(order.packing_list as { packing_list_number?: string }).packing_list_number}
                                </p>
                                <Button size="sm" icon={<Printer size={14} />}>Print</Button>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Packages: {(order.packing_list as { total_packages?: number }).total_packages} | 
                                Net Wt: {(order.packing_list as { total_net_weight_kg?: number }).total_net_weight_kg} KG |
                                Gross Wt: {(order.packing_list as { total_gross_weight_kg?: number }).total_gross_weight_kg} KG |
                                CBM: {(order.packing_list as { total_cbm?: number }).total_cbm}
                            </p>
                        </div>
                    ) : (
                        <EmptyState
                            icon={<Package size={48} />}
                            title="No packing list yet"
                            description="Create a packing list for this order"
                            actionLabel="Create Packing List"
                            onAction={() => setCreatePackingModal(true)}
                        />
                    )}
                </div>
            )}

            {activeTab === 'payments' && (
                <div className="glass-card p-6">
                    <PaymentTracker
                        expectedUsd={order.total_amount_usd}
                        payments={order.payments || []}
                        invoice={order.invoice as import('../types/export.types').ExportInvoice | undefined}
                        onAddPayment={() => setPaymentModal(true)}
                    />
                </div>
            )}

            <Modal isOpen={createInvoiceModal} onClose={() => setCreateInvoiceModal(false)} title="Create Invoice" size="lg">
                <ExportInvoiceForm
                    orderId={id}
                    onSubmit={async (data) => {
                        await createExportInvoice(data)
                        toast.success('Invoice created')
                        setCreateInvoiceModal(false)
                        loadOrder()
                    }}
                    onCancel={() => setCreateInvoiceModal(false)}
                />
            </Modal>

            <Modal isOpen={createPackingModal} onClose={() => setCreatePackingModal(false)} title="Create Packing List" size="xl">
                <PackingListForm
                    orderId={id}
                    onSubmit={async (data, items) => {
                        await createPackingList(data, items)
                        toast.success('Packing list created')
                        setCreatePackingModal(false)
                        loadOrder()
                    }}
                    onCancel={() => setCreatePackingModal(false)}
                />
            </Modal>

            {id && (
                <Modal isOpen={createShipmentModal} onClose={() => setCreateShipmentModal(false)} title="Create Shipment" size="lg">
                    <ShipmentForm
                        orderId={id}
                        onSubmit={async (data) => {
                            await createShipment(data)
                            toast.success('Shipment created')
                            setCreateShipmentModal(false)
                            loadOrder()
                        }}
                        onCancel={() => setCreateShipmentModal(false)}
                    />
                </Modal>
            )}
        </div>
    )
}
