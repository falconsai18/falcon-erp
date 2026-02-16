import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Download, Trash2, ClipboardCheck, CheckCircle, XCircle, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
    getQualityChecks, getQualityCheckById, createQualityCheck, deleteQualityCheck,
    getQCStats, getGRNItemsForQC, updateQualityCheckStatus, updateQualityCheckItem,
    passAllQCItems, failAllQCItems,
    type QualityCheck, type QualityCheckFormData, EMPTY_QC_FORM, QC_STATUSES, QC_ITEM_RESULTS
} from '@/services/qualityCheckService'
import { getWorkOrders } from '@/services/workOrderService'
import { getInventory } from '@/services/inventoryService'
import { exportToCSV } from '@/services/exportService'

function QCStatusBadge({ status }: { status: string }) {
    const config = QC_STATUSES.find(s => s.value === status) || QC_STATUSES[0]
    const colorMap: Record<string, any> = {
        'default': 'text-dark-400 bg-dark-200/50',
        'success': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        'danger': 'text-red-400 bg-red-500/10 border-red-500/20',
        'warning': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        'info': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        'purple': 'text-purple-400 bg-purple-500/10 border-purple-500/20'
    }
    return <Badge className={cn('font-medium', colorMap[config.color])}>{config.label}</Badge>
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

    const resolveName = (id: string | null | undefined, fallback: string | undefined) => {
        if (!id) return 'System'
        if (id === user?.id) return user.full_name || 'Me'
        if (!fallback || fallback === id || fallback === 'System' || (fallback && fallback.length > 20)) return 'Inspector'
        return fallback
    }

    const loadQC = useCallback(async () => {
        try {
            setLoading(true)
            const data = await getQualityCheckById(qcId)
            setQC(data)
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
                        <h2 className="font-semibold text-white font-mono">{(qc as any).id?.slice(0, 8)}</h2>
                        <QCStatusBadge status={qc.result} />
                    </div>
                    <p className="text-xs text-dark-500 mt-1">{formatDate(qc.checked_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onClose} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200"><X size={16} /></button>
                </div>
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
                        <p className="text-sm font-medium text-white truncate">{qc.work_order_id?.slice(0, 8) || qc.production_order_id?.slice(0, 8) || qc.batch_number || qc.batch_id?.slice(0, 8) || qc.parameter || '-'}</p>
                    </div>
                    <div className="glass-card p-3 bg-dark-200/20">
                        <p className="text-[10px] text-dark-500 uppercase tracking-wider">Inspector</p>
                        <p className="text-sm font-medium text-white truncate">{resolveName(qc.checked_by, qc.checked_by_name)}</p>
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider px-1">Checklist Items</p>
                    {(qc.items || []).map(item => (
                        <div key={item.id} className="glass-card p-4 bg-dark-200/20 space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-white">{item.parameter_name}</p>
                                    <p className="text-xs text-dark-500 italic">Spec: {item.specification}</p>
                                </div>
                                <Badge variant={item.result === 'pass' ? 'success' : item.result === 'fail' ? 'danger' : 'default'} className="uppercase text-[10px]">
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

export function QualityChecksPage() {
    const { user } = useAuthStore()
    const [checks, setChecks] = useState<QualityCheck[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const resolveName = (id: string | null | undefined, fallback: string | undefined) => {
        if (!id) return 'System'
        if (id === user?.id) return user.full_name || 'Me'
        if (!fallback || fallback === id || fallback === 'System' || (fallback && fallback.length > 20)) return 'Inspector'
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
    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState<QualityCheckFormData>(EMPTY_QC_FORM)
    const [references, setReferences] = useState<{ id: string, label: string }[]>([])

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getQualityChecks({ page, pageSize }, { status: statusFilter, search }),
                getQCStats()
            ])
            setChecks(result.data)
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
                    const res = await getWorkOrders({ page: 1, pageSize: 100 }, { status: 'completed' })
                    setReferences(res.data.map((o: any) => ({ id: o.id, label: `${o.work_order_number} (${o.product_name})` })))
                } else {
                    const res = await getInventory({ page: 1, pageSize: 100 })
                    setReferences(res.data.map((i: any) => ({ id: i.batch_number || i.id, label: `${i.batch_number} (${i.product_name})` })))
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
                items: [{ parameter_name: 'Overall', specification: 'Standard', actual_value: 0, min_value: null, max_value: null, result: 'pending', notes: '', product_id: '', batch_id: '' }]
            }, user?.id)
            toast.success('Quality check created!')
            setShowCreateModal(false)
            setFormData(EMPTY_QC_FORM)
            fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const handleExport = () => {
        const rows = checks.map(c => ({
            check_number: (c as any).id?.slice(0, 8),
            reference: c.work_order_id?.slice(0, 8) || c.production_order_id?.slice(0, 8) || c.batch_number || c.batch_id?.slice(0, 8) || c.parameter || '-',
            checked_at: formatDate(c.checked_at),
            result: c.result === 'pass' ? 'Pass' : c.result === 'fail' ? 'Fail' : 'Pending',
            checked_by: resolveName(c.checked_by, c.checked_by_name)
        }))
        exportToCSV(rows, [
            { key: 'check_number', label: 'QC #' },
            { key: 'reference', label: 'Reference' },
            { key: 'checked_at', label: 'Date' },
            { key: 'result', label: 'Result' },
            { key: 'checked_by', label: 'Checked By' }
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
                        <Button icon={<Plus size={16} />} onClick={() => setShowCreateModal(true)}>New QC Check</Button>
                    </div>
                }
            />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: stats.total, color: 'text-blue-400' },
                    { label: 'Pending', value: stats.pending, color: 'text-dark-500' },
                    { label: 'Passed', value: stats.passed, color: 'text-emerald-400' },
                    { label: 'Failed', value: stats.failed, color: 'text-red-400' }
                ].map(k => (
                    <div key={k.label} className="glass-card p-3">
                        <p className="text-[10px] text-dark-500 uppercase">{k.label}</p>
                        <p className={cn('text-lg font-bold mt-0.5', k.color)}>{k.value}</p>
                    </div>
                ))}
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
                        <EmptyState icon={<ClipboardCheck size={48} />} title="No quality checks" description="Create a quality check for GRN or production batches" />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-dark-300/50">
                                        {['QC #', 'Reference', 'Type', 'Date', 'Result', 'Checked By'].map(h => (
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
                                                <p className="text-sm font-medium text-brand-400 font-mono">{(check as any).id?.slice(0, 8)}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm text-white truncate max-w-[150px]">{check.work_order_id || check.batch_number || '-'}</p>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-dark-500 capitalize">{check.work_order_id ? 'Work Order' : 'Batch'}</td>
                                            <td className="px-3 py-3 text-sm text-dark-500">{formatDate(check.checked_at)}</td>
                                            <td className="px-3 py-3"><QCStatusBadge status={check.result} /></td>
                                            <td className="px-3 py-3 text-sm text-dark-500">{resolveName(check.checked_by, check.checked_by_name)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                            { value: 'production', label: 'Production Order' },
                            { value: 'batch', label: 'Inventory Batch' },
                        ]}
                    />

                    <Select
                        label="Select Reference *"
                        value={formData.reference_id}
                        onChange={(e) => setFormData(p => ({ ...p, reference_id: e.target.value }))}
                        options={references.map(r => ({ value: r.id, label: r.label }))}
                        placeholder={`Select ${formData.reference_type === 'production' ? 'Order' : 'Batch'}`}
                    />

                    <Input
                        label="Check Date *"
                        type="date"
                        value={formData.checked_at}
                        onChange={(e) => setFormData(p => ({ ...p, checked_at: e.target.value }))}
                    />

                    <Textarea
                        label="Initial Notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Optional notes about this check..."
                    />
                </div>
            </Modal>
        </div>
    )
}
