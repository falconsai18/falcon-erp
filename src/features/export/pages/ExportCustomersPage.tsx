import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Edit2, Trash2, Globe } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { CountryFlag } from '../components/CountryFlag'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import {
    getExportCustomers,
    getExportCustomerById,
    createExportCustomer,
    updateExportCustomer,
    deleteExportCustomer,
} from '../services/exportService'
import type { ExportCustomer, ExportCustomerFormData } from '../types/export.types'
import { INCOTERMS } from '../types/export.types'

const EMPTY_FORM: ExportCustomerFormData = {
    customer_code: '',
    company_name: '',
    country: '',
    address_line1: '',
    address_line2: null,
    city: '',
    state: null,
    postal_code: '',
    contact_person: '',
    email: '',
    phone: '',
    website: null,
    gst_number: null,
    tax_id: null,
    payment_terms: '',
    incoterm: 'FOB',
    is_active: true,
    notes: null,
}

export function ExportCustomersPage() {
    const [customers, setCustomers] = useState<ExportCustomer[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [activeOnly, setActiveOnly] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<ExportCustomer | null>(null)
    const [formData, setFormData] = useState<ExportCustomerFormData>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [deletingCustomer, setDeletingCustomer] = useState<ExportCustomer | null>(null)
    const [deleting, setDeleting] = useState(false)

    const loadCustomers = useCallback(async () => {
        try {
            setLoading(true)
            const data = await getExportCustomers({
                search: search || undefined,
                is_active: activeOnly ? true : undefined,
            })
            setCustomers(data)
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to load customers')
        } finally {
            setLoading(false)
        }
    }, [search, activeOnly])

    useEffect(() => {
        loadCustomers()
    }, [loadCustomers])

    const handleAdd = () => {
        setEditingCustomer(null)
        setFormData(EMPTY_FORM)
        setModalOpen(true)
    }

    const handleEdit = (c: ExportCustomer) => {
        setEditingCustomer(c)
        setFormData({
            customer_code: c.customer_code,
            company_name: c.company_name,
            country: c.country,
            address_line1: c.address_line1,
            address_line2: c.address_line2,
            city: c.city,
            state: c.state,
            postal_code: c.postal_code,
            contact_person: c.contact_person,
            email: c.email,
            phone: c.phone,
            website: c.website,
            gst_number: c.gst_number,
            tax_id: c.tax_id,
            payment_terms: c.payment_terms,
            incoterm: c.incoterm,
            is_active: c.is_active,
            notes: c.notes,
        })
        setModalOpen(true)
    }

    const handleSave = async () => {
        if (!formData.company_name.trim()) {
            toast.error('Company name is required')
            return
        }
        try {
            setSaving(true)
            if (editingCustomer) {
                await updateExportCustomer(editingCustomer.id, formData)
                toast.success('Customer updated')
            } else {
                await createExportCustomer(formData)
                toast.success('Customer created')
            }
            setModalOpen(false)
            loadCustomers()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingCustomer) return
        try {
            setDeleting(true)
            await deleteExportCustomer(deletingCustomer.id)
            toast.success('Customer deactivated')
            setDeleteModalOpen(false)
            setDeletingCustomer(null)
            loadCustomers()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete')
        } finally {
            setDeleting(false)
        }
    }

    const updateForm = (field: keyof ExportCustomerFormData, value: unknown) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const incotermOptions = INCOTERMS.map((i) => ({ value: i.value, label: i.value }))

    return (
        <div className="space-y-6">
            <PageHeader
                title="Export Customers"
                description={`${customers.length} international buyers`}
                actions={
                    <Button icon={<Plus size={16} />} onClick={handleAdd}>
                        Add Customer
                    </Button>
                }
            />

            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 max-w-md">
                    <Input
                        placeholder="Search by company, contact, email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={<Search size={16} />}
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveOnly(true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeOnly ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-200'}`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setActiveOnly(false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!activeOnly ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-200'}`}
                    >
                        All
                    </button>
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
            ) : customers.length === 0 ? (
                <EmptyState
                    icon={<Globe size={48} />}
                    title="No export customers yet"
                    description="Add your first international buyer"
                    actionLabel="Add Customer"
                    onAction={handleAdd}
                />
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-dark-300">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Code</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Company</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Country</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Contact</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Email</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Payment Terms</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Incoterm</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((c) => (
                                <tr
                                    key={c.id}
                                    className="border-t border-gray-200 dark:border-dark-300 hover:bg-gray-50 dark:hover:bg-dark-200/30 cursor-pointer"
                                    onClick={() => handleEdit(c)}
                                >
                                    <td className="px-4 py-3 font-mono text-sm">{c.customer_code}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.company_name}</td>
                                    <td className="px-4 py-3">
                                        <CountryFlag country={c.country} className="mr-1" />
                                        {c.country}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-dark-500">{c.contact_person}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-dark-500">{c.email}</td>
                                    <td className="px-4 py-3 text-sm">{c.payment_terms}</td>
                                    <td className="px-4 py-3 text-sm">{c.incoterm}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant={c.is_active ? 'success' : 'default'}>
                                            {c.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEdit(c)}
                                                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-dark-200"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            {c.is_active && (
                                                <button
                                                    onClick={() => {
                                                        setDeletingCustomer(c)
                                                        setDeleteModalOpen(true)
                                                    }}
                                                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-dark-200"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
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
                title={editingCustomer ? 'Edit Customer' : 'Add Export Customer'}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} isLoading={saving}>Save</Button>
                    </>
                }
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Customer Code" value={formData.customer_code} onChange={(e) => updateForm('customer_code', e.target.value)} />
                    <Input label="Company Name *" value={formData.company_name} onChange={(e) => updateForm('company_name', e.target.value)} />
                    <Input label="Country" value={formData.country} onChange={(e) => updateForm('country', e.target.value)} />
                    <Input label="Address Line 1" value={formData.address_line1} onChange={(e) => updateForm('address_line1', e.target.value)} />
                    <Input label="Address Line 2" value={formData.address_line2 || ''} onChange={(e) => updateForm('address_line2', e.target.value || null)} />
                    <Input label="City" value={formData.city} onChange={(e) => updateForm('city', e.target.value)} />
                    <Input label="State" value={formData.state || ''} onChange={(e) => updateForm('state', e.target.value || null)} />
                    <Input label="Postal Code" value={formData.postal_code} onChange={(e) => updateForm('postal_code', e.target.value)} />
                    <Input label="Contact Person" value={formData.contact_person} onChange={(e) => updateForm('contact_person', e.target.value)} />
                    <Input label="Email" type="email" value={formData.email} onChange={(e) => updateForm('email', e.target.value)} />
                    <Input label="Phone" value={formData.phone} onChange={(e) => updateForm('phone', e.target.value)} />
                    <Input label="Website" value={formData.website || ''} onChange={(e) => updateForm('website', e.target.value || null)} />
                    <Input label="GST Number" value={formData.gst_number || ''} onChange={(e) => updateForm('gst_number', e.target.value || null)} />
                    <Input label="Tax ID" value={formData.tax_id || ''} onChange={(e) => updateForm('tax_id', e.target.value || null)} />
                    <Input label="Payment Terms" value={formData.payment_terms} onChange={(e) => updateForm('payment_terms', e.target.value)} />
                    <Select label="Incoterm" value={formData.incoterm} onChange={(e) => updateForm('incoterm', e.target.value)} options={incotermOptions} />
                    {editingCustomer && (
                        <div className="md:col-span-2 flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => updateForm('is_active', e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">Active</label>
                        </div>
                    )}
                    <div className="md:col-span-2">
                        <Textarea label="Notes" value={formData.notes || ''} onChange={(e) => updateForm('notes', e.target.value || null)} rows={2} />
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setDeletingCustomer(null) }}
                title="Deactivate Customer"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => { setDeleteModalOpen(false); setDeletingCustomer(null) }}>Cancel</Button>
                        <Button variant="danger" onClick={handleDelete} isLoading={deleting}>Deactivate</Button>
                    </>
                }
            >
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Deactivate <strong>{deletingCustomer?.company_name}</strong>? They will no longer appear in active customer lists.
                </p>
            </Modal>
        </div>
    )
}
