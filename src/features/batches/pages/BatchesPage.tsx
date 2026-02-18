import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Search, Download, Trash2, X, Save, ChevronLeft, ChevronRight,
    Package, AlertTriangle, CheckCircle, XCircle, ClipboardCheck,
    Calendar, Layers, Factory, ArrowRight, RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuthStore } from '@/features/auth/store/authStore'
import { supabase } from '@/lib/supabase'
import {
    getBatches, getBatchById, createBatch, deleteBatch, updateBatchStatus,
    getBatchStats, getProductsForBatch,
    type Batch, type BatchFormData, EMPTY_BATCH_FORM, BATCH_STATUSES, QUALITY_GRADES, BATCH_LIFECYCLE,
} from '@/services/batchService'
import { createQualityCheck } from '@/services/qualityCheckService'
import { exportToCSV } from '@/services/exportService'

// ============ STATUS BADGES ============
function QCStatusBadge({ status }: { status: string }) {
    const config = BATCH_STATUSES.find(s => s.value === status) || BATCH_STATUSES[0]
    const colorMap: Record<string, string> = {
        'warning': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        'success': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        'danger': 'text-red-400 bg-red-500/10 border-red-500/20',
    }
    return <Badge className={cn('font-medium', colorMap[config.color] || 'text-dark-400 bg-dark-200/50')}>{config.label}</Badge>
}

function LifecycleBadge({ status }: { status: string }) {
    const config = BATCH_LIFECYCLE.find(s => s.value === status) || { label: status, color: 'default' }
    const colorMap: Record<string, string> = {
        'warning': 'text-amber-400 bg-amber-500/10',
        'success': 'text-emerald-400 bg-emerald-500/10',
        'danger': 'text-red-400 bg-red-500/10',
        'info': 'text-blue-400 bg-blue-500/10',
        'default': 'text-dark-400 bg-dark-200/50',
    }
    return <Badge className={cn('font-medium text-[10px]', colorMap[config.color] || colorMap['default'])}>{config.label}</Badge>
}

