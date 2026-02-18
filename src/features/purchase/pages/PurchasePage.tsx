import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    Plus, Search, Download, Trash2, X, Save, ChevronLeft, ChevronRight,
    AlertCircle, Truck, Package, IndianRupee, Calendar, Check, ArrowRight,
    Minus, Send, ClipboardCheck,
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
    getPurchaseOrders, getPurchaseOrderById, createPurchaseOrder, updatePOStatus,
    deletePurchaseOrder, getPOStats, calculatePOItem, calculatePOTotals,
    type PurchaseOrder, type PurchaseOrderItem, type POFormData, EMPTY_PO_FORM,
} from '@/services/purchaseService'
import { createGRNFromPO } from '@/services/grnService'
import { printPurchaseOrderPDF } from '@/utils/pdfExport'

const PO_STEPS = ['draft', 'sent', 'confirmed', 'received']

// ============ STATUS PROGRESS ============
function POProgress({ current }: { current: string }) {
    const currentIndex = PO_STEPS.indexOf(current)
    if (current === 'cancelled') {
        return <div className="flex items-center gap-2"><X size={16} className="text-red-400" /><span className="text-sm text-red-400">Cancelled</span></div>
    }
    return (
        <div className="flex items-center gap-1 w-full">
            {PO_STEPS.map((step, index) => (
                <div key={step} className="flex items-center flex-1">
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                        index <= currentIndex ? 'bg-indigo-500 text-white' : 'bg-dark-300 text-dark-500',
                        index === currentIndex && 'ring-2 ring-indigo-500/30')}>
                        {index <= currentIndex ? <Check size={12} /> : index + 1}
                    </div>
                    {index < PO_STEPS.length - 1 && (
                        <div className={cn('flex-1 h-0.5 mx-1', index < currentIndex ? 'bg-indigo-500' : 'bg-dark-300')} />
                    )}
                </div>
            ))}
        </div>
    )
}

