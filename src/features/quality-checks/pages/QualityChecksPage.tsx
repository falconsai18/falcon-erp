import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Download, Trash2, ClipboardCheck, CheckCircle, XCircle, Save, X, Camera } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { SmartCamera } from '@/components/ui/SmartCamera'
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
    getQualityChecks, getQualityCheckById, createQualityCheck, deleteQualityCheck,
    getQCStats, updateQualityCheckStatus, updateQualityCheckItem,
    passAllQCItems, failAllQCItems,
    type QualityCheck, type QualityCheckFormData, EMPTY_QC_FORM, QC_STATUSES, QC_ITEM_RESULTS
} from '@/services/qualityCheckService'
import { exportToCSV } from '@/services/exportService'

// ============ REFERENCE RESOLVER ============
// Cache work order numbers and batch numbers to avoid repeated DB calls
const referenceCache = new Map<string, string>()

async function resolveReference(qc: QualityCheck): Promise<string> {
    // Priority: batch_number > work_order_id > batch_id > parameter
    if (qc.batch_number) return qc.batch_number

    if (qc.work_order_id) {
        const cached = referenceCache.get(qc.work_order_id)
        if (cached) return cached

        const { data } = await supabase
            .from('work_orders')
            .select('work_order_number')
            .eq('id', qc.work_order_id)
            .single()

        const num = data?.work_order_number || qc.work_order_id.slice(0, 8)
        referenceCache.set(qc.work_order_id, num)
        return num
    }

    if (qc.batch_id) {
        const cached = referenceCache.get(qc.batch_id)
        if (cached) return cached

        const { data } = await supabase
            .from('batches')
            .select('batch_number')
            .eq('id', qc.batch_id)
            .single()

        const num = data?.batch_number || qc.batch_id.slice(0, 8)
        referenceCache.set(qc.batch_id, num)
        return num
    }

    if (qc.production_order_id) {
        const cached = referenceCache.get(qc.production_order_id)
        if (cached) return cached

        const { data } = await supabase
            .from('production_orders')
            .select('order_number')
            .eq('id', qc.production_order_id)
            .single()

        const num = data?.order_number || qc.production_order_id.slice(0, 8)
        referenceCache.set(qc.production_order_id, num)
        return num
    }

    return qc.parameter || '-'
}

function QCStatusBadge({ status }: { status: string }) {
    const config = QC_STATUSES.find(s => s.value === status) || QC_STATUSES[0]
    const colorMap: Record<string, string> = {
        'default': 'text-dark-400 bg-dark-200/50',
        'success': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        'danger': 'text-red-400 bg-red-500/10 border-red-500/20',
    }
    return <Badge className={cn('font-medium', colorMap[config.color] || colorMap['default'])}>{config.label}</Badge>
}