// ============ BATCH DETAIL PANEL ============
function BatchDetail({ batchId, onClose, onRefresh }: {
    batchId: string; onClose: () => void; onRefresh: () => void
}) {
    const { user } = useAuthStore()
    const [batch, setBatch] = useState<Batch | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)

    const loadBatch = useCallback(async () => {
        try {
            setLoading(true)
            const data = await getBatchById(batchId)
            setBatch(data)
        } catch (err: any) { toast.error(err.message) }
        finally { setLoading(false) }
    }, [batchId])

    useEffect(() => { loadBatch() }, [loadBatch])

    const handleQCRequest = async () => {
        if (!batch) return
        try {
            setUpdating(true)

            // Check if QC already exists for this batch
            const { data: existingQC } = await supabase
                .from('quality_checks')
                .select('id')
                .or(`batch_id.eq.${batch.id},batch_number.eq.${batch.batch_number}`)
                .limit(1)

            if (existingQC && existingQC.length > 0) {
                toast.info('QC check already exists for this batch. Check Quality Checks page.')
                return
            }

            await createQualityCheck({
                reference_type: 'batch',
                reference_id: batch.id,
                batch_id: batch.id,
                checked_at: new Date().toISOString().split('T')[0],
                notes: `QC requested for batch ${batch.batch_number}`,
                items: [{
                    parameter_name: 'Overall Quality',
                    specification: 'Must meet Ayurvedic Pharmacopoeia standards',
                    min_value: null,
                    max_value: null,
                    actual_value: null,
                    result: 'pending',
                    notes: '',
                }],
            }, user?.id)
            toast.success('QC check created! Go to Quality Checks to inspect.')
            loadBatch()
            onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handleStatusChange = async (qualityStatus: string) => {
        if (!batch) return
        try {
            setUpdating(true)
            await updateBatchStatus(batch.id, qualityStatus)
            toast.success(`Batch ${qualityStatus === 'pass' ? 'approved' : qualityStatus === 'fail' ? 'rejected' : 'reset to pending'}!`)
            loadBatch()
            onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    if (loading) return (
        <div className="glass-card p-8 h-[400px]">
            <div className="animate-pulse space-y-4">
                <div className="h-6 bg-dark-200 rounded w-1/3" />
                <div className="h-32 bg-dark-200 rounded" />
                <div className="h-32 bg-dark-200 rounded" />
            </div>
        </div>
    )

    if (!batch) return null

    const daysToExpiry = batch.expiry_date
        ? Math.ceil((new Date(batch.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null

    return (
        <div className="glass-card h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-300/50">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-white font-mono">{batch.batch_number}</h2>
                        <QCStatusBadge status={batch.quality_status} />
                        <LifecycleBadge status={batch.status} />
                    </div>
                    <p className="text-xs text-dark-500 mt-1">{batch.product_name} • {batch.product_sku}</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200">
                    <X size={16} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-dark-300/30">
                    {batch.quality_status === 'pending' && (
                        <>
                            <Button size="sm" variant="primary" onClick={handleQCRequest} isLoading={updating}
                                icon={<ClipboardCheck size={14} />}>
                                Request QC Check
                            </Button>
                            <Button size="sm" variant="success" onClick={() => handleStatusChange('pass')}
                                isLoading={updating} icon={<CheckCircle size={14} />}>
                                Pass Directly
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleStatusChange('fail')}
                                isLoading={updating} icon={<XCircle size={14} />}>
                                Reject
                            </Button>
                        </>
                    )}
                    {batch.quality_status === 'pass' && (
                        <Button size="sm" variant="secondary" onClick={() => handleStatusChange('pending')}
                            isLoading={updating} icon={<RotateCcw size={14} />}>
                            Reset to Pending
                        </Button>
                    )}
                    {batch.quality_status === 'fail' && (
                        <>
                            <Button size="sm" variant="secondary" onClick={() => handleStatusChange('pending')}
                                isLoading={updating} icon={<RotateCcw size={14} />}>
                                Re-test
                            </Button>
                        </>
                    )}
                </div>

                {/* Key Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Product', value: batch.product_name, icon: Package },
                        { label: 'Grade', value: batch.grade || '-', icon: CheckCircle },
                        { label: 'Mfg Date', value: formatDate(batch.manufacturing_date), icon: Calendar },
                        { label: 'Expiry', value: formatDate(batch.expiry_date), icon: Calendar },
                        { label: 'Produced', value: `${batch.produced_qty}`, icon: Factory },
                        { label: 'Available', value: `${batch.available_qty}`, icon: Layers },
                    ].map(d => (
                        <div key={d.label} className="glass-card p-3 bg-dark-200/20">
                            <div className="flex items-center gap-1.5 text-dark-600 mb-1">
                                <d.icon size={12} />
                                <span className="text-[10px] uppercase tracking-wider">{d.label}</span>
                            </div>
                            <p className="text-sm font-medium text-white">{d.value}</p>
                        </div>
                    ))}
                </div>

                {/* Expiry Warning */}
                {daysToExpiry !== null && daysToExpiry <= 90 && daysToExpiry >= 0 && (
                    <div className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border',
                        daysToExpiry <= 30
                            ? 'bg-red-500/5 border-red-500/20 text-red-400'
                            : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                    )}>
                        <AlertTriangle size={16} />
                        <p className="text-sm font-medium">
                            {daysToExpiry <= 0 ? 'EXPIRED' : `Expires in ${daysToExpiry} days`}
                        </p>
                    </div>
                )}

                {/* Stock Breakdown */}
                <div>
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider px-1 mb-3">Stock Breakdown</p>
                    <div className="glass-card p-4 bg-dark-200/20 space-y-3">
                        {[
                            { label: 'Produced', value: batch.produced_qty, color: 'text-blue-400' },
                            { label: 'Available', value: batch.available_qty, color: 'text-emerald-400' },
                            { label: 'Reserved', value: batch.reserved_qty || 0, color: 'text-amber-400' },
                            { label: 'Rejected', value: batch.rejected_qty || 0, color: 'text-red-400' },
                        ].map(row => (
                            <div key={row.label} className="flex items-center justify-between">
                                <span className="text-sm text-dark-500">{row.label}</span>
                                <span className={cn('text-sm font-mono font-medium', row.color)}>{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* QC Info */}
                <div>
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider px-1 mb-3">Quality Control</p>
                    <div className="glass-card p-4 bg-dark-200/20 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-dark-500">QC Status</span>
                            <QCStatusBadge status={batch.quality_status} />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-dark-500">QC Checks</span>
                            <span className="text-sm font-mono text-white">{batch.qc_count || 0}</span>
                        </div>
                        {batch.work_order_number && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-dark-500">Work Order</span>
                                <span className="text-sm font-mono text-purple-400">{batch.work_order_number}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Warehouse Info */}
                {(batch.warehouse_name !== '-' || batch.location_code !== '-') && (
                    <div>
                        <p className="text-[10px] text-dark-500 uppercase tracking-wider px-1 mb-3">Storage Location</p>
                        <div className="glass-card p-4 bg-dark-200/20 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-dark-500">Warehouse</span>
                                <span className="text-sm text-white">{batch.warehouse_name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-dark-500">Location</span>
                                <span className="text-sm font-mono text-white">{batch.location_code}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Notes */}
                {batch.manufacturing_notes && (
                    <div className="glass-card p-3 border-l-2 border-amber-500/50 bg-amber-500/5">
                        <p className="text-[10px] text-amber-400 uppercase tracking-wider">Manufacturing Notes</p>
                        <p className="text-sm text-dark-400 mt-1">{batch.manufacturing_notes}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ============ MAIN PAGE ============
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

    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null)
    const [formData, setFormData] = useState<BatchFormData>(EMPTY_BATCH_FORM)
    const [products, setProducts] = useState<{ id: string; name: string; sku: string }[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [stats, setStats] = useState({ total: 0, pending: 0, passed: 0, failed: 0, expired: 0, nearExpiry: 0 })

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

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const prods = await getProductsForBatch()
                setProducts(prods)
            } catch (err: any) { console.error(err) }
        }
        loadProducts()
    }, [])

    const handleSave = async () => {
        if (!formData.product_id || !formData.produced_qty) {
            toast.error('Product and Quantity are required')
            return
        }
        try {
            setIsSaving(true)
            await createBatch(formData, user?.id)
            toast.success('Batch created!')
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
            if (selectedBatchId === deletingBatch.id) setSelectedBatchId(null)
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
            available_qty: b.available_qty,
            qc_status: BATCH_STATUSES.find(s => s.value === b.quality_status)?.label || b.quality_status,
            lifecycle: BATCH_LIFECYCLE.find(s => s.value === b.status)?.label || b.status,
            grade: b.grade || '-',
        }))
        exportToCSV(rows, [
            { key: 'batch_number', label: 'Batch #' },
            { key: 'product', label: 'Product' },
            { key: 'mfg_date', label: 'Mfg Date' },
            { key: 'expiry_date', label: 'Expiry' },
            { key: 'produced_qty', label: 'Produced' },
            { key: 'available_qty', label: 'Available' },
            { key: 'qc_status', label: 'QC Status' },
            { key: 'lifecycle', label: 'Status' },
            { key: 'grade', label: 'Grade' },
        ], 'batches')
        toast.success('Exported!')
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Batch Management"
                description={`${stats.total} batches • ${stats.pending} pending QC • ${stats.nearExpiry} near expiry`}
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
                    { label: 'Expired', value: stats.expired, color: 'text-red-500' },
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
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }} icon={<Search size={16} />} />
                </div>
                <div className="flex items-center gap-2">
                    {[
                        { value: 'all', label: 'All' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'pass', label: 'Passed' },
                        { value: 'fail', label: 'Failed' },
                    ].map(s => (
                        <button key={s.value} onClick={() => { setStatusFilter(s.value); setPage(1) }}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                statusFilter === s.value
                                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                                    : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                            {s.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    {[
                        { value: 'all' as const, label: 'All Dates' },
                        { value: 'near_expiry' as const, label: '⚠️ Expiring' },
                        { value: 'expired' as const, label: '🔴 Expired' },
                    ].map(s => (
                        <button key={s.value} onClick={() => { setExpiryFilter(s.value); setPage(1) }}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                expiryFilter === s.value
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Split View: Table + Detail */}
            <div className={cn('flex gap-6', selectedBatchId ? 'items-start' : '')}>
                {/* Table */}
                <div className={cn('transition-all duration-300', selectedBatchId ? 'w-1/2' : 'w-full')}>
                    {isLoading ? (
                        <div className="glass-card p-8">
                            <div className="animate-pulse space-y-3">
                                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-dark-200 rounded-lg" />)}
                            </div>
                        </div>
                    ) : batches.length === 0 ? (
                        <EmptyState icon={<Package size={48} />} title="No batches found"
                            description="Create a batch or complete a production order"
                            actionLabel="New Batch" onAction={() => setShowModal(true)} />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-dark-300/50">
                                        {(selectedBatchId
                                            ? ['Batch #', 'Product', 'Qty', 'QC']
                                            : ['Batch #', 'Product', 'Mfg Date', 'Expiry', 'Qty', 'QC Status', 'Status', '']
                                        ).map(h => (
                                            <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-300/30">
                                    {batches.map(batch => (
                                        <tr key={batch.id}
                                            onClick={() => setSelectedBatchId(batch.id)}
                                            className={cn(
                                                'hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                selectedBatchId === batch.id && 'bg-brand-500/5 border-l-2 border-brand-500'
                                            )}>
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-medium text-brand-400 font-mono">{batch.batch_number}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm text-white">{batch.product_name}</p>
                                                {!selectedBatchId && <p className="text-xs text-dark-500">{batch.product_sku}</p>}
                                            </td>
                                            {!selectedBatchId && (
                                                <>
                                                    <td className="px-3 py-3 text-sm text-dark-500">{formatDate(batch.manufacturing_date)}</td>
                                                    <td className="px-3 py-3 text-sm">
                                                        <span className={cn(
                                                            batch.is_expired && 'text-red-400 font-medium',
                                                            batch.is_near_expiry && !batch.is_expired && 'text-amber-400',
                                                            !batch.is_expired && !batch.is_near_expiry && 'text-dark-500'
                                                        )}>
                                                            {formatDate(batch.expiry_date)}
                                                        </span>
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-3 py-3 text-sm font-mono text-white">
                                                {batch.available_qty} / {batch.produced_qty}
                                            </td>
                                            <td className="px-3 py-3">
                                                <QCStatusBadge status={batch.quality_status} />
                                            </td>
                                            {!selectedBatchId && (
                                                <>
                                                    <td className="px-3 py-3">
                                                        <LifecycleBadge status={batch.status} />
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        {batch.quality_status === 'pending' && (
                                                            <button onClick={(e) => { e.stopPropagation(); setDeletingBatch(batch) }}
                                                                className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-dark-200">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-xs text-dark-500">
                                {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)} icon={<ChevronLeft size={16} />}>Prev</Button>
                                <span className="text-sm text-dark-500">{page}/{totalPages}</span>
                                <Button size="sm" variant="ghost" disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={16} /></Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Detail Panel */}
                {selectedBatchId && (
                    <div className="w-1/2 sticky top-24">
                        <BatchDetail
                            batchId={selectedBatchId}
                            onClose={() => setSelectedBatchId(null)}
                            onRefresh={fetchData}
                        />
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
                    <div className="glass-card p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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

                            <Input label="Notes (Optional)" value={formData.manufacturing_notes || ''}
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeletingBatch(null)}>
                    <div className="glass-card p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start gap-3 mb-4">
                            <AlertTriangle size={20} className="text-red-400 mt-0.5" />
                            <div>
                                <h3 className="text-lg font-semibold text-white">Delete Batch?</h3>
                                <p className="text-sm text-dark-500 mt-1">
                                    Delete <strong className="text-white">{deletingBatch.batch_number}</strong>?
                                    This will also remove the inventory record.
                                </p>
                            </div>
                        </div>
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