import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Search, Download, Trash2, X, Save, ChevronLeft, ChevronRight,
    FlaskConical, Check, RotateCcw, Calendar, Beaker,
    ArrowRight, AlertCircle, ListOrdered, Thermometer, Droplets,
    Package, CheckCircle, List, Edit2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
    getFormulations, getFormulationById, createFormulation, updateFormulation, deleteFormulation,
    updateFormulationStatus, getFormulationStats,
    getFormulationIngredients, addIngredient, updateIngredient, deleteIngredient,
    getFormulationSteps, addStep, updateStep, deleteStep,
    getRawMaterialsForDropdown, getProductsForDropdown,
    type Formulation, type FormulationIngredient, type FormulationProcessStep,
    type FormulationFormData, type IngredientFormData, type StepFormData,
    EMPTY_FORM, EMPTY_INGREDIENT_FORM, EMPTY_STEP_FORM,
} from '@/services/formulationService'
import { exportToCSV } from '@/services/exportService'

// ============ STATUS BADGE ============
function FormulationStatusBadge({ status }: { status: string }) {
    const config: Record<string, { variant: any; label: string }> = {
        draft: { variant: 'default', label: 'Draft' },
        approved: { variant: 'success', label: 'Approved' },
        obsolete: { variant: 'danger', label: 'Obsolete' },
    }
    const c = config[status] || config.draft
    return <Badge variant={c.variant}>{c.label}</Badge>
}