// ============ QC DETAIL PANEL ============
function QualityCheckDetail({ qcId, onClose, onRefresh }: {
    qcId: string; onClose: () => void; onRefresh: () => void
}) {
    const { user } = useAuthStore()
    const [qc, setQC] = useState<QualityCheck | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [editingItem, setEditingItem] = useState<string | null>(null)
    const [itemData, setItemData] = useState({ actual_value: 0, result: 'pending', notes: '' })
    const [resolvedRef, setResolvedRef] = useState('-')

    const resolveName = (id: string | null | undefined, fallback: string | undefined) => {
        if (!id) return 'System'
        if (id === user?.id) return user.full_name || 'Me'
        if (!fallback || fallback === id || (fallback && fallback.length > 20)) return 'Inspector'
        return fallback
    }

    const loadQC = useCallback(async () => {
        try {
            setLoading(true)
            const data = await getQualityCheckById(qcId)
            setQC(data)
            const ref = await resolveReference(data)
            setResolvedRef(ref)
        } catch (err: any) { toast.error(err.message) }
        finally { setLoading(false) }
    }, [qcId])

    useEffect(() => { loadQC() }, [loadQC])

    const handleStatusUpdate = async (status: string) => {
        try {
            setUpdating(true)
            await updateQualityCheckStatus(qcId, status, undefined, user?.id)
            toast.success(`QC status updated to ${status}`)
            loadQC(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handleItemUpdate = async (itemId: string) => {
        try {
            setUpdating(true)
            await updateQualityCheckItem(itemId, itemData.actual_value, itemData.result, itemData.notes)
            toast.success('Item updated')
            setEditingItem(null)
            loadQC(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handlePassAll = async () => {
        try {
            setUpdating(true)
            await passAllQCItems(qcId)
            toast.success('All items passed & QC approved!')
            loadQC(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handleFailAll = async () => {
        try {
            setUpdating(true)
            await failAllQCItems(qcId)
            toast.error('All items marked as failed')
            loadQC(); onRefresh()
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

    if (!qc) return null

    return (
        <div className="glass-card h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-dark-300/50">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="font-semibold text-white font-mono">{resolvedRef}</h2>
                        <QCStatusBadge status={qc.result} />
                    </div>
                    <p className="text-xs text-dark-500 mt-1">{formatDate(qc.checked_at)}</p>
                </div>
                <button title="Close" onClick={onClose} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-dark-300/30">
                    {qc.result === 'pending' && (
                        <>
                            <Button size="sm" variant="success" onClick={handlePassAll} isLoading={updating} icon={<CheckCircle size={14} />}>Pass All & Approve</Button>
                            <Button size="sm" variant="danger" onClick={handleFailAll} isLoading={updating} icon={<XCircle size={14} />}>Fail All</Button>
                        </>
                    )}
                    {(qc.result === 'pass' || qc.result === 'fail') && (
                        <Button size="sm" variant="secondary" onClick={() => handleStatusUpdate('pending')} isLoading={updating}>Reset to Pending</Button>
                    )}
                </div>

                {/* Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card p-3 bg-dark-200/20">
                        <p className="text-[10px] text-dark-500 uppercase tracking-wider">Reference</p>
                        <p className="text-sm font-medium text-white font-mono">{resolvedRef}</p>
                    </div>
                    <div className="glass-card p-3 bg-dark-200/20">
                        <p className="text-[10px] text-dark-500 uppercase tracking-wider">Type</p>
                        <p className="text-sm font-medium text-white capitalize">
                            {qc.work_order_id ? 'Work Order' : qc.batch_id ? 'Batch' : qc.production_order_id ? 'Production' : 'Manual'}
                        </p>
                    </div>
                    <div className="glass-card p-3 bg-dark-200/20">
                        <p className="text-[10px] text-dark-500 uppercase tracking-wider">Inspector</p>
                        <p className="text-sm font-medium text-white truncate">{resolveName(qc.checked_by, qc.checked_by_name)}</p>
                    </div>
                    <div className="glass-card p-3 bg-dark-200/20">
                        <p className="text-[10px] text-dark-500 uppercase tracking-wider">Date</p>
                        <p className="text-sm font-medium text-white">{formatDate(qc.checked_at)}</p>
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider px-1">
                        Checklist Items ({qc.items?.length || 0})
                    </p>
                    {(!qc.items || qc.items.length === 0) ? (
                        <div className="glass-card p-4 bg-dark-200/20 text-center">
                            <p className="text-sm text-dark-500">No checklist items added yet</p>
                        </div>
                    ) : qc.items.map(item => (
                        <div key={item.id} className="glass-card p-4 bg-dark-200/20 space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-white">{item.parameter_name}</p>
                                    <p className="text-xs text-dark-500 italic">Spec: {item.specification}</p>
                                    {item.unit && <p className="text-xs text-dark-600">Unit: {item.unit}</p>}
                                    {(item.min_value !== null || item.max_value !== null) && (
                                        <p className="text-xs text-dark-600">
                                            Range: {item.min_value ?? '-'} to {item.max_value ?? '-'}
                                        </p>
                                    )}
                                </div>
                                <Badge variant={item.result === 'pass' ? 'success' : item.result === 'fail' ? 'danger' : 'default'}
                                    className="uppercase text-[10px]">
                                    {item.result}
                                </Badge>
                            </div>

                            {editingItem === item.id ? (
                                <div className="space-y-3 pt-2 border-t border-dark-300/30">
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            label="Actual Value"
                                            type="number"
                                            value={itemData.actual_value}
                                            onChange={(e) => setItemData(p => ({ ...p, actual_value: Number(e.target.value) }))}
                                        />
                                        <Select
                                            label="Result"
                                            value={itemData.result}
                                            onChange={(e) => setItemData(p => ({ ...p, result: e.target.value }))}
                                            options={QC_ITEM_RESULTS}
                                        />
                                    </div>
                                    <Textarea
                                        label="Item Notes"
                                        value={itemData.notes}
                                        onChange={(e) => setItemData(p => ({ ...p, notes: e.target.value }))}
                                        placeholder="Specific observation..."
                                        rows={2}
                                    />
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => handleItemUpdate(item.id!)} isLoading={updating} icon={<Save size={14} />}>Save</Button>
                                        <Button size="sm" variant="secondary" onClick={() => setEditingItem(null)}>Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between group">
                                    <div className="flex gap-4">
                                        <div>
                                            <p className="text-[10px] text-dark-500 uppercase">Value</p>
                                            <p className="text-sm text-brand-400 font-mono">{item.actual_value ?? '-'}</p>
                                        </div>
                                        {item.notes && (
                                            <div>
                                                <p className="text-[10px] text-dark-500 uppercase">Note</p>
                                                <p className="text-sm text-dark-400 truncate max-w-[150px]">{item.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                    {qc.result === 'pending' && (
                                        <Button size="sm" variant="ghost" onClick={() => {
                                            setEditingItem(item.id!)
                                            setItemData({
                                                actual_value: item.actual_value || 0,
                                                result: item.result,
                                                notes: item.notes || ''
                                            })
                                        }} className="opacity-0 group-hover:opacity-100 transition-opacity">Edit</Button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {qc.notes && (
                    <div className="glass-card p-3 border-l-2 border-amber-500/50 bg-amber-500/5">
                        <p className="text-[10px] text-amber-400 uppercase tracking-wider">General Notes</p>
                        <p className="text-sm text-dark-400 mt-1">{qc.notes}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ============ MAIN PAGE ============
export function QualityChecksPage() {
    const { user } = useAuthStore()
    const [checks, setChecks] = useState<(QualityCheck & { resolvedReference?: string })[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const resolveName = (id: string | null | undefined, fallback: string | undefined) => {
        if (!id) return 'System'
        if (id === user?.id) return user.full_name || 'Me'
        if (!fallback || fallback === id || (fallback && fallback.length > 20)) return 'Inspector'
        return fallback
    }

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 25

    const [stats, setStats] = useState({ total: 0, pending: 0, passed: 0, failed: 0 })
    const [selectedQCId, setSelectedQCId] = useState<string | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showSmartCamera, setShowSmartCamera] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState<QualityCheckFormData>(EMPTY_QC_FORM)
    const [references, setReferences] = useState<{ id: string; label: string }[]>([])

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getQualityChecks({ page, pageSize }, { status: statusFilter, search }),
                getQCStats()
            ])

            // Resolve all references in parallel
            const checksWithRefs = await Promise.all(
                result.data.map(async (qc) => {
                    const ref = await resolveReference(qc)
                    return { ...qc, resolvedReference: ref }
                })
            )

            setChecks(checksWithRefs)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
        } catch (err: any) { toast.error(err.message) }
        finally { setIsLoading(false) }
    }, [page, statusFilter, search])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        const loadReferences = async () => {
            try {
                if (formData.reference_type === 'production') {
                    const { data, error } = await supabase
                        .from('work_orders')
                        .select('id, work_order_number, products(name)')
                        .eq('status', 'completed')
                        .order('created_at', { ascending: false })
                        .limit(100)

                    if (error) throw error
                    setReferences((data || []).map((o: any) => ({
                        id: o.id,
                        label: `${o.work_order_number} (${o.products?.name || '-'})`
                    })))
                } else {
                    const { data, error } = await supabase
                        .from('batches')
                        .select('id, batch_number, products(name)')
                        .eq('quality_status', 'pending')
                        .order('created_at', { ascending: false })
                        .limit(100)

                    if (error) throw error
                    setReferences((data || []).map((b: any) => ({
                        id: b.id,
                        label: `${b.batch_number} (${b.products?.name || '-'})`
                    })))
                }
            } catch (err: any) { console.error(err) }
        }
        if (showCreateModal) loadReferences()
    }, [formData.reference_type, showCreateModal])

    const handleCreate = async () => {
        if (!formData.reference_id) { toast.error('Select a reference'); return }
        try {
            setIsSaving(true)
            await createQualityCheck({
                ...formData,
                batch_id: formData.reference_type === 'batch' ? formData.reference_id : undefined,
                work_order_id: formData.reference_type === 'production' ? formData.reference_id : undefined,
                items: [{
                    parameter_name: 'Overall Quality',
                    specification: 'Must meet Ayurvedic Pharmacopoeia standards',
                    actual_value: null,
                    min_value: null,
                    max_value: null,
                    result: 'pending',
                    notes: '',
                }]
            }, user?.id)
            toast.success('Quality check created!')
            setShowCreateModal(false)
            setFormData(EMPTY_QC_FORM)
            fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteQualityCheck(id)
            toast.success('QC check deleted')
            if (selectedQCId === id) setSelectedQCId(null)
            fetchData()
        } catch (err: any) { toast.error(err.message) }
    }

    const handleExport = () => {
        const rows = checks.map(c => ({
            reference: c.resolvedReference || '-',
            type: c.work_order_id ? 'Work Order' : c.batch_id ? 'Batch' : c.production_order_id ? 'Production' : 'Manual',
            checked_at: formatDate(c.checked_at),
            result: c.result === 'pass' ? 'Pass' : c.result === 'fail' ? 'Fail' : 'Pending',
            checked_by: resolveName(c.checked_by, c.checked_by_name),
        }))
        exportToCSV(rows, [
            { key: 'reference', label: 'Reference' },
            { key: 'type', label: 'Type' },
            { key: 'checked_at', label: 'Date' },
            { key: 'result', label: 'Result' },
            { key: 'checked_by', label: 'Checked By' },
        ], 'quality_checks')
        toast.success('Exported!')
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Quality Checks"
                description={`${stats.total} checks • ${stats.pending} pending`}
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" size="sm" icon={<Download size={16} />} onClick={handleExport}>Export</Button>
                        <Button variant="secondary" size="sm" icon={<Camera size={16} />} onClick={() => setShowSmartCamera(true)}>Smart QC Scan</Button>
                        <Button icon={<Plus size={16} />} onClick={() => setShowCreateModal(true)}>New QC Check</Button>
                    </div>
                }
            />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: stats.total, color: 'text-blue-400' },
                    { label: 'Pending', value: stats.pending, color: 'text-amber-400' },
                    { label: 'Passed', value: stats.passed, color: 'text-emerald-400' },
                    { label: 'Failed', value: stats.failed, color: 'text-red-400' },
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
                    <Input placeholder="Search..." value={search}
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
            </div>

            {/* Split View */}
            <div className={cn('flex gap-6', selectedQCId ? 'items-start' : '')}>
                <div className={cn('transition-all duration-300', selectedQCId ? 'w-1/2' : 'w-full')}>
                    {isLoading ? (
                        <div className="glass-card p-8">
                            <div className="animate-pulse space-y-3">
                                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-dark-200 rounded-lg" />)}
                            </div>
                        </div>
                    ) : checks.length === 0 ? (
                        <EmptyState icon={<ClipboardCheck size={48} />} title="No quality checks"
                            description="Create a QC check from Batches or here"
                            actionLabel="New QC Check" onAction={() => setShowCreateModal(true)} />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-dark-300/50">
                                        {(selectedQCId
                                            ? ['Reference', 'Type', 'Result']
                                            : ['Reference', 'Type', 'Date', 'Result', 'Checked By', '']
                                        ).map(h => (
                                            <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-300/30">
                                    {checks.map(check => (
                                        <tr key={(check as any).id}
                                            onClick={() => setSelectedQCId((check as any).id)}
                                            className={cn(
                                                'hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                selectedQCId === (check as any).id && 'bg-brand-500/5 border-l-2 border-brand-500'
                                            )}>
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-medium text-brand-400 font-mono">
                                                    {check.resolvedReference || '-'}
                                                </p>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-dark-500 capitalize">
                                                {check.work_order_id ? 'Work Order' : check.batch_id ? 'Batch' : check.production_order_id ? 'Production' : 'Manual'}
                                            </td>
                                            {!selectedQCId && (
                                                <td className="px-3 py-3 text-sm text-dark-500">{formatDate(check.checked_at)}</td>
                                            )}
                                            <td className="px-3 py-3"><QCStatusBadge status={check.result} /></td>
                                            {!selectedQCId && (
                                                <>
                                                    <td className="px-3 py-3 text-sm text-dark-500">
                                                        {resolveName(check.checked_by, check.checked_by_name)}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        {check.result === 'pending' && (
                                                            <button onClick={(e) => { e.stopPropagation(); handleDelete((check as any).id) }}
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

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-xs text-dark-500">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}</p>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                                <span className="text-sm text-dark-500">{page}/{totalPages}</span>
                                <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                            </div>
                        </div>
                    )}
                </div>

                {selectedQCId && (
                    <div className="w-1/2 sticky top-24">
                        <QualityCheckDetail
                            qcId={selectedQCId}
                            onClose={() => setSelectedQCId(null)}
                            onRefresh={fetchData}
                        />
                    </div>
                )}
            </div>

            {/* Smart Camera - Quality Check Mode */}
            {showSmartCamera && (
                <SmartCamera
                    mode="quality"
                    onQualityCheck={(result) => {
                        if (result.issues.length > 0) {
                            const issueText = `AI Scan: ${result.issues.join(', ')}`
                            setFormData(p => ({ ...p, notes: issueText }))
                            toast.info(`Quality issues detected: ${result.issues.join(', ')}`)
                        } else {
                            setFormData(p => ({ ...p, notes: 'AI Scan: No issues detected' }))
                            toast.success('AI scan: Quality looks good!')
                        }
                        setShowSmartCamera(false)
                        setShowCreateModal(true)
                    }}
                    onClose={() => setShowSmartCamera(false)}
                />
            )}

            {/* Create Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="New Quality Check"
                footer={<>
                    <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                    <Button onClick={handleCreate} isLoading={isSaving} icon={<Save size={16} />}>Create Check</Button>
                </>}
            >
                <div className="space-y-4">
                    <Select
                        label="Reference Type *"
                        value={formData.reference_type}
                        onChange={(e) => setFormData(p => ({ ...p, reference_type: e.target.value, reference_id: '' }))}
                        options={[
                            { value: 'production', label: 'Work Order (Completed)' },
                            { value: 'batch', label: 'Batch (Pending QC)' },
                        ]}
                    />

                    <Select
                        label="Select Reference *"
                        value={formData.reference_id}
                        onChange={(e) => setFormData(p => ({ ...p, reference_id: e.target.value }))}
                        options={references.map(r => ({ value: r.id, label: r.label }))}
                        placeholder={references.length === 0
                            ? `No ${formData.reference_type === 'production' ? 'completed work orders' : 'pending batches'} found`
                            : `Select ${formData.reference_type === 'production' ? 'Work Order' : 'Batch'}`
                        }
                    />

                    <Input
                        label="Check Date *"
                        type="date"
                        value={formData.checked_at}
                        onChange={(e) => setFormData(p => ({ ...p, checked_at: e.target.value }))}
                    />

                    <Textarea
                        label="Notes (Optional)"
                        value={formData.notes}
                        onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Optional notes about this check..."
                    />
                </div>
            </Modal>
        </div>
    )
}