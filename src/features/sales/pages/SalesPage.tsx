import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Search, Download, Edit2, Trash2, X, Save, ChevronLeft, ChevronRight,
    AlertCircle, ShoppingCart, Package, Users, IndianRupee, Calendar,
    Check, Truck, Clock, XCircle, ChevronDown, ChevronUp, Minus,
    FileText, ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
    getSalesOrders, getSalesOrderById, createSalesOrder, updateSalesOrderStatus,
    deleteSalesOrder, getSalesOrderStats, calculateLineItem, calculateOrderTotals,
    PAYMENT_METHODS, SO_STATUSES,
    type SalesOrder, type SalesOrderItem, type SalesOrderFormData, EMPTY_SO_FORM,
} from '@/services/salesService'

// ============ STATUS PROGRESS BAR ============
const STATUS_STEPS = ['draft', 'confirmed', 'processing', 'shipped', 'delivered']

function StatusProgress({ current }: { current: string }) {
    const currentIndex = STATUS_STEPS.indexOf(current)
    const isCancelled = current === 'cancelled'

    if (isCancelled) {
        return (
            <div className="flex items-center gap-2">
                <XCircle size={16} className="text-red-400" />
                <span className="text-sm text-red-400 font-medium">Cancelled</span>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-1 w-full">
            {STATUS_STEPS.map((step, index) => {
                const isCompleted = index <= currentIndex
                const isCurrent = index === currentIndex
                return (
                    <div key={step} className="flex items-center flex-1">
                        <div className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all',
                            isCompleted ? 'bg-blue-500 text-white' : 'bg-dark-300 text-dark-500',
                            isCurrent && 'ring-2 ring-blue-500/30'
                        )}>
                            {isCompleted ? <Check size={12} /> : index + 1}
                        </div>
                        {index < STATUS_STEPS.length - 1 && (
                            <div className={cn('flex-1 h-0.5 mx-1', isCompleted ? 'bg-blue-500' : 'bg-dark-300')} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// ============ ORDER DETAIL PANEL ============
function OrderDetail({ orderId, onClose, onRefresh }: {
    orderId: string; onClose: () => void; onRefresh: () => void
}) {
    const [order, setOrder] = useState<SalesOrder | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        loadOrder()
    }, [orderId])

    const loadOrder = async () => {
        try {
            setLoading(true)
            const data = await getSalesOrderById(orderId)
            setOrder(data)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async (newStatus: string) => {
        if (!order) return
        try {
            setUpdating(true)
            await updateSalesOrderStatus(order.id, newStatus)
            toast.success(`Order ${newStatus}!`)
            loadOrder()
            onRefresh()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setUpdating(false)
        }
    }

    const getNextStatus = (): string | null => {
        if (!order) return null
        const idx = STATUS_STEPS.indexOf(order.status)
        if (idx < STATUS_STEPS.length - 1) return STATUS_STEPS[idx + 1]
        return null
    }

    if (loading) {
        return (
            <div className="glass-card p-8"><div className="animate-pulse space-y-4">
                <div className="h-6 bg-dark-200 rounded w-1/3" />
                <div className="h-4 bg-dark-200 rounded w-1/2" />
                <div className="h-32 bg-dark-200 rounded" />
            </div></div>
        )
    }

    if (!order) return null

    const nextStatus = getNextStatus()

    return (
        <div className="glass-card h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-300/50">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-white">{order.order_number}</h2>
                        <StatusBadge status={order.status} />
                        <StatusBadge status={order.payment_status} />
                    </div>
                    <p className="text-xs text-dark-500 mt-1">{order.customer_name} • {formatDate(order.order_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                    {nextStatus && order.status !== 'cancelled' && (
                        <Button size="sm" onClick={() => handleStatusChange(nextStatus)} isLoading={updating}
                            icon={<ArrowRight size={14} />}>
                            {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                        </Button>
                    )}
                    {order.status === 'draft' && (
                        <Button size="sm" variant="danger" onClick={() => handleStatusChange('cancelled')} isLoading={updating}>
                            Cancel
                        </Button>
                    )}
                    <button onClick={onClose} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Progress */}
                <div className="bg-dark-200/20 rounded-xl p-4">
                    <p className="text-xs text-dark-500 mb-3 uppercase tracking-wider">Order Progress</p>
                    <StatusProgress current={order.status} />
                    <div className="flex justify-between mt-2">
                        {STATUS_STEPS.map(s => (
                            <span key={s} className="text-[9px] text-dark-600 capitalize">{s}</span>
                        ))}
                    </div>
                </div>

                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Customer', value: order.customer_name, icon: Users },
                        { label: 'Phone', value: order.customer_phone || '-', icon: Users },
                        { label: 'Order Date', value: formatDate(order.order_date), icon: Calendar },
                        { label: 'Delivery Date', value: order.delivery_date ? formatDate(order.delivery_date) : 'Not set', icon: Truck },
                        { label: 'Payment', value: order.payment_method || 'Not set', icon: IndianRupee },
                        { label: 'Items', value: `${order.items?.length || 0} products`, icon: Package },
                    ].map(item => (
                        <div key={item.label} className="space-y-1">
                            <div className="flex items-center gap-1.5 text-dark-600">
                                <item.icon size={12} />
                                <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
                            </div>
                            <p className="text-sm text-white">{item.value}</p>
                        </div>
                    ))}
                </div>

                {/* Line Items */}
                <div>
                    <p className="text-sm font-semibold text-white mb-3">Order Items</p>
                    <div className="space-y-2">
                        {order.items?.map((item, idx) => (
                            <div key={item.id || idx} className="bg-dark-200/20 rounded-lg p-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-white">{item.product_name}</p>
                                        <p className="text-xs text-dark-500">{item.product_sku}</p>
                                    </div>
                                    <p className="text-sm font-semibold text-blue-400">{formatCurrency(item.total_amount)}</p>
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-xs text-dark-500">
                                    <span>Qty: {item.quantity}</span>
                                    <span>Price: {formatCurrency(item.unit_price)}</span>
                                    {item.discount_percent > 0 && <span className="text-amber-400">Disc: {item.discount_percent}%</span>}
                                    <span>GST: {item.tax_rate}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Totals */}
                <div className="bg-dark-200/20 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-dark-500">Subtotal</span>
                        <span className="text-white">{formatCurrency(order.subtotal)}</span>
                    </div>
                    {order.discount_amount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-dark-500">Discount</span>
                            <span className="text-amber-400">-{formatCurrency(order.discount_amount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm">
                        <span className="text-dark-500">Tax (GST)</span>
                        <span className="text-white">{formatCurrency(order.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t border-dark-300/30 pt-2">
                        <span className="text-white">Total</span>
                        <span className="text-blue-400">{formatCurrency(order.total_amount)}</span>
                    </div>
                </div>

                {order.notes && (
                    <div className="space-y-1">
                        <p className="text-[10px] text-dark-600 uppercase">Notes</p>
                        <p className="text-sm text-dark-500 bg-dark-200/20 p-3 rounded-lg">{order.notes}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ============ CREATE ORDER WIZARD ============
function CreateOrderWizard({ isOpen, onClose, onCreated }: {
    isOpen: boolean; onClose: () => void; onCreated: () => void
}) {
    const { user } = useAuthStore()
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState<SalesOrderFormData>(EMPTY_SO_FORM)
    const [customers, setCustomers] = useState<{ value: string; label: string; phone?: string }[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [productSearch, setProductSearch] = useState('')

    useEffect(() => {
        if (isOpen) {
            setStep(1)
            setFormData(EMPTY_SO_FORM)
            loadCustomers()
            loadProducts()
        }
    }, [isOpen])

    const loadCustomers = async () => {
        const { data } = await supabase.from('customers').select('id, name, phone').eq('status', 'active').order('name')
        setCustomers((data || []).map((c: any) => ({ value: c.id, label: c.name, phone: c.phone })))
    }

    const loadProducts = async () => {
        const { data } = await supabase.from('products').select('id, name, sku, selling_price, mrp, tax_rate').eq('status', 'active').order('name')
        setProducts(data || [])
    }

    const addProduct = (product: any) => {
        const exists = formData.items.find(i => i.product_id === product.id)
        if (exists) {
            toast.error('Product already added')
            return
        }

        const newItem = calculateLineItem({
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            quantity: 1,
            unit_price: product.selling_price || 0,
            discount_percent: 0,
            tax_rate: product.tax_rate || 12,
            tax_amount: 0,
            total_amount: 0,
        })

        setFormData(p => ({ ...p, items: [...p.items, newItem] }))
    }

    const updateItem = (index: number, field: string, value: number) => {
        setFormData(p => {
            const items = [...p.items]
            items[index] = calculateLineItem({ ...items[index], [field]: value })
            return { ...p, items }
        })
    }

    const removeItem = (index: number) => {
        setFormData(p => ({ ...p, items: p.items.filter((_, i) => i !== index) }))
    }

    const handleCreate = async () => {
        if (!formData.customer_id) { toast.error('Select a customer'); setStep(1); return }
        if (formData.items.length === 0) { toast.error('Add at least one product'); setStep(2); return }

        try {
            setIsSaving(true)
            await createSalesOrder(formData, user?.id)
            toast.success('Sales Order created!')
            onCreated()
            onClose()
        } catch (err: any) {
            toast.error('Failed: ' + err.message)
        } finally {
            setIsSaving(false)
        }
    }

    const totals = calculateOrderTotals(formData.items)
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase())
    )

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Sales Order" size="xl"
            footer={
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                                step === s ? 'bg-blue-500 text-white' : step > s ? 'bg-blue-500/20 text-blue-400' : 'bg-dark-300 text-dark-500')}>
                                {step > s ? <Check size={14} /> : s}
                            </div>
                        ))}
                        <span className="text-xs text-dark-500 ml-2">
                            {step === 1 ? 'Customer & Details' : step === 2 ? 'Add Products' : 'Review & Confirm'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {step > 1 && <Button variant="secondary" onClick={() => setStep(s => s - 1)}>Back</Button>}
                        {step < 3 && <Button onClick={() => {
                            if (step === 1 && !formData.customer_id) { toast.error('Select customer'); return }
                            if (step === 2 && formData.items.length === 0) { toast.error('Add products'); return }
                            setStep(s => s + 1)
                        }}>Next</Button>}
                        {step === 3 && <Button onClick={handleCreate} isLoading={isSaving} icon={<Save size={16} />}>Create Order</Button>}
                    </div>
                </div>
            }>

            {/* STEP 1: Customer & Details */}
            {step === 1 && (
                <div className="space-y-4">
                    <Select label="Customer *" value={formData.customer_id}
                        onChange={(e) => setFormData(p => ({ ...p, customer_id: e.target.value }))}
                        options={customers} placeholder="Select customer" />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Order Date" type="date" value={formData.order_date}
                            onChange={(e) => setFormData(p => ({ ...p, order_date: e.target.value }))} />
                        <Input label="Delivery Date" type="date" value={formData.delivery_date}
                            onChange={(e) => setFormData(p => ({ ...p, delivery_date: e.target.value }))} />
                    </div>
                    <Select label="Payment Method" value={formData.payment_method}
                        onChange={(e) => setFormData(p => ({ ...p, payment_method: e.target.value }))}
                        options={PAYMENT_METHODS} placeholder="Select method" />
                    <Textarea label="Shipping Address" value={formData.shipping_address}
                        onChange={(e) => setFormData(p => ({ ...p, shipping_address: e.target.value }))}
                        placeholder="Delivery address..." rows={2} />
                    <Textarea label="Notes" value={formData.notes}
                        onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Internal notes..." rows={2} />
                </div>
            )}

            {/* STEP 2: Products */}
            {step === 2 && (
                <div className="space-y-4">
                    {/* Product Search */}
                    <Input placeholder="Search products to add..." value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)} icon={<Search size={16} />} />

                    {/* Available Products */}
                    <div className="max-h-48 overflow-y-auto space-y-1 border border-dark-300/30 rounded-lg p-2">
                        {filteredProducts.slice(0, 20).map(p => (
                            <button key={p.id} onClick={() => addProduct(p)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-dark-200/50 transition-colors text-left">
                                <div>
                                    <p className="text-sm text-white">{p.name}</p>
                                    <p className="text-xs text-dark-500">{p.sku}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-mono text-blue-400">{formatCurrency(p.selling_price)}</p>
                                    <p className="text-xs text-dark-500">GST {p.tax_rate}%</p>
                                </div>
                            </button>
                        ))}
                        {filteredProducts.length === 0 && <p className="text-sm text-dark-500 text-center py-4">No products found</p>}
                    </div>

                    {/* Added Items */}
                    {formData.items.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-white">Added Items ({formData.items.length})</p>
                            {formData.items.map((item, idx) => (
                                <div key={idx} className="bg-dark-200/20 rounded-lg p-3">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="text-sm font-medium text-white">{item.product_name}</p>
                                            <p className="text-xs text-dark-500">{item.product_sku}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-blue-400">{formatCurrency(item.total_amount)}</p>
                                            <button onClick={() => removeItem(idx)}
                                                className="p-1 rounded text-dark-500 hover:text-red-400"><Minus size={14} /></button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <Input label="Qty" type="number" value={item.quantity}
                                            onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} />
                                        <Input label="Price (₹)" type="number" value={item.unit_price}
                                            onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))} />
                                        <Input label="Disc %" type="number" value={item.discount_percent}
                                            onChange={(e) => updateItem(idx, 'discount_percent', Number(e.target.value))} />
                                        <Input label="GST %" type="number" value={item.tax_rate}
                                            onChange={(e) => updateItem(idx, 'tax_rate', Number(e.target.value))} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Running Total */}
                    {formData.items.length > 0 && (
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 flex justify-between items-center">
                            <span className="text-sm text-dark-500">Running Total</span>
                            <span className="text-lg font-bold text-blue-400">{formatCurrency(totals.total_amount)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 3: Review */}
            {step === 3 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-xs text-dark-600">Customer</p>
                            <p className="text-sm text-white font-medium">
                                {customers.find(c => c.value === formData.customer_id)?.label || '-'}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-dark-600">Order Date</p>
                            <p className="text-sm text-white">{formData.order_date}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-dark-600">Delivery Date</p>
                            <p className="text-sm text-white">{formData.delivery_date || 'Not set'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-dark-600">Payment</p>
                            <p className="text-sm text-white">{formData.payment_method || 'Not set'}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-white">Items ({formData.items.length})</p>
                        {formData.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-dark-200/20 rounded-lg p-3">
                                <div>
                                    <p className="text-sm text-white">{item.product_name}</p>
                                    <p className="text-xs text-dark-500">{item.quantity} × {formatCurrency(item.unit_price)}
                                        {item.discount_percent > 0 && ` (-${item.discount_percent}%)`}
                                        {` + GST ${item.tax_rate}%`}</p>
                                </div>
                                <p className="text-sm font-semibold text-blue-400">{formatCurrency(item.total_amount)}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-dark-500">Subtotal</span><span className="text-white">{formatCurrency(totals.subtotal)}</span>
                        </div>
                        {totals.discount_amount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-500">Discount</span><span className="text-amber-400">-{formatCurrency(totals.discount_amount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="text-dark-500">GST</span><span className="text-white">{formatCurrency(totals.tax_amount)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t border-dark-300/30 pt-2">
                            <span className="text-white">Total</span><span className="text-blue-400">{formatCurrency(totals.total_amount)}</span>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    )
}

// ============ MAIN PAGE ============
export function SalesPage() {
    const [orders, setOrders] = useState<SalesOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 25

    const [showWizard, setShowWizard] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [deletingOrder, setDeletingOrder] = useState<SalesOrder | null>(null)
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [stats, setStats] = useState({ total: 0, draft: 0, confirmed: 0, processing: 0, delivered: 0, totalValue: 0, unpaid: 0 })

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getSalesOrders({ page, pageSize }, { status: statusFilter, search }),
                getSalesOrderStats(),
            ])
            setOrders(result.data)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
        } catch (err: any) {
            toast.error('Failed: ' + err.message)
        } finally {
            setIsLoading(false)
        }
    }, [page, statusFilter, search])

    useEffect(() => { fetchData() }, [fetchData])
    useEffect(() => {
        const t = setTimeout(() => { setPage(1); fetchData() }, 300)
        return () => clearTimeout(t)
    }, [search])

    const handleDelete = async () => {
        if (!deletingOrder) return
        try {
            setIsDeleting(true)
            await deleteSalesOrder(deletingOrder.id)
            toast.success('Order deleted!')
            setIsDeleteModalOpen(false); setDeletingOrder(null)
            if (selectedOrderId === deletingOrder.id) setSelectedOrderId(null)
            fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsDeleting(false) }
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Sales Orders"
                description={`${stats.total} orders • Value: ${formatCurrency(stats.totalValue)}`}
                actions={<div className="flex items-center gap-3">
                    <Button variant="secondary" icon={<Download size={16} />} size="sm">Export</Button>
                    <Button icon={<Plus size={16} />} onClick={() => setShowWizard(true)}>New Order</Button>
                </div>} />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                    { label: 'Total', value: stats.total, color: 'text-blue-400' },
                    { label: 'Draft', value: stats.draft, color: 'text-dark-500' },
                    { label: 'Confirmed', value: stats.confirmed, color: 'text-blue-400' },
                    { label: 'Processing', value: stats.processing, color: 'text-purple-400' },
                    { label: 'Delivered', value: stats.delivered, color: 'text-emerald-400' },
                    { label: 'Unpaid', value: stats.unpaid, color: 'text-red-400' },
                    { label: 'Value', value: formatCurrency(stats.totalValue), color: 'text-blue-400' },
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
                    <Input placeholder="Search by order number..." value={search}
                        onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {['all', ...STATUS_STEPS, 'cancelled'].map(s => (
                        <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                statusFilter === s ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Split View */}
            <div className={cn('flex gap-6', selectedOrderId ? 'items-start' : '')}>
                <div className={cn('transition-all duration-300', selectedOrderId ? 'w-1/2' : 'w-full')}>
                    {isLoading ? (
                        <div className="glass-card p-8"><div className="animate-pulse space-y-3">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-dark-200 rounded-lg" />)}
                        </div></div>
                    ) : orders.length === 0 ? (
                        <EmptyState icon={<ShoppingCart size={48} />} title="No sales orders"
                            description="Create your first sales order" actionLabel="New Order" onAction={() => setShowWizard(true)} />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead><tr className="border-b border-dark-300/50">
                                    {['Order', 'Customer', 'Date', 'Status', 'Payment', 'Total', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-dark-300/30">
                                    {orders.map(o => (
                                        <tr key={o.id} onClick={() => setSelectedOrderId(o.id)}
                                            className={cn('hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                selectedOrderId === o.id && 'bg-blue-500/5 border-l-2 border-blue-500')}>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-blue-400 font-mono">{o.order_number}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-white">{o.customer_name}</p>
                                                <p className="text-xs text-dark-500">{o.customer_phone}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-dark-500">{formatDate(o.order_date)}</td>
                                            <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                                            <td className="px-4 py-3"><StatusBadge status={o.payment_status} /></td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-mono font-semibold text-white">{formatCurrency(o.total_amount)}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {o.status === 'draft' && (
                                                    <button onClick={(e) => { e.stopPropagation(); setDeletingOrder(o); setIsDeleteModalOpen(true) }}
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
                            <p className="text-xs text-dark-500">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}</p>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)} icon={<ChevronLeft size={16} />}>Prev</Button>
                                <span className="text-sm text-dark-500">{page}/{totalPages}</span>
                                <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={16} /></Button>
                            </div>
                        </div>
                    )}
                </div>

                {selectedOrderId && (
                    <div className="w-1/2 sticky top-20">
                        <OrderDetail orderId={selectedOrderId}
                            onClose={() => setSelectedOrderId(null)}
                            onRefresh={fetchData} />
                    </div>
                )}
            </div>

            {/* Create Wizard */}
            <CreateOrderWizard isOpen={showWizard} onClose={() => setShowWizard(false)} onCreated={fetchData} />

            {/* Delete Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setDeletingOrder(null) }}
                title="Delete Order" size="sm"
                footer={<>
                    <Button variant="secondary" onClick={() => { setIsDeleteModalOpen(false); setDeletingOrder(null) }}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
                </>}>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                    <AlertCircle size={20} className="text-red-400 mt-0.5" />
                    <p className="text-sm text-white">Delete order <strong>{deletingOrder?.order_number}</strong>? This will delete all items too.</p>
                </div>
            </Modal>
        </div>
    )
}