// ============ FORMULATION DETAIL PANEL ============
function FormulationDetail({ formulationId, onClose, onRefresh }: {
    formulationId: string; onClose: () => void; onRefresh: () => void
}) {
    const { user } = useAuthStore()
    const [formulation, setFormulation] = useState<Formulation | null>(null)
    const [ingredients, setIngredients] = useState<FormulationIngredient[]>([])
    const [steps, setSteps] = useState<FormulationProcessStep[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [activeTab, setActiveTab] = useState<'ingredients' | 'steps'>('ingredients')

    // Ingredient form
    const [showIngredientForm, setShowIngredientForm] = useState(false)
    const [editingIngredient, setEditingIngredient] = useState<FormulationIngredient | null>(null)
    const [ingredientForm, setIngredientForm] = useState<IngredientFormData>(EMPTY_INGREDIENT_FORM)
    const [rawMaterials, setRawMaterials] = useState<{ id: string; name: string; code: string }[]>([])

    // Step form
    const [showStepForm, setShowStepForm] = useState(false)
    const [editingStep, setEditingStep] = useState<FormulationProcessStep | null>(null)
    const [stepForm, setStepForm] = useState<StepFormData>(EMPTY_STEP_FORM)

    useEffect(() => { loadData(); loadRawMaterials() }, [formulationId])

    const loadData = async () => {
        try {
            setLoading(true)
            const [formData, ingData, stepData] = await Promise.all([
                getFormulationById(formulationId),
                getFormulationIngredients(formulationId),
                getFormulationSteps(formulationId),
            ])
            setFormulation(formData)
            setIngredients(ingData)
            setSteps(stepData)
        } catch (err: any) { toast.error(err.message) }
        finally { setLoading(false) }
    }

    const loadRawMaterials = async () => {
        try {
            const materials = await getRawMaterialsForDropdown()
            setRawMaterials(materials)
        } catch (err: any) { toast.error(err.message) }
    }

    const handleApprove = async () => {
        try {
            setUpdating(true)
            await updateFormulationStatus(formulationId, 'approved', user?.id)
            toast.success('Formulation approved!')
            loadData(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handleStatusChange = async (status: 'draft' | 'approved' | 'obsolete') => {
        try {
            setUpdating(true)
            await updateFormulationStatus(formulationId, status, user?.id)
            toast.success(`Formulation ${status} !`)
            loadData(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    // Ingredient handlers
    const handleSaveIngredient = async () => {
        if (!ingredientForm.raw_material_id) { toast.error('Select raw material'); return }
        if (ingredientForm.quantity <= 0) { toast.error('Enter valid quantity'); return }

        try {
            setUpdating(true)
            if (editingIngredient) {
                await updateIngredient(editingIngredient.id, ingredientForm)
                toast.success('Ingredient updated!')
            } else {
                await addIngredient(formulationId, ingredientForm)
                toast.success('Ingredient added!')
            }
            setShowIngredientForm(false)
            setEditingIngredient(null)
            setIngredientForm(EMPTY_INGREDIENT_FORM)
            loadData(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handleDeleteIngredient = async (ingredientId: string) => {
        if (!confirm('Delete this ingredient?')) return
        try {
            setUpdating(true)
            await deleteIngredient(ingredientId)
            toast.success('Deleted!')
            loadData(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    // Step handlers
    const handleSaveStep = async () => {
        if (!stepForm.title.trim()) { toast.error('Enter step title'); return }

        try {
            setUpdating(true)
            if (editingStep) {
                await updateStep(editingStep.id, stepForm)
                toast.success('Step updated!')
            } else {
                await addStep(formulationId, stepForm)
                toast.success('Step added!')
            }
            setShowStepForm(false)
            setEditingStep(null)
            setStepForm({ ...EMPTY_STEP_FORM, step_number: steps.length + 1 })
            loadData(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    const handleDeleteStep = async (stepId: string) => {
        if (!confirm('Delete this step?')) return
        try {
            setUpdating(true)
            await deleteStep(stepId)
            toast.success('Deleted!')
            loadData(); onRefresh()
        } catch (err: any) { toast.error(err.message) }
        finally { setUpdating(false) }
    }

    if (loading) return (
        <div className="glass-card p-8"><div className="animate-pulse space-y-4">
            <div className="h-6 bg-dark-200 rounded w-1/3" />
            <div className="h-32 bg-dark-200 rounded" />
        </div></div>
    )

    if (!formulation) return null

    return (
        <div className="glass-card h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-300/50">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-gray-900 dark:text-white">{formulation.formulation_number}</h2>
                        <FormulationStatusBadge status={formulation.status} />
                    </div>
                    <p className="text-xs text-dark-500 mt-1">{formulation.name}</p>
                </div>
                <div className="flex items-center gap-2">
                    {formulation.status === 'draft' && (
                        <Button size="sm" variant="success" onClick={handleApprove} isLoading={updating} icon={<Check size={14} />}>Approve</Button>
                    )}
                    {formulation.status !== 'obsolete' && (
                        <Button size="sm" variant="danger" onClick={() => handleStatusChange('obsolete')} isLoading={updating}>Obsolete</Button>
                    )}
                    {formulation.status === 'obsolete' && (
                        <Button size="sm" variant="secondary" onClick={() => handleStatusChange('draft')} isLoading={updating} icon={<RotateCcw size={14} />}>Restore</Button>
                    )}
                    <button title="Close" onClick={onClose} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200"><X size={16} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Approved Badge */}
                {formulation.status === 'approved' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                        <CheckCircle size={20} className="text-emerald-400" />
                        <div>
                            <p className="text-sm font-medium text-emerald-400">Approved Formulation</p>
                            <p className="text-xs text-dark-500">Version {formulation.version}</p>
                        </div>
                    </div>
                )}

                {/* Product Info */}
                <div className="bg-dark-200/20 rounded-xl p-4">
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-2">Product</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formulation.product_name}</p>
                    <p className="text-xs text-dark-500">{formulation.product_sku}</p>
                </div>

                {/* Yield Info */}
                {(formulation.yield_quantity || formulation.yield_unit) && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-dark-200/20 rounded-xl p-4">
                            <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1">Yield Quantity</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{formulation.yield_quantity} {formulation.yield_unit}</p>
                        </div>
                        <div className="bg-dark-200/20 rounded-xl p-4">
                            <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1">Ingredients</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{ingredients.length}</p>
                        </div>
                    </div>
                )}

                {/* Description */}
                {formulation.description && (
                    <div className="bg-dark-200/20 rounded-xl p-4">
                        <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1">Description</p>
                        <p className="text-sm text-dark-500">{formulation.description}</p>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex items-center gap-2 border-b border-gray-200 dark:border-dark-300/30">
                    <button
                        onClick={() => setActiveTab('ingredients')}
                        className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                            activeTab === 'ingredients' ? 'border-brand-500 text-brand-400' : 'border-transparent text-gray-500 dark:text-dark-500 hover:text-white')}
                    >
                        Ingredients ({ingredients.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('steps')}
                        className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                            activeTab === 'steps' ? 'border-brand-500 text-brand-400' : 'border-transparent text-gray-500 dark:text-dark-500 hover:text-white')}
                    >
                        Process Steps ({steps.length})
                    </button>
                </div>

                {/* Ingredients Tab */}
                {activeTab === 'ingredients' && (
                    <div className="space-y-4">
                        {formulation.status === 'draft' && (
                            <Button size="sm" onClick={() => { setShowIngredientForm(true); setEditingIngredient(null); setIngredientForm(EMPTY_INGREDIENT_FORM) }} icon={<Plus size={14} />}>Add Ingredient</Button>
                        )}

                        {showIngredientForm && (
                            <div className="bg-dark-200/30 rounded-lg p-4 space-y-3">
                                <Select
                                    label="Raw Material *"
                                    value={ingredientForm.raw_material_id}
                                    onChange={(e) => setIngredientForm(p => ({ ...p, raw_material_id: e.target.value }))}
                                    options={rawMaterials.map(m => ({ value: m.id, label: `${m.name} (${m.code})` }))}
                                />
                                <div className="grid grid-cols-3 gap-3">
                                    <Input label="Quantity *" type="number" value={ingredientForm.quantity} onChange={(e) => setIngredientForm(p => ({ ...p, quantity: Number(e.target.value) }))} />
                                    <Input label="Unit" value={ingredientForm.unit} onChange={(e) => setIngredientForm(p => ({ ...p, unit: e.target.value }))} />
                                    <Input label="Percentage %" type="number" value={ingredientForm.percentage} onChange={(e) => setIngredientForm(p => ({ ...p, percentage: Number(e.target.value) }))} />
                                </div>
                                <Input label="Sequence" type="number" value={ingredientForm.sequence_order} onChange={(e) => setIngredientForm(p => ({ ...p, sequence_order: Number(e.target.value) }))} />
                                <Textarea label="Notes" value={ingredientForm.notes} onChange={(e) => setIngredientForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={handleSaveIngredient} isLoading={updating} icon={<Save size={14} />}>Save</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setShowIngredientForm(false)}>Cancel</Button>
                                </div>
                            </div>
                        )}

                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500 dark:text-dark-500 border-b border-gray-200 dark:border-dark-300/30">
                                <tr>
                                    <th className="text-left py-2">Material</th>
                                    <th className="text-center py-2">Qty</th>
                                    <th className="text-center py-2">%</th>
                                    <th className="text-right py-2"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-300/30">
                                {ingredients.map(item => (
                                    <tr key={item.id}>
                                        <td className="py-2">
                                            <p className="text-white">{item.material_name}</p>
                                            <p className="text-xs text-dark-500">{item.material_code}</p>
                                        </td>
                                        <td className="py-2 text-center text-dark-500">{item.quantity} {item.unit}</td>
                                        <td className="py-2 text-center text-dark-500">{item.percentage || '-'}</td>
                                        <td className="py-2 text-right">
                                            {formulation.status === 'draft' && (
                                                <div className="flex items-center justify-end gap-1">
                                                    <button title="Edit" onClick={() => { setEditingIngredient(item); setIngredientForm({ raw_material_id: item.raw_material_id, quantity: item.quantity, unit: item.unit, percentage: item.percentage || 0, sequence_order: item.sequence_order, notes: item.notes || '' }); setShowIngredientForm(true) }} className="p-1 text-dark-500 hover:text-white"><Edit2 size={14} /></button>
                                                    <button title="Delete" onClick={() => handleDeleteIngredient(item.id)} className="p-1 text-dark-500 hover:text-red-400"><Trash2 size={14} /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Steps Tab */}
                {activeTab === 'steps' && (
                    <div className="space-y-4">
                        {formulation.status === 'draft' && (
                            <Button size="sm" onClick={() => { setShowStepForm(true); setEditingStep(null); setStepForm({ ...EMPTY_STEP_FORM, step_number: steps.length + 1 }) }} icon={<Plus size={14} />}>Add Step</Button>
                        )}

                        {showStepForm && (
                            <div className="bg-dark-200/30 rounded-lg p-4 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <Input label="Step # *" type="number" value={stepForm.step_number} onChange={(e) => setStepForm(p => ({ ...p, step_number: Number(e.target.value) }))} />
                                    <Input label="Title *" value={stepForm.title} onChange={(e) => setStepForm(p => ({ ...p, title: e.target.value }))} />
                                </div>
                                <Textarea label="Description" value={stepForm.description} onChange={(e) => setStepForm(p => ({ ...p, description: e.target.value }))} rows={2} />
                                <Input label="Duration (minutes)" type="number" value={stepForm.duration_minutes} onChange={(e) => setStepForm(p => ({ ...p, duration_minutes: Number(e.target.value) }))} />
                                <div className="grid grid-cols-2 gap-3">
                                    <Input label="Temp Min (°C)" type="number" value={stepForm.temperature_min} onChange={(e) => setStepForm(p => ({ ...p, temperature_min: Number(e.target.value) }))} />
                                    <Input label="Temp Max (°C)" type="number" value={stepForm.temperature_max} onChange={(e) => setStepForm(p => ({ ...p, temperature_max: Number(e.target.value) }))} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Input label="Humidity Min (%)" type="number" value={stepForm.humidity_min} onChange={(e) => setStepForm(p => ({ ...p, humidity_min: Number(e.target.value) }))} />
                                    <Input label="Humidity Max (%)" type="number" value={stepForm.humidity_max} onChange={(e) => setStepForm(p => ({ ...p, humidity_max: Number(e.target.value) }))} />
                                </div>
                                <Input label="Equipment Needed" value={stepForm.equipment_needed} onChange={(e) => setStepForm(p => ({ ...p, equipment_needed: e.target.value }))} />
                                <Textarea label="Safety Notes" value={stepForm.safety_notes} onChange={(e) => setStepForm(p => ({ ...p, safety_notes: e.target.value }))} rows={2} />
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={handleSaveStep} isLoading={updating} icon={<Save size={14} />}>Save</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setShowStepForm(false)}>Cancel</Button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {steps.map(step => (
                                <div key={step.id} className="bg-dark-200/20 rounded-lg p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-bold text-brand-400">Step {step.step_number}</span>
                                                <span className="text-sm font-medium text-white">{step.title}</span>
                                            </div>
                                            {step.description && <p className="text-xs text-dark-500 mb-2">{step.description}</p>}
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                {step.duration_minutes && <span className="text-dark-500">⏱ {step.duration_minutes} min</span>}
                                                {(step.temperature_min || step.temperature_max) && <span className="text-dark-500">🌡 {step.temperature_min}°-{step.temperature_max}°C</span>}
                                                {(step.humidity_min || step.humidity_max) && <span className="text-dark-500">💧 {step.humidity_min}%-{step.humidity_max}%</span>}
                                            </div>
                                            {step.equipment_needed && <p className="text-xs text-dark-500 mt-1">⚙ {step.equipment_needed}</p>}
                                            {step.safety_notes && <p className="text-xs text-amber-400 mt-1">⚠ {step.safety_notes}</p>}
                                        </div>
                                        {formulation.status === 'draft' && (
                                            <div className="flex items-center gap-1 ml-2">
                                                <button title="Edit" onClick={() => { setEditingStep(step); setStepForm({ step_number: step.step_number, title: step.title, description: step.description || '', duration_minutes: step.duration_minutes || 0, temperature_min: step.temperature_min || 0, temperature_max: step.temperature_max || 0, humidity_min: step.humidity_min || 0, humidity_max: step.humidity_max || 0, equipment_needed: step.equipment_needed || '', safety_notes: step.safety_notes || '' }); setShowStepForm(true) }} className="p-1 text-dark-500 hover:text-white"><Edit2 size={14} /></button>
                                                <button title="Delete" onClick={() => handleDeleteStep(step.id)} className="p-1 text-dark-500 hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ============ MAIN PAGE ============
export function FormulationsPage() {
    const { user } = useAuthStore()
    const [formulations, setFormulations] = useState<Formulation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 20

    // Modals
    const [showModal, setShowModal] = useState(false)
    const [selectedFormulationId, setSelectedFormulationId] = useState<string | null>(null)
    const [deletingFormulation, setDeletingFormulation] = useState<Formulation | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [formData, setFormData] = useState<FormulationFormData>(EMPTY_FORM)
    const [isSaving, setIsSaving] = useState(false)
    const [stats, setStats] = useState({ total: 0, draft: 0, approved: 0, obsolete: 0 })
    const [products, setProducts] = useState<{ id: string; name: string; sku: string }[]>([])

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getFormulations({ page, pageSize }, { status: statusFilter, search }),
                getFormulationStats(),
            ])
            setFormulations(result.data)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
        } catch (err: any) { toast.error(err.message) }
        finally { setIsLoading(false) }
    }, [page, statusFilter, search])

    const loadProducts = async () => {
        try {
            const prods = await getProductsForDropdown()
            setProducts(prods)
        } catch (err: any) { toast.error(err.message) }
    }

    useEffect(() => { fetchData(); loadProducts() }, [fetchData])
    useEffect(() => { const t = setTimeout(() => { setPage(1); fetchData() }, 300); return () => clearTimeout(t) }, [search])

    const handleSave = async () => {
        if (!formData.name.trim()) { toast.error('Enter formulation name'); return }
        if (!formData.product_id) { toast.error('Select product'); return }

        try {
            setIsSaving(true)
            await createFormulation(formData, user?.id)
            toast.success('Formulation created!')
            setShowModal(false); setFormData(EMPTY_FORM); fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const handleDelete = async () => {
        if (!deletingFormulation) return
        try {
            setIsDeleting(true)
            await deleteFormulation(deletingFormulation.id)
            toast.success('Deleted!')
            setDeletingFormulation(null)
            if (selectedFormulationId === deletingFormulation.id) setSelectedFormulationId(null)
            fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsDeleting(false) }
    }

    const handleExport = () => {
        const rows = formulations.map(f => ({
            formulation_number: f.formulation_number,
            name: f.name,
            product: f.product_name,
            version: f.version,
            ingredients: f.ingredient_count,
            steps: f.step_count,
            status: f.status,
            created_at: formatDate(f.created_at),
        }))
        exportToCSV(rows, [
            { key: 'formulation_number', label: 'FM Number' },
            { key: 'name', label: 'Name' },
            { key: 'product', label: 'Product' },
            { key: 'version', label: 'Version' },
            { key: 'ingredients', label: 'Ingredients' },
            { key: 'steps', label: 'Steps' },
            { key: 'status', label: 'Status' },
            { key: 'created_at', label: 'Created' },
        ], 'formulations')
        toast.success('Formulations exported!')
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Formulations"
                description={`${stats.total} formulations • ${stats.approved} approved`}
                actions={<div className="flex items-center gap-3">
                    <Button variant="secondary" icon={<Download size={16} />} size="sm" onClick={handleExport}>Export CSV</Button>
                    <Button icon={<Plus size={16} />} onClick={() => { setFormData(EMPTY_FORM); setShowModal(true) }}>New Formulation</Button>
                </div>} />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: stats.total, color: 'text-blue-400' },
                    { label: 'Draft', value: stats.draft, color: 'text-dark-500' },
                    { label: 'Approved', value: stats.approved, color: 'text-emerald-400' },
                    { label: 'Obsolete', value: stats.obsolete, color: 'text-red-400' },
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
                    <Input placeholder="Search formulation..." value={search}
                        onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
                </div>
                <div className="flex items-center gap-2">
                    {['all', 'draft', 'approved', 'obsolete'].map(s => (
                        <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                statusFilter === s ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Split View */}
            <div className={cn('flex gap-6', selectedFormulationId ? 'items-start' : '')}>
                <div className={cn('transition-all duration-300', selectedFormulationId ? 'w-1/2' : 'w-full')}>
                    {isLoading ? (
                        <div className="glass-card p-8"><div className="animate-pulse space-y-3">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-dark-200 rounded-lg" />)}
                        </div></div>
                    ) : formulations.length === 0 ? (
                        <EmptyState icon={<FlaskConical size={48} />} title="No formulations"
                            description="Create formulations to define medicine recipes" actionLabel="New Formulation"
                            onAction={() => { setFormData(EMPTY_FORM); setShowModal(true) }} />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead><tr className="border-b border-dark-300/50">
                                    {['FM #', 'Name', 'Product', 'Version', 'Ingredients', 'Steps', 'Status', 'Date', ''].map(h => (
                                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-dark-300/30">
                                    {formulations.map(formulation => (
                                        <tr key={formulation.id} onClick={() => setSelectedFormulationId(formulation.id)}
                                            className={cn('hover:bg-gray-100/30 dark:hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                selectedFormulationId === formulation.id && 'bg-brand-500/5 border-l-2 border-brand-500')}>
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-medium text-brand-400 font-mono">{formulation.formulation_number}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm text-gray-900 dark:text-white">{formulation.name}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm text-gray-500 dark:text-dark-500">{formulation.product_name}</p>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-gray-500 dark:text-dark-500">v{formulation.version}</td>
                                            <td className="px-3 py-3 text-sm text-gray-500 dark:text-dark-500">{formulation.ingredient_count}</td>
                                            <td className="px-3 py-3 text-sm text-gray-500 dark:text-dark-500">{formulation.step_count}</td>
                                            <td className="px-3 py-3"><FormulationStatusBadge status={formulation.status} /></td>
                                            <td className="px-3 py-3 text-sm text-dark-500">{formatDate(formulation.created_at)}</td>
                                            <td className="px-3 py-3">
                                                {formulation.status === 'draft' && (
                                                    <button onClick={(e) => { e.stopPropagation(); setDeletingFormulation(formulation) }}
                                                        className="p-1.5 rounded-lg text-gray-500 dark:text-dark-500 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-dark-200" title="Delete"><Trash2 size={14} /></button>
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

                {selectedFormulationId && (
                    <div className="w-1/2 sticky top-20">
                        <FormulationDetail formulationId={selectedFormulationId}
                            onClose={() => setSelectedFormulationId(null)}
                            onRefresh={fetchData} />
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)}
                title="New Formulation"
                footer={<div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button onClick={handleSave} isLoading={isSaving} icon={<Save size={16} />}>Create</Button>
                </div>}>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <Input label="Name *" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Enter formulation name" />
                    <Select label="Product *" value={formData.product_id} onChange={(e) => setFormData(p => ({ ...p, product_id: e.target.value }))} options={products.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }))} placeholder="Select product" />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Yield Quantity" type="number" value={formData.yield_quantity} onChange={(e) => setFormData(p => ({ ...p, yield_quantity: Number(e.target.value) }))} />
                        <Input label="Yield Unit" value={formData.yield_unit} onChange={(e) => setFormData(p => ({ ...p, yield_unit: e.target.value }))} placeholder="kg, liters, etc." />
                    </div>
                    <Textarea label="Description" value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Describe the formulation..." rows={3} />
                </div>
            </Modal>

            {/* Delete Modal */}
            {deletingFormulation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeletingFormulation(null)}>
                    <div className="glass-card p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-2">Delete Formulation?</h3>
                        <p className="text-sm text-dark-500 mb-4">
                            Delete {deletingFormulation.formulation_number}? This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setDeletingFormulation(null)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
