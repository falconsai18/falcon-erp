import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { createInvoiceFromSO } from '@/services/invoiceService'
import { calculateCreditScore, applyRecommendedLimit, type CreditScoreResult } from '@/services/creditScoringService'

// Sales Intelligence Components
import { CreditLimitBar } from '@/features/sales/components/CreditLimitBar'
import { CustomerInsightPanel } from '@/features/sales/components/CustomerInsightPanel'
import { SalesTrendChart } from '@/features/sales/components/SalesTrendChart'
import { RepeatOrderButton } from '@/features/sales/components/RepeatOrderButton'

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
    const [creatingInvoice, setCreatingInvoice] = useState(false)

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

    const handleCreateInvoice = async () => {
        if (!order) return
        try {
            setCreatingInvoice(true)
            const SELLER_STATE = import.meta.env.VITE_SELLER_STATE || 'Maharashtra'
            const invoice = await createInvoiceFromSO(order.id, SELLER_STATE)
            toast.success(`Invoice ${invoice.invoice_number} created!`)
            loadOrder()
            onRefresh()
        } catch (err: any) {
            toast.error('Failed to create invoice: ' + err.message)
        } finally {
            setCreatingInvoice(false)
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
                <div className="h-6 bg-gray-200 dark:bg-dark-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 dark:bg-dark-200 rounded w-1/2" />
                <div className="h-32 bg-gray-200 dark:bg-dark-200 rounded" />
            </div></div>
        )
    }

    if (!order) return null

    const nextStatus = getNextStatus()

    return (
        <div className="glass-card h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-300/50">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-gray-900 dark:text-white">{order.order_number}</h2>
                        <StatusBadge status={order.status} />
                        <StatusBadge status={order.payment_status} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-dark-500 mt-1">{order.customer_name} • {formatDate(order.order_date)}</p>
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
                    {order.status !== 'draft' && order.status !== 'cancelled' && (
                        <Button size="sm" variant="secondary" onClick={handleCreateInvoice} isLoading={creatingInvoice}
                            icon={<FileText size={14} />}>
                            Create Invoice
                        </Button>
                    )}
                    <button onClick={onClose} className="p-2 rounded-lg text-gray-500 dark:text-dark-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-200">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Progress */}
                <div className="bg-gray-100/20 dark:bg-dark-200/20 rounded-xl p-4">
                    <p className="text-xs text-gray-500 dark:text-dark-500 mb-3 uppercase tracking-wider">Order Progress</p>
                    <StatusProgress current={order.status} />
                    <div className="flex justify-between mt-2">
                        {STATUS_STEPS.map(s => (
                            <span key={s} className="text-[9px] text-gray-400 dark:text-dark-600 capitalize">{s}</span>
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
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Order Items</p>
                    <div className="space-y-2">
                        {order.items?.map((item, idx) => (
                            <div key={item.id || idx} className="bg-gray-100/20 dark:bg-dark-200/20 rounded-lg p-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                                        <p className="text-xs text-gray-500 dark:text-dark-500">{item.product_sku}</p>
                                    </div>
                                    <p className="text-sm font-semibold text-blue-400">{formatCurrency(item.total_amount)}</p>
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-dark-500">
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
                <div className="bg-gray-100/20 dark:bg-dark-200/20 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-dark-500">Subtotal</span>
                        <span className="text-gray-900 dark:text-white">{formatCurrency(order.subtotal)}</span>
                    </div>
                    {order.discount_amount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-dark-500">Discount</span>
                            <span className="text-amber-400">-{formatCurrency(order.discount_amount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-dark-500">Tax (GST)</span>
                        <span className="text-gray-900 dark:text-white">{formatCurrency(order.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t border-gray-200 dark:border-dark-300/30 pt-2">
                        <span className="text-gray-900 dark:text-white">Total</span>
                        <span className="text-blue-400">{formatCurrency(order.total_amount)}</span>
                    </div>
                </div>

                {order.notes && (
                    <div className="space-y-1">
                        <p className="text-[10px] text-gray-400 dark:text-dark-600 uppercase">Notes</p>
                        <p className="text-sm text-gray-500 dark:text-dark-500 bg-gray-100/20 dark:bg-dark-200/20 p-3 rounded-lg">{order.notes}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ============ CREATE ORDER WIZARD ============
function CreateOrderWizard({ isOpen, onClose, onCreated, customers }: {
    isOpen: boolean; onClose: () => void; onCreated: () => void; customers: { value: string; label: string; phone?: string }[]
}) {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState<SalesOrderFormData>(EMPTY_SO_FORM)
    // customers passed as prop
    const [products, setProducts] = useState<any[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [productSearch, setProductSearch] = useState('')

    // Credit Alert State
    const [showCreditAlert, setShowCreditAlert] = useState(false)
    const [creditScoreData, setCreditScoreData] = useState<CreditScoreResult | null>(null)
    const [upgradingLimit, setUpgradingLimit] = useState(false)

    // Check customer credit limit
    const checkCustomerCredit = async (customerId: string, orderAmount: number) => {
        const { data: customer } = await supabase
            .from('customers')
            .select('name, credit_limit, status')
            .eq('id', customerId)
            .maybeSingle()

        if (!customer) return true // no customer = allow

        // Blocked customer
        if (customer.status === 'blocked') {
            toast.error(`${customer.name} is blocked!`)
            return false
        }

        const creditLimit = Number(customer.credit_limit) || 0

        // No credit limit set = allow everything
        if (creditLimit === 0) return true

        // Get actual outstanding from invoices
        const { data: invoices } = await supabase
            .from('invoices')
            .select('balance_amount')
            .eq('customer_id', customerId)
            .in('status', ['unpaid', 'partial', 'overdue'])

        const outstanding = invoices?.reduce(
            (sum, inv) => sum + (Number(inv.balance_amount) || 0), 0
        ) ?? 0

        const newTotal = outstanding + Number(orderAmount)

        if (newTotal > creditLimit) {
            toast.error(
                `Credit limit exceeded! ${customer.name} has 
       ₹${outstanding} outstanding. Limit: ₹${creditLimit}`
            )
            return false
        }

        // Warning at 80%
        if (newTotal >= creditLimit * 0.8) {
            toast.warning(
                `Credit utilization high: ₹${newTotal} of ₹${creditLimit}`
            )
        }

        return true
    }

    async function checkDuplicateSO(customerId: string, totalAmount: number): Promise<boolean> {
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const { data: existing } = await supabase
            .from('sales_orders')
            .select('id, order_number, total_amount, order_date')
            .eq('customer_id', customerId)
            .gte('order_date', yesterday)
            .neq('status', 'cancelled')
            .limit(5)

        if (!existing || existing.length === 0) return false

        // Check if similar amount exists (within 5% tolerance)
        const duplicate = existing.find(so => {
            const diff = Math.abs(so.total_amount - totalAmount) / totalAmount
            return diff < 0.05 // Within 5% = potential duplicate
        })

        return !!duplicate
    }

    useEffect(() => {
        if (isOpen) {
            setStep(1)
            setFormData({
                ...EMPTY_SO_FORM,
                order_date: new Date().toISOString().split('T')[0]
            })
            // loadCustomers() handled by parent
            loadProducts()
        }
    }, [isOpen])

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

            // Credit Check
            if (formData.customer_id && totals.total_amount > 0) {
                const allowed = await checkCustomerCredit(formData.customer_id, totals.total_amount)
                if (!allowed) {
                    // Fetch Credit Score for Smart Alert
                    try {
                        const score = await calculateCreditScore(formData.customer_id)
                        setCreditScoreData(score)
                        setShowCreditAlert(true)
                    } catch (err) {
                        toast.error('Credit limit exceeded and failed to fetch score.')
                    }
                    setIsSaving(false)
                    return // BLOCK the order until resolved
                }
            }

            // Duplicate Check
            const isDuplicate = await checkDuplicateSO(
                formData.customer_id,
                totals.total_amount || 0
            )

            if (isDuplicate) {
                const confirmed = window.confirm(
                    '⚠️ A similar order for this customer was created recently. Are you sure you want to create another one?'
                )
                if (!confirmed) {
                    setIsSaving(false)
                    return
                }
            }

            const newOrder = await createSalesOrder(formData, user?.id)

            toast.success(`SO ${newOrder.order_number} created!`, {
                action: {
                    label: 'Create Invoice →',
                    onClick: () => navigate('/invoices?so_id=' + newOrder.id)
                },
                duration: 8000,
            })

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
        <>
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
                        <div className="flex items-start gap-3">
                            <div className="flex-1">
                                <Select label="Customer *" value={formData.customer_id}
                                    onChange={(e) => setFormData(p => ({ ...p, customer_id: e.target.value }))}
                                    options={customers} placeholder="Select customer" />
                            </div>
                            {formData.customer_id && (
                                <div className="pt-6">
                                    <RepeatOrderButton 
                                        customerId={formData.customer_id}
                                        onRepeatOrder={(items) => {
                                            setFormData(p => ({ ...p, items }))
                                            setStep(2)
                                            toast.success('Previous order items loaded')
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        
                        {/* Credit Status */}
                        {formData.customer_id && (
                            <CreditLimitBar 
                                customerId={formData.customer_id} 
                                orderAmount={formData.items.length > 0 ? totals.total_amount : 0}
                            />
                        )}
                        
                        {/* Customer Insights */}
                        {formData.customer_id && (
                            <CustomerInsightPanel customerId={formData.customer_id} />
                        )}
                        
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

            {/* Smart Credit Alert Modal */}
            <Modal
                isOpen={showCreditAlert}
                onClose={() => setShowCreditAlert(false)}
                title="⚠️ Credit Limit Alert"
                size="md"
            >
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">
                        This order exceeds the customer's credit limit.
                    </p>

                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-4">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600 dark:text-gray-400">Current Order Value</span>
                            <span className="font-mono font-bold text-red-600 dark:text-red-400">
                                {formatCurrency(totals.total_amount)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Credit Limit</span>
                            <span className="font-mono font-bold text-gray-900 dark:text-white">
                                {formatCurrency(creditScoreData?.currentLimit || 0)}
                            </span>
                        </div>
                    </div>

                    {creditScoreData && (
                        <div className="bg-gray-50 dark:bg-dark-200/50 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">Credit Intelligence</span>
                                <div className="flex items-center gap-2">
                                    <span className={cn("text-lg font-bold",
                                        creditScoreData.totalScore >= 80 ? 'text-emerald-400' :
                                            creditScoreData.totalScore >= 50 ? 'text-amber-400' : 'text-red-400'
                                    )}>{creditScoreData.totalScore}/100</span>
                                    {creditScoreData.totalScore >= 80 ? <Badge variant="success">Low Risk</Badge> :
                                        creditScoreData.totalScore >= 50 ? <Badge variant="warning">Med Risk</Badge> :
                                            <Badge variant="danger">High Risk</Badge>}
                                </div>
                            </div>

                            <div className="h-2 bg-gray-200 dark:bg-dark-300 rounded-full overflow-hidden">
                                <div className={cn("h-full",
                                    creditScoreData.totalScore >= 80 ? 'bg-emerald-500' :
                                        creditScoreData.totalScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                )} style={{ width: `${creditScoreData.totalScore}%` }} />
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <span className="text-sm text-gray-500 dark:text-dark-400">Recommended Limit</span>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(creditScoreData.recommendedLimit)}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setShowCreditAlert(false)}>
                            Cancel
                        </Button>
                        {creditScoreData && creditScoreData.recommendedLimit > creditScoreData.currentLimit && (
                            <Button
                                onClick={async () => {
                                    if (!creditScoreData) return
                                    setUpgradingLimit(true)
                                    try {
                                        await applyRecommendedLimit(creditScoreData.customerId, creditScoreData.recommendedLimit)
                                        toast.success('Limit Upgraded! Proceeding...')
                                        setShowCreditAlert(false)
                                        // Proceed to create
                                        await createSalesOrder(formData, user?.id)
                                        toast.success('Sales Order created!')
                                        onCreated()
                                        onClose()
                                    } catch (err: any) {
                                        toast.error(err.message)
                                    } finally {
                                        setUpgradingLimit(false)
                                    }
                                }}
                                isLoading={upgradingLimit}
                            >
                                Upgrade Limit & Continue
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>
        </>
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

    // Filters
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [filterCustomer, setFilterCustomer] = useState('')
    const [customers, setCustomers] = useState<{ value: string; label: string; phone?: string }[]>([])

    // Bulk Actions
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isBulkUpdating, setIsBulkUpdating] = useState(false)

    useEffect(() => {
        loadCustomers()
    }, [])

    const loadCustomers = async () => {
        const { data } = await supabase.from('customers').select('id, name, phone').eq('status', 'active').order('name')
        setCustomers((data || []).map((c: any) => ({ value: c.id, label: c.name, phone: c.phone })))
    }

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getSalesOrders({ page, pageSize }, { status: statusFilter, search, dateFrom, dateTo, customerId: filterCustomer }),
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
    }, [page, statusFilter, search, dateFrom, dateTo, filterCustomer])

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

    // Bulk Actions
    const toggleSelectAll = () => {
        if (selectedIds.size === orders.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(orders.map(o => o.id)))
        }
    }

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedIds(newSet)
    }

    const handleBulkUpdate = async (status: string) => {
        if (selectedIds.size === 0) return
        if (!window.confirm(`Update ${selectedIds.size} orders to ${status}?`)) return

        try {
            setIsBulkUpdating(true)
            await Promise.all(Array.from(selectedIds).map(id => updateSalesOrderStatus(id, status)))
            toast.success(`Updated ${selectedIds.size} orders!`)
            setSelectedIds(new Set())
            fetchData()
        } catch (err: any) {
            toast.error('Bulk update failed: ' + err.message)
        } finally {
            setIsBulkUpdating(false)
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Sales Orders"
                description={`${stats.total} orders • Value: ${formatCurrency(stats.totalValue)}`}
                actions={<div className="flex items-center gap-3">
                    <Button variant="secondary" icon={<Download size={16} />} size="sm" onClick={async () => {
                        try {
                            const { exportSalesOrders } = await import('@/services/exportService')
                            await exportSalesOrders()
                            toast.success('Sales orders exported!')
                        } catch (err: any) { toast.error(err.message) }
                    }}>Export CSV</Button>
                    <Button icon={<Plus size={16} />} onClick={() => setShowWizard(true)}>New Order</Button>
                </div>} />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                    { label: 'Total', value: stats.total, color: 'text-blue-400' },
                    { label: 'Draft', value: stats.draft, color: 'text-gray-500 dark:text-dark-500' },
                    { label: 'Confirmed', value: stats.confirmed, color: 'text-blue-400' },
                    { label: 'Processing', value: stats.processing, color: 'text-purple-400' },
                    { label: 'Delivered', value: stats.delivered, color: 'text-emerald-400' },
                    { label: 'Unpaid', value: stats.unpaid, color: 'text-red-400' },
                    { label: 'Value', value: formatCurrency(stats.totalValue), color: 'text-blue-400' },
                ].map(k => (
                    <div key={k.label} className="glass-card p-3">
                        <p className="text-[10px] text-gray-500 dark:text-dark-500 uppercase">{k.label}</p>
                        <p className={cn('text-lg font-bold mt-0.5', k.color)}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Sales Intelligence - Collapsible Chart */}
            <SalesTrendChart />

            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 max-w-md">
                    <Input placeholder="Search by order number..." value={search}
                        onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
                </div>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
                <Select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)}
                    options={[{ value: '', label: 'All Customers' }, ...customers]} className="w-48" />
                <div className="flex items-center gap-2 flex-wrap">
                    {['all', ...STATUS_STEPS, 'cancelled'].map(s => (
                        <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                statusFilter === s ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 dark:text-dark-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-200 border border-transparent')}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-center justify-between">
                    <p className="text-sm text-blue-400 font-medium">{selectedIds.size} orders selected</p>
                    <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleBulkUpdate('confirmed')} isLoading={isBulkUpdating}>Confirm Selected</Button>
                        <Button size="sm" variant="danger" onClick={() => handleBulkUpdate('cancelled')} isLoading={isBulkUpdating}>Cancel Selected</Button>
                    </div>
                </div>
            )}

            {/* Split View */}
            <div className={cn('flex gap-6', selectedOrderId ? 'items-start' : '')}>
                <div className={cn('transition-all duration-300', selectedOrderId ? 'w-1/2' : 'w-full')}>
                    {isLoading ? (
                        <div className="glass-card p-8"><div className="animate-pulse space-y-3">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-dark-200 rounded-lg" />)}
                        </div></div>
                    ) : orders.length === 0 ? (
                        <EmptyState icon={<ShoppingCart size={48} />} title="No sales orders"
                            description="Create your first sales order" actionLabel="New Order" onAction={() => setShowWizard(true)} />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead><tr className="border-b border-gray-200 dark:border-dark-300/50">
                                    <th className="px-4 py-3 w-8">
                                        <input type="checkbox"
                                            checked={orders.length > 0 && selectedIds.size === orders.length}
                                            onChange={toggleSelectAll}
                                            className="rounded border-gray-300 dark:border-dark-300 bg-transparent" />
                                    </th>
                                    {['Order', 'Customer', 'Date', 'Status', 'Payment', 'Total', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-dark-300/30">
                                    {orders.map(o => (
                                        <tr key={o.id} onClick={() => setSelectedOrderId(o.id)}
                                            className={cn('hover:bg-gray-100/30 dark:hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                selectedOrderId === o.id && 'bg-blue-500/5 border-l-2 border-blue-500',
                                                selectedIds.has(o.id) && 'bg-blue-500/5')}>
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox"
                                                    checked={selectedIds.has(o.id)}
                                                    onChange={() => toggleSelect(o.id)}
                                                    className="rounded border-gray-300 dark:border-dark-300 bg-transparent" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-blue-400 font-mono">{o.order_number}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-gray-900 dark:text-white">{o.customer_name}</p>
                                                <p className="text-xs text-gray-500 dark:text-dark-500">{o.customer_phone}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-dark-500">{formatDate(o.order_date)}</td>
                                            <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                                            <td className="px-4 py-3"><StatusBadge status={o.payment_status} /></td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{formatCurrency(o.total_amount)}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {o.status === 'draft' && (
                                                    <button title="Delete" onClick={(e) => { e.stopPropagation(); setDeletingOrder(o); setIsDeleteModalOpen(true) }}
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
            <CreateOrderWizard isOpen={showWizard} onClose={() => setShowWizard(false)} onCreated={fetchData} customers={customers} />

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