// ============ DETAIL PANEL ============
function PODetail({ poId, onClose, onRefresh }: {
    poId: string; onClose: () => void; onRefresh: () => void
}) {
    const [po, setPO] = useState<PurchaseOrder | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [creatingGRN, setCreatingGRN] = useState(false)

    useEffect(() => { loadPO() }, [poId])

    const loadPO = async () => {
        try { setLoading(true); setPO(await getPurchaseOrderById(poId)) }
        catch (err: any) { toast.error(err.message) }
        finally { setLoading(false) }
    }

    const handleStatus = async (status: string) => {
        try { setUpdating(true); await updatePOStatus(poId, status); toast.success(`PO ${status}!`); loadPO(); onRefresh() }
        catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handleCreateGRN = async () => {
        try {
            setCreatingGRN(true)
            const grn = await createGRNFromPO(poId)
            toast.success(`GRN ${grn.grn_number} created!`)
            loadPO(); onRefresh()
        } catch (err: any) {
            toast.error('Failed: ' + err.message)
        } finally {
            setCreatingGRN(false)
        }
    }

    const getNextStatus = (): string | null => {
        if (!po) return null
        const idx = PO_STEPS.indexOf(po.status)
        return idx < PO_STEPS.length - 1 ? PO_STEPS[idx + 1] : null
    }

    if (loading) return <div className="glass-card p-8"><div className="animate-pulse space-y-4">
        <div className="h-6 bg-dark-200 rounded w-1/3" /><div className="h-32 bg-dark-200 rounded" /></div></div>

    if (!po) return null
    const nextStatus = getNextStatus()
    const nextLabel = nextStatus === 'sent' ? 'Send to Supplier' : nextStatus === 'confirmed' ? 'Mark Confirmed' : nextStatus === 'received' ? 'Mark Received' : null
    const nextIcon = nextStatus === 'sent' ? <Send size={14} /> : nextStatus === 'confirmed' ? <ClipboardCheck size={14} /> : <Check size={14} />

    return (
        <div className="glass-card h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-dark-300/50">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-white">{po.po_number}</h2>
                        <StatusBadge status={po.status} />
                    </div>
                    <p className="text-xs text-dark-500 mt-1">{po.supplier_name} • {formatDate(po.order_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                    {nextStatus && po.status !== 'cancelled' && (
                        <Button size="sm" onClick={() => handleStatus(nextStatus)} isLoading={updating} icon={nextIcon}>
                            {nextLabel}
                        </Button>
                    )}
                    {po.status === 'draft' && (
                        <Button size="sm" variant="danger" onClick={() => handleStatus('cancelled')} isLoading={updating}>Cancel</Button>
                    )}
                    {(po.status === 'confirmed' || po.status === 'partial') && (
                        <Button size="sm" variant="secondary" onClick={handleCreateGRN} isLoading={creatingGRN}
                            icon={<ClipboardCheck size={14} />}>
                            Create GRN
                        </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => printPurchaseOrderPDF(po.id)} icon={<Download size={16} />}>
                        Print
                    </Button>
                    <button title="Close" onClick={onClose} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200"><X size={16} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="bg-dark-200/20 rounded-xl p-4">
                    <p className="text-xs text-dark-500 mb-3 uppercase tracking-wider">Order Progress</p>
                    <POProgress current={po.status} />
                    <div className="flex justify-between mt-2">
                        {PO_STEPS.map(s => <span key={s} className="text-[9px] text-dark-600 capitalize">{s}</span>)}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Supplier', value: po.supplier_name, icon: Truck },
                        { label: 'Phone', value: po.supplier_phone || '-', icon: Truck },
                        { label: 'Order Date', value: formatDate(po.order_date), icon: Calendar },
                        { label: 'Expected Date', value: po.expected_date ? formatDate(po.expected_date) : '-', icon: Calendar },
                        { label: 'Items', value: `${po.items?.length || 0} materials`, icon: Package },
                    ].map(item => (
                        <div key={item.label} className="space-y-1">
                            <div className="flex items-center gap-1.5 text-dark-600"><item.icon size={12} /><span className="text-[10px] uppercase tracking-wider">{item.label}</span></div>
                            <p className="text-sm text-white">{item.value}</p>
                        </div>
                    ))}
                </div>

                <div>
                    <p className="text-sm font-semibold text-white mb-3">Order Items</p>
                    <div className="space-y-2">
                        {po.items?.map((item, idx) => (
                            <div key={item.id || idx} className="bg-dark-200/20 rounded-lg p-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-white">{item.material_name}</p>
                                        <p className="text-xs text-dark-500">{item.material_code}</p>
                                    </div>
                                    <p className="text-sm font-semibold text-indigo-400">{formatCurrency(item.total_amount)}</p>
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-xs text-dark-500">
                                    <span>Qty: {item.quantity}</span>
                                    <span>Rate: {formatCurrency(item.unit_price)}</span>
                                    <span>GST: {item.tax_rate}%</span>
                                    {item.received_quantity > 0 && (
                                        <span className="text-emerald-400">Received: {item.received_quantity}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-dark-200/20 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-dark-500">Subtotal</span><span className="text-white">{formatCurrency(po.subtotal)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-dark-500">Tax (GST)</span><span className="text-white">{formatCurrency(po.tax_amount)}</span></div>
                    <div className="flex justify-between text-base font-bold border-t border-dark-300/30 pt-2">
                        <span className="text-white">Total</span><span className="text-indigo-400">{formatCurrency(po.total_amount)}</span>
                    </div>
                </div>

                {po.notes && (
                    <div className="space-y-1">
                        <p className="text-[10px] text-dark-600 uppercase">Notes</p>
                        <p className="text-sm text-dark-500 bg-dark-200/20 p-3 rounded-lg">{po.notes}</p>
                    </div>
                )}
            </div>
        </div >
    )
}

// ============ CREATE PO WIZARD ============
interface CreatePOWizardProps {
    isOpen: boolean
    onClose: () => void
    onCreated: () => void
    prefillMaterialId?: string | null
    prefillQuantity?: string | null
    prefillMaterialName?: string | null
    prefillCost?: string | null
    prefillUnit?: string | null
}

function CreatePOWizard({ 
    isOpen, 
    onClose, 
    onCreated,
    prefillMaterialId,
    prefillQuantity,
    prefillMaterialName,
    prefillCost,
    prefillUnit,
}: CreatePOWizardProps) {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState<POFormData>(EMPTY_PO_FORM)
    const [suppliers, setSuppliers] = useState<{ value: string; label: string }[]>([])
    const [materials, setMaterials] = useState<any[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [materialSearch, setMaterialSearch] = useState('')
    const [hasPrefilled, setHasPrefilled] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setStep(1)
            const today = new Date().toISOString().split('T')[0]
            const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            setFormData({ ...EMPTY_PO_FORM, order_date: today, expected_date: nextWeek })
            loadData()
            setHasPrefilled(false)
        }
    }, [isOpen])

    // Handle prefill data after materials are loaded
    useEffect(() => {
        if (isOpen && materials.length > 0 && prefillMaterialId && !hasPrefilled) {
            const material = materials.find(m => m.id === prefillMaterialId)
            if (material) {
                const quantity = Number(prefillQuantity) || 1
                const unitPrice = Number(prefillCost) || material.unit_cost || 0
                
                const newItem = calculatePOItem({
                    raw_material_id: material.id,
                    product_id: null,
                    description: material.name,
                    quantity: quantity,
                    unit_price: unitPrice,
                    tax_rate: 12,
                    tax_amount: 0,
                    total_amount: 0,
                    received_quantity: 0,
                    material_name: material.name,
                    material_code: material.code,
                })
                
                setFormData(p => ({ 
                    ...p, 
                    items: [newItem]
                }))
                
                toast.success('Pre-filled from Reorder suggestion ✓', {
                    description: `${material.name} × ${quantity} ${prefillUnit || material.unit_of_measure}`,
                })
                
                setHasPrefilled(true)
                // Auto-advance to step 2 if we have a prefill
                setStep(2)
            }
        }
    }, [isOpen, materials, prefillMaterialId, prefillQuantity, prefillMaterialName, prefillCost, prefillUnit, hasPrefilled])

    const loadData = async () => {
        const [{ data: sup }, { data: mat }] = await Promise.all([
            supabase.from('suppliers').select('id, name').eq('status', 'active').order('name'),
            supabase.from('raw_materials').select('id, name, code, unit_cost, unit_of_measure').eq('status', 'active').order('name'),
        ])
        setSuppliers((sup || []).map((s: any) => ({ value: s.id, label: s.name })))
        setMaterials(mat || [])
    }

    const addMaterial = (mat: any) => {
        if (formData.items.find(i => i.raw_material_id === mat.id)) { toast.error('Already added'); return }
        const newItem = calculatePOItem({
            raw_material_id: mat.id, product_id: null,
            description: mat.name, quantity: 1, unit_price: mat.unit_cost || 0,
            tax_rate: 12, tax_amount: 0, total_amount: 0, received_quantity: 0,
            material_name: mat.name, material_code: mat.code,
        })
        setFormData(p => ({ ...p, items: [...p.items, newItem] }))
    }

    const updateItem = (index: number, field: string, value: number) => {
        setFormData(p => {
            const items = [...p.items]
            items[index] = calculatePOItem({ ...items[index], [field]: value })
            return { ...p, items }
        })
    }

    const removeItem = (index: number) => setFormData(p => ({ ...p, items: p.items.filter((_, i) => i !== index) }))

    async function checkDuplicatePO(supplierId: string, totalAmount: number): Promise<boolean> {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const { data: existing } = await supabase
            .from('purchase_orders')
            .select('id, po_number, total_amount, order_date')
            .eq('supplier_id', supplierId)
            .gte('order_date', yesterday)
            .neq('status', 'cancelled')
            .limit(5)

        if (!existing || existing.length === 0) return false

        const duplicate = existing.find(po => {
            const diff = Math.abs(po.total_amount - totalAmount) / (totalAmount || 1)
            return diff < 0.05
        })

        return !!duplicate
    }

    const handleCreate = async () => {
        if (!formData.supplier_id) { toast.error('Select supplier'); setStep(1); return }
        if (formData.items.length === 0) { toast.error('Add materials'); setStep(2); return }
        try {
            setIsSaving(true)

            const isDuplicate = await checkDuplicatePO(
                formData.supplier_id,
                totals.total_amount || 0
            )

            if (isDuplicate) {
                const confirmed = window.confirm(
                    '⚠️ A similar PO for this supplier was created recently. Are you sure you want to create another one?'
                )
                if (!confirmed) return
            }

            const newPO = await createPurchaseOrder(formData, user?.id)

            toast.success(`PO ${newPO.po_number} created!`, {
                action: {
                    label: 'Create GRN →',
                    onClick: () => navigate('/goods-receipt?po_id=' + newPO.id)
                },
                duration: 8000,
            })
            onCreated(); onClose()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const totals = calculatePOTotals(formData.items)
    const filtered = materials.filter(m =>
        m.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
        (m.code || '').toLowerCase().includes(materialSearch.toLowerCase())
    )

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Purchase Order" size="xl"
            footer={
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                                step === s ? 'bg-indigo-500 text-white' : step > s ? 'bg-indigo-500/20 text-indigo-400' : 'bg-dark-300 text-dark-500')}>
                                {step > s ? <Check size={14} /> : s}
                            </div>
                        ))}
                        <span className="text-xs text-dark-500 ml-2">
                            {step === 1 ? 'Supplier & Details' : step === 2 ? 'Add Materials' : 'Review & Confirm'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {step > 1 && <Button variant="secondary" onClick={() => setStep(s => s - 1)}>Back</Button>}
                        {step < 3 && <Button onClick={() => {
                            if (step === 1 && !formData.supplier_id) { toast.error('Select supplier'); return }
                            if (step === 2 && formData.items.length === 0) { toast.error('Add materials'); return }
                            setStep(s => s + 1)
                        }}>Next</Button>}
                        {step === 3 && <Button onClick={handleCreate} isLoading={isSaving} icon={<Save size={16} />}>Create PO</Button>}
                    </div>
                </div>
            }>

            {step === 1 && (
                <div className="space-y-4">
                    <Select label="Supplier *" value={formData.supplier_id}
                        onChange={(e) => setFormData(p => ({ ...p, supplier_id: e.target.value }))}
                        options={suppliers} placeholder="Select supplier" />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Order Date" type="date" value={formData.order_date}
                            onChange={(e) => setFormData(p => ({ ...p, order_date: e.target.value }))} />
                        <Input label="Expected Delivery" type="date" value={formData.expected_date}
                            onChange={(e) => setFormData(p => ({ ...p, expected_date: e.target.value }))} />
                    </div>
                    <Textarea label="Notes" value={formData.notes}
                        onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Internal notes..." />
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <Input placeholder="Search raw materials..." value={materialSearch}
                        onChange={(e) => setMaterialSearch(e.target.value)} icon={<Search size={16} />} />

                    <div className="max-h-48 overflow-y-auto space-y-1 border border-dark-300/30 rounded-lg p-2">
                        {filtered.slice(0, 20).map(m => (
                            <button key={m.id} onClick={() => addMaterial(m)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-dark-200/50 transition-colors text-left">
                                <div>
                                    <p className="text-sm text-white">{m.name}</p>
                                    <p className="text-xs text-dark-500">{m.code || '-'} • {m.unit_of_measure}</p>
                                </div>
                                <p className="text-sm font-mono text-indigo-400">{formatCurrency(m.unit_cost)}</p>
                            </button>
                        ))}
                        {filtered.length === 0 && <p className="text-sm text-dark-500 text-center py-4">No materials found</p>}
                    </div>

                    {formData.items.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-white">Added Items ({formData.items.length})</p>
                            {formData.items.map((item, idx) => (
                                <div key={idx} className="bg-dark-200/20 rounded-lg p-3">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="text-sm font-medium text-white">{item.material_name}</p>
                                            <p className="text-xs text-dark-500">{item.material_code}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-indigo-400">{formatCurrency(item.total_amount)}</p>
                                            <button onClick={() => removeItem(idx)} className="p-1 rounded text-dark-500 hover:text-red-400"><Minus size={14} /></button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input label="Qty" type="number" value={item.quantity}
                                            onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} />
                                        <Input label="Rate (₹)" type="number" value={item.unit_price}
                                            onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))} />
                                        <Input label="GST %" type="number" value={item.tax_rate}
                                            onChange={(e) => updateItem(idx, 'tax_rate', Number(e.target.value))} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {formData.items.length > 0 && (
                        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3 flex justify-between items-center">
                            <span className="text-sm text-dark-500">Running Total</span>
                            <span className="text-lg font-bold text-indigo-400">{formatCurrency(totals.total_amount)}</span>
                        </div>
                    )}
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><p className="text-xs text-dark-600">Supplier</p>
                            <p className="text-sm text-white font-medium">{suppliers.find(s => s.value === formData.supplier_id)?.label}</p></div>
                        <div className="space-y-1"><p className="text-xs text-dark-600">Order Date</p><p className="text-sm text-white">{formData.order_date}</p></div>
                        <div className="space-y-1"><p className="text-xs text-dark-600">Expected</p><p className="text-sm text-white">{formData.expected_date || 'Not set'}</p></div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-white">Items ({formData.items.length})</p>
                        {formData.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-dark-200/20 rounded-lg p-3">
                                <div>
                                    <p className="text-sm text-white">{item.material_name}</p>
                                    <p className="text-xs text-dark-500">{item.quantity} × {formatCurrency(item.unit_price)} + GST {item.tax_rate}%</p>
                                </div>
                                <p className="text-sm font-semibold text-indigo-400">{formatCurrency(item.total_amount)}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-dark-500">Subtotal</span><span className="text-white">{formatCurrency(totals.subtotal)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-dark-500">GST</span><span className="text-white">{formatCurrency(totals.tax_amount)}</span></div>
                        <div className="flex justify-between text-lg font-bold border-t border-dark-300/30 pt-2">
                            <span className="text-white">Total</span><span className="text-indigo-400">{formatCurrency(totals.total_amount)}</span>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    )
}

// ============ MAIN PAGE ============
export function PurchasePage() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 25
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    
    // Read prefill params from URL
    const prefillMaterialId = searchParams.get('material_id')
    const prefillQuantity = searchParams.get('quantity')
    const prefillMaterialName = searchParams.get('material_name')
    const prefillCost = searchParams.get('cost')
    const prefillUnit = searchParams.get('unit')

    // CHANGE 3 & 4: Filters
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [filterSupplier, setFilterSupplier] = useState('')
    const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])

    // CHANGE 5: Bulk Actions
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isBulkUpdating, setIsBulkUpdating] = useState(false)

    const [showWizard, setShowWizard] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | null>(null)
    const [selectedPOId, setSelectedPOId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [stats, setStats] = useState({ total: 0, draft: 0, sent: 0, confirmed: 0, received: 0, totalValue: 0 })

    // Auto-open wizard if prefill params exist
    useEffect(() => {
        if (prefillMaterialId && prefillQuantity) {
            setShowWizard(true)
        }
    }, [prefillMaterialId, prefillQuantity])

    // Load suppliers for filter
    useEffect(() => {
        supabase.from('suppliers').select('id, name').eq('status', 'active').order('name')
            .then(({ data }) => setSuppliers(data || []))
    }, [])

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getPurchaseOrders({ page, pageSize }, { status: statusFilter, search, dateFrom, dateTo, supplierId: filterSupplier }),
                getPOStats(),
            ])
            setOrders(result.data)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
            setSelectedIds([]) // Clear selection on refresh
        } catch (err: any) { toast.error(err.message) }
        finally { setIsLoading(false) }
    }, [page, statusFilter, search, dateFrom, dateTo, filterSupplier])

    useEffect(() => { fetchData() }, [fetchData])
    useEffect(() => { const t = setTimeout(() => { setPage(1); fetchData() }, 300); return () => clearTimeout(t) }, [search])

    const handleBulkUpdate = async (status: string) => {
        if (!confirm(`Are you sure you want to mark ${selectedIds.length} orders as ${status}?`)) return
        try {
            setIsBulkUpdating(true)
            await Promise.all(selectedIds.map(id => updatePOStatus(id, status)))
            toast.success(`${selectedIds.length} orders updated!`)
            setSelectedIds([])
            fetchData()
        } catch (err: any) {
            toast.error('Failed to update: ' + err.message)
        } finally {
            setIsBulkUpdating(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingOrder) return
        try {
            setIsDeleting(true); await deletePurchaseOrder(deletingOrder.id)
            toast.success('Deleted!'); setIsDeleteModalOpen(false); setDeletingOrder(null)
            if (selectedPOId === deletingOrder.id) setSelectedPOId(null); fetchData()
        } catch (err: any) { toast.error(err.message) } finally { setIsDeleting(false) }
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Purchase Orders"
                description={`${stats.total} orders • Value: ${formatCurrency(stats.totalValue)}`}
                actions={<div className="flex items-center gap-3">
                    <Button variant="secondary" icon={<Download size={16} />} size="sm">Export</Button>
                    <Button icon={<Plus size={16} />} onClick={() => setShowWizard(true)}>New Purchase Order</Button>
                </div>} />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Total', value: stats.total, color: 'text-indigo-400' },
                    { label: 'Draft', value: stats.draft, color: 'text-dark-500' },
                    { label: 'Sent', value: stats.sent, color: 'text-blue-400' },
                    { label: 'Confirmed', value: stats.confirmed, color: 'text-purple-400' },
                    { label: 'Received', value: stats.received, color: 'text-emerald-400' },
                    { label: 'Value', value: formatCurrency(stats.totalValue), color: 'text-indigo-400' },
                ].map(k => (
                    <div key={k.label} className="glass-card p-3">
                        <p className="text-[10px] text-dark-500 uppercase">{k.label}</p>
                        <p className={cn('text-lg font-bold mt-0.5', k.color)}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className="bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <span className="font-bold">{selectedIds.length}</span> orders selected
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => handleBulkUpdate('confirmed')} isLoading={isBulkUpdating}>
                            Confirm Selected
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleBulkUpdate('cancelled')} isLoading={isBulkUpdating}>
                            Cancel Selected
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 max-w-md">
                    <Input placeholder="Search by PO number..." value={search}
                        onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                    <select
                        className="input-field text-sm py-1.5 px-3 min-w-[150px]"
                        value={filterSupplier}
                        onChange={(e) => { setFilterSupplier(e.target.value); setPage(1) }}
                    >
                        <option value="">All Suppliers</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    <div className="flex items-center gap-1 bg-dark-200/50 rounded-lg p-1 border border-dark-300/30">
                        <input type="date" className="bg-transparent border-none text-xs text-white p-1 focus:ring-0"
                            value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        <span className="text-dark-500">-</span>
                        <input type="date" className="bg-transparent border-none text-xs text-white p-1 focus:ring-0"
                            value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>

                    {['all', ...PO_STEPS, 'cancelled'].map(s => (
                        <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                statusFilter === s ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className={cn('flex gap-6', selectedPOId ? 'items-start' : '')}>
                <div className={cn('transition-all duration-300', selectedPOId ? 'w-1/2' : 'w-full')}>
                    {isLoading ? (
                        <div className="glass-card p-8"><div className="animate-pulse space-y-3">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-dark-200 rounded-lg" />)}
                        </div></div>
                    ) : orders.length === 0 ? (
                        <EmptyState icon={<Truck size={48} />} title="No purchase orders"
                            description="Create your first purchase order" actionLabel="New PO" onAction={() => setShowWizard(true)} />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead><tr className="border-b border-dark-300/50">
                                    <th className="w-8 px-4 py-3">
                                        <input type="checkbox"
                                            checked={orders.length > 0 && selectedIds.length === orders.length}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedIds(orders.map(o => o.id))
                                                else setSelectedIds([])
                                            }}
                                            className="rounded border-dark-400 bg-dark-300 text-indigo-500 focus:ring-indigo-500/30"
                                        />
                                    </th>
                                    {['PO Number', 'Supplier', 'Date', 'Expected', 'Status', 'Total', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-dark-300/30">
                                    {orders.map(o => (
                                        <tr key={o.id} onClick={() => setSelectedIds(prev => prev.includes(o.id) ? prev.filter(id => id !== o.id) : [...prev, o.id])}
                                            className={cn('hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                selectedIds.includes(o.id) && 'bg-indigo-500/10',
                                                selectedPOId === o.id && 'border-l-2 border-indigo-500 bg-indigo-500/5')}>
                                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                <input type="checkbox"
                                                    checked={selectedIds.includes(o.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedIds(p => [...p, o.id])
                                                        else setSelectedIds(p => p.filter(id => id !== o.id))
                                                    }}
                                                    className="rounded border-dark-400 bg-dark-300 text-indigo-500 focus:ring-indigo-500/30"
                                                />
                                            </td>
                                            <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); setSelectedPOId(o.id) }}>
                                                <p className="text-sm font-medium text-indigo-400 font-mono">{o.po_number}</p>
                                            </td>
                                            <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); setSelectedPOId(o.id) }}>
                                                <p className="text-sm text-white">{o.supplier_name}</p>
                                                <p className="text-xs text-dark-500">{o.supplier_phone}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-dark-500" onClick={(e) => { e.stopPropagation(); setSelectedPOId(o.id) }}>{formatDate(o.order_date)}</td>
                                            <td className="px-4 py-3 text-sm text-dark-500" onClick={(e) => { e.stopPropagation(); setSelectedPOId(o.id) }}>{o.expected_date ? formatDate(o.expected_date) : '-'}</td>
                                            <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); setSelectedPOId(o.id) }}><StatusBadge status={o.status} /></td>
                                            <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); setSelectedPOId(o.id) }}><span className="text-sm font-mono font-semibold text-white">{formatCurrency(o.total_amount)}</span></td>
                                            <td className="px-4 py-3">
                                                {o.status === 'draft' && (
                                                    <button title="Delete" onClick={(e) => { e.stopPropagation(); setDeletingOrder(o); setIsDeleteModalOpen(true) }}
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

                {selectedPOId && (
                    <div className="w-1/2 sticky top-20">
                        <PODetail poId={selectedPOId} onClose={() => setSelectedPOId(null)} onRefresh={fetchData} />
                    </div>
                )}
            </div>

            <CreatePOWizard 
                isOpen={showWizard} 
                onClose={() => setShowWizard(false)} 
                onCreated={fetchData}
                prefillMaterialId={prefillMaterialId}
                prefillQuantity={prefillQuantity}
                prefillMaterialName={prefillMaterialName}
                prefillCost={prefillCost}
                prefillUnit={prefillUnit}
            />

            <Modal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setDeletingOrder(null) }}
                title="Delete Purchase Order" size="sm"
                footer={<>
                    <Button variant="secondary" onClick={() => { setIsDeleteModalOpen(false); setDeletingOrder(null) }}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
                </>}>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                    <AlertCircle size={20} className="text-red-400 mt-0.5" />
                    <p className="text-sm text-white">Delete <strong>{deletingOrder?.po_number}</strong>?</p>
                </div>
            </Modal>
        </div>
    )
}