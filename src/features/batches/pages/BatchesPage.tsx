import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Download, Trash2, X, Save, ChevronLeft, ChevronRight, Package, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
    getBatches, getBatchById, createBatch, deleteBatch, updateBatchStatus,
    getBatchStats, getProductsForBatch, getWarehousesForBatch, getLocationsForWarehouse,
    type Batch, type BatchFormData, EMPTY_BATCH_FORM, BATCH_STATUSES, QUALITY_GRADES
} from '@/services/batchService'
import { exportToCSV } from '@/services/exportService'

function BatchStatusBadge({ status, grade }: { status: string; grade?: string | null }) {
    const config = BATCH_STATUSES.find(s => s.value === status) || BATCH_STATUSES[0]
    const colorMap: Record<string, any> = {
        'default': 'default',
        'success': 'success',
        'danger': 'danger',
        'warning': 'warning',
        'info': 'info'
    }
    return (
        <div className="flex items-center gap-1">
            <Badge variant={colorMap[config.color] || 'default'}>{config.label}</Badge>
            {grade && <span className="text-xs text-dark-500">({grade})</span>}
        </div>
    )
}

export function BatchesPage() {
    const { user } = useAuthStore()
    const [batches, setBatches] = useState<Batch[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | 'near_expiry' | 'active'>('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 25

    const [showModal, setShowModal] = useState(false)
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
    const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null)
    const [formData, setFormData] = useState<BatchFormData>(EMPTY_BATCH_FORM)
    const [products, setProducts] = useState<{ id: string; name: string; sku: string }[]>([])
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([])
    const [locations, setLocations] = useState<{ id: string; code: string }[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [stats, setStats] = useState({ total: 0, pending: 0, passed: 0, failed: 0, expired: 0, nearExpiry: 0 })

    const fetchDropdowns = async () => {
        const [prods, whs] = await Promise.all([
            getProductsForBatch(),
            getWarehousesForBatch()
        ])
        setProducts(prods)
        setWarehouses(whs)
    }

    const fetchLocations = async (warehouseId: string) => {
        if (!warehouseId) {
            setLocations([])
            return
        }
        const locs = await getLocationsForWarehouse(warehouseId)
        setLocations(locs)
    }

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getBatches({ page, pageSize }, { status: statusFilter, expiryFilter, search }),
                getBatchStats()
            ])
            setBatches(result.data)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
        } catch (err: any) { toast.error(err.message) }
        finally { setIsLoading(false) }
    }, [page, statusFilter, expiryFilter, search])

    useEffect(() => { fetchData(); fetchDropdowns() }, [fetchData])

    const handleSave = async () => {
        if (!formData.product_id || !formData.produced_qty) {
            toast.error('Please fill required fields (Product and Quantity)')
            return
        }

        try {
            setIsSaving(true)
            await createBatch(formData, user?.id)
            toast.success('Batch created successfully!')
            setShowModal(false)
            setFormData(EMPTY_BATCH_FORM)
            fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const handleDelete = async () => {
        if (!deletingBatch) return
        try {
            await deleteBatch(deletingBatch.id)
            toast.success('Batch deleted')
            setDeletingBatch(null)
            fetchData()
        } catch (err: any) { toast.error(err.message) }
    }

    const handleExport = () => {
        const rows = batches.map(b => ({
            batch_number: b.batch_number,
            product: b.product_name,
            mfg_date: formatDate(b.manufacturing_date),
            expiry_date: formatDate(b.expiry_date),
            produced_qty: b.produced_qty,
            status: b.quality_status,
            grade: b.grade || '-'
        }))
        exportToCSV(rows, [
            { key: 'batch_number', label: 'Batch #' },
            { key: 'product', label: 'Product' },
            { key: 'mfg_date', label: 'Mfg Date' },
            { key: 'expiry_date', label: 'Expiry' },
            { key: 'produced_qty', label: 'Qty' },
            { key: 'status', label: 'Status' },
            { key: 'grade', label: 'Grade' }
        ], 'batches')
        toast.success('Exported!')
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Batch Management"
                description={`${stats.total} batches • ${stats.nearExpiry} near expiry`}
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" size="sm" icon={<Download size={16} />} onClick={handleExport}>Export</Button>
                        <Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>New Batch</Button>
                    </div>
                }
            />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Total', value: stats.total, color: 'text-blue-400' },
                    { label: 'Pending QC', value: stats.pending, color: 'text-amber-400' },
                    { label: 'Passed', value: stats.passed, color: 'text-emerald-400' },
                    { label: 'Failed', value: stats.failed, color: 'text-red-400' },
                    { label: 'Near Expiry', value: stats.nearExpiry, color: 'text-orange-400' },
                    { label: 'Expired', value: stats.expired, color: 'text-red-500' }
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
                    <Input placeholder="Search batch number..." value={search}
                        onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
                </div>
                <div className="flex items-center gap-2">
                    {['all', 'pending', 'passed', 'failed'].map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                statusFilter === s ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="glass-card p-8">
                    <div className="animate-pulse space-y-3">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-dark-200 rounded-lg" />)}
                    </div>
                </div>
            ) : batches.length === 0 ? (
                <EmptyState icon={<Package size={48} />} title="No batches" description="Create a batch to track inventory" />
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-dark-300/50">
                                {['Batch #', 'Product', 'Mfg Date', 'Expiry', 'Qty', 'Status', ''].map(h => (
                                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-300/30">
                            {batches.map(batch => (
                                <tr key={batch.id} className="hover:bg-dark-200/30">
                                    <td className="px-3 py-3">
                                        <p className="text-sm font-medium text-brand-400 font-mono">{batch.batch_number}</p>
                                    </td>
                                    <td className="px-3 py-3">
                                        <p className="text-sm text-white">{batch.product_name}</p>
                                        <p className="text-xs text-dark-500">{batch.product_sku}</p>
                                    </td>
                                    <td className="px-3 py-3 text-sm text-dark-500">{formatDate(batch.manufacturing_date)}</td>
                                    <td className="px-3 py-3 text-sm text-dark-500">
                                        <span className={cn(batch.is_expired && 'text-red-400', batch.is_near_expiry && !batch.is_expired && 'text-amber-400')}>
                                            {formatDate(batch.expiry_date)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-sm font-mono text-white">{batch.available_qty} / {batch.produced_qty}</td>
                                    <td className="px-3 py-3"><BatchStatusBadge status={batch.quality_status} grade={batch.grade} /></td>
                                    <td className="px-3 py-3">
                                        {batch.quality_status === 'pending' && (
                                            <button onClick={() => setDeletingBatch(batch)}
                                                className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-dark-200"><Trash2 size={14} /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal - Simplified for now */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="glass-card p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-white mb-4">Create New Batch</h3>
                        <div className="space-y-4">
                            <Select label="Product *" value={formData.product_id}
                                onChange={(e) => setFormData(p => ({ ...p, product_id: e.target.value }))}
                                options={products.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
                                placeholder="Select product" />

                            <Input label="Quantity *" type="number" value={formData.produced_qty}
                                onChange={(e) => setFormData(p => ({ ...p, produced_qty: Number(e.target.value) }))} />

                            <Input label="Manufacturing Date" type="date" value={formData.manufacturing_date}
                                onChange={(e) => setFormData(p => ({ ...p, manufacturing_date: e.target.value }))} />

                            <Input label="Notes (Optional)" value={formData.manufacturing_notes}
                                onChange={(e) => setFormData(p => ({ ...p, manufacturing_notes: e.target.value }))} />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button onClick={handleSave} isLoading={isSaving} icon={<Save size={16} />}>Create Batch</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deletingBatch && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="glass-card p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-white mb-2">Delete Batch?</h3>
                        <p className="text-sm text-dark-500 mb-4">Delete {deletingBatch.batch_number}? This cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setDeletingBatch(null)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDelete}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
