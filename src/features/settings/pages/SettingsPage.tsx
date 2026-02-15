import { useState, useEffect } from 'react'
import {
    Building2, User, Key, Database, FileText, Hash,
    Save, Shield, Globe, IndianRupee,
    CheckCircle2, AlertCircle, RefreshCw, Landmark,
    Package, Users, Truck, ShoppingCart, Receipt, Factory,
    Warehouse as WarehouseIcon, CreditCard, FileQuestion,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
    getCompanyInfo, updateCompanyInfo,
    getAllSettings, updateSetting,
    getNumberSequences, updateNumberSequence,
    getBankAccounts, updateBankAccount,
    getCurrentUser, updateUserProfile, changePassword,
    getSystemStats,
    type CompanyInfo, type SettingRow, type NumberSequence, type BankAccount,
} from '@/services/settingsService'

type SettingsTab = 'company' | 'profile' | 'numbering' | 'system'

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry',
    'Chandigarh', 'Dadra & Nagar Haveli', 'Lakshadweep',
]

const ENTITY_LABELS: Record<string, string> = {
    sales_order: 'Sales Order',
    invoice: 'Invoice',
    purchase_order: 'Purchase Order',
    payment: 'Payment',
    production_order: 'Production Order',
    quotation: 'Quotation',
    grn: 'Goods Receipt Note',
    credit_note: 'Credit Note',
    debit_note: 'Debit Note',
    challan: 'Delivery Challan',
}

const ENTITY_ICONS: Record<string, any> = {
    sales_order: ShoppingCart,
    invoice: Receipt,
    purchase_order: Truck,
    payment: CreditCard,
    production_order: Factory,
    quotation: FileQuestion,
    grn: Package,
    credit_note: FileText,
    debit_note: FileText,
    challan: Truck,
}

function InputField({ label, value, onChange, type = 'text', placeholder, required, disabled, className }: {
    label: string; value: string | number; onChange: (v: string) => void;
    type?: string; placeholder?: string; required?: boolean; disabled?: boolean; className?: string
}) {
    return (
        <div className={className}>
            <label className="block text-xs font-medium text-dark-500 mb-1.5">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            <input
                type={type}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full px-3 py-2 bg-dark-200/50 border border-dark-300/50 rounded-lg text-white text-sm
          placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20
          disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
        </div>
    )
}

function SelectField({ label, value, onChange, options, className }: {
    label: string; value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[]; className?: string
}) {
    return (
        <div className={className}>
            <label className="block text-xs font-medium text-dark-500 mb-1.5">{label}</label>
            <select
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 bg-dark-200/50 border border-dark-300/50 rounded-lg text-white text-sm
          focus:outline-none focus:border-brand-500/50 appearance-none cursor-pointer transition-all"
            >
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    )
}

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('company')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Data states
    const [company, setCompany] = useState<CompanyInfo | null>(null)
    const [settings, setSettings] = useState<SettingRow[]>([])
    const [sequences, setSequences] = useState<NumberSequence[]>([])
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
    const [profile, setProfile] = useState<any>(null)
    const [stats, setStats] = useState<Record<string, number>>({})
    const [passwords, setPasswords] = useState({ new: '', confirm: '' })
    const [hasCompanyChanges, setHasCompanyChanges] = useState(false)
    const [hasSequenceChanges, setHasSequenceChanges] = useState<Set<string>>(new Set())
    const [hasBankChanges, setHasBankChanges] = useState(false)

    useEffect(() => { loadAll() }, [])

    const loadAll = async () => {
        try {
            setLoading(true)
            const [companyData, settingsData, seqData, bankData, userData, statsData] = await Promise.all([
                getCompanyInfo(),
                getAllSettings(),
                getNumberSequences(),
                getBankAccounts(),
                getCurrentUser(),
                getSystemStats(),
            ])
            setCompany(companyData)
            setSettings(settingsData)
            setSequences(seqData)
            setBankAccounts(bankData)
            setProfile(userData)
            setStats(statsData)
        } catch (err: any) {
            toast.error('Failed to load settings: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // ---- Company handlers ----
    const updateCompanyField = (field: keyof CompanyInfo, value: string) => {
        if (!company) return
        setCompany({ ...company, [field]: value })
        setHasCompanyChanges(true)
    }

    const saveCompany = async () => {
        if (!company) return
        try {
            setSaving(true)
            await updateCompanyInfo(company.id, company)
            setHasCompanyChanges(false)
            toast.success('Company details saved!')
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    // ---- Settings handlers ----
    const updateSettingValue = async (setting: SettingRow, newValue: string) => {
        try {
            await updateSetting(setting.id, newValue)
            setSettings(prev => prev.map(s => s.id === setting.id ? { ...s, value: newValue } : s))
            toast.success(`${setting.key} updated!`)
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    // ---- Sequence handlers ----
    const updateSequenceField = (id: string, field: 'prefix' | 'current_number' | 'padding', value: string | number) => {
        setSequences(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
        setHasSequenceChanges(prev => new Set(prev).add(id))
    }

    const saveSequences = async () => {
        try {
            setSaving(true)
            const changed = sequences.filter(s => hasSequenceChanges.has(s.id))
            await Promise.all(changed.map(s => updateNumberSequence(s.id, s.prefix, s.current_number, s.padding)))
            setHasSequenceChanges(new Set())
            toast.success(`${changed.length} sequence(s) updated!`)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    // ---- Bank handlers ----
    const updateBankField = (id: string, field: keyof BankAccount, value: any) => {
        setBankAccounts(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b))
        setHasBankChanges(true)
    }

    const saveBank = async () => {
        if (!bankAccounts.length) return
        try {
            setSaving(true)
            await Promise.all(bankAccounts.map(b => updateBankAccount(b.id, b)))
            setHasBankChanges(false)
            toast.success('Bank details saved!')
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    // ---- Profile handlers ----
    const saveProfile = async () => {
        if (!profile) return
        try {
            setSaving(true)
            await updateUserProfile({ full_name: profile.full_name, phone: profile.phone })
            toast.success('Profile updated!')
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleChangePassword = async () => {
        if (passwords.new.length < 6) return toast.error('Password must be at least 6 characters')
        if (passwords.new !== passwords.confirm) return toast.error('Passwords do not match')
        try {
            setSaving(true)
            await changePassword(passwords.new)
            setPasswords({ new: '', confirm: '' })
            toast.success('Password changed!')
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    // ---- Helpers ----
    const getSettingValue = (key: string) => settings.find(s => s.key === key)?.value || ''
    const getSettingRow = (key: string) => settings.find(s => s.key === key)

    const tabs = [
        { key: 'company' as const, label: 'Company', icon: Building2, color: 'text-blue-400' },
        { key: 'profile' as const, label: 'Profile & Security', icon: User, color: 'text-emerald-400' },
        { key: 'numbering' as const, label: 'Numbering & Tax', icon: Hash, color: 'text-purple-400' },
        { key: 'system' as const, label: 'System Info', icon: Database, color: 'text-orange-400' },
    ]

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 bg-dark-200 rounded w-48 animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="glass-card p-4 space-y-3">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-dark-200 rounded animate-pulse" />)}
                    </div>
                    <div className="lg:col-span-3 glass-card p-6">
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-dark-200 rounded animate-pulse" />)}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Settings</h1>
                    <p className="text-sm text-dark-500 mt-1">Manage your company and system configuration</p>
                </div>
                <Button variant="secondary" icon={<RefreshCw size={16} />} size="sm" onClick={loadAll}>Refresh</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar */}
                <div className="glass-card p-2 h-fit">
                    {tabs.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                                activeTab === tab.key
                                    ? 'bg-dark-200/50 text-white'
                                    : 'text-dark-500 hover:text-white hover:bg-dark-200/30'
                            )}>
                            <tab.icon size={16} className={activeTab === tab.key ? tab.color : ''} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="lg:col-span-3 space-y-6">

                    {/* ============ COMPANY TAB ============ */}
                    {activeTab === 'company' && company && (
                        <>
                            {/* Basic Info */}
                            <div className="glass-card p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                        <Building2 size={16} className="text-blue-400" /> Company Information
                                    </h3>
                                    {hasCompanyChanges && (
                                        <Button variant="primary" icon={<Save size={14} />} size="sm" onClick={saveCompany} isLoading={saving}>
                                            Save Company
                                        </Button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InputField label="Company Name" value={company.name || ''} onChange={v => updateCompanyField('name', v)} required placeholder="Company Name" />
                                    <InputField label="Short Name" value={company.short_name || ''} onChange={v => updateCompanyField('short_name', v)} placeholder="Short Name" />
                                    <InputField label="GSTIN" value={company.gst_number || ''} onChange={v => updateCompanyField('gst_number', v)} placeholder="22AAAAA0000A1Z5" />
                                    <InputField label="PAN" value={company.pan_number || ''} onChange={v => updateCompanyField('pan_number', v)} placeholder="AAAAA0000A" />
                                    <InputField label="Drug License" value={company.drug_license || ''} onChange={v => updateCompanyField('drug_license', v)} placeholder="Drug License No." />
                                    <InputField label="FSSAI Number" value={company.fssai_number || ''} onChange={v => updateCompanyField('fssai_number', v)} placeholder="FSSAI Number" />
                                    <InputField label="Phone" value={company.phone || ''} onChange={v => updateCompanyField('phone', v)} placeholder="+91 9876543210" />
                                    <InputField label="Email" value={company.email || ''} onChange={v => updateCompanyField('email', v)} type="email" placeholder="info@company.com" />
                                    <InputField label="Website" value={company.website || ''} onChange={v => updateCompanyField('website', v)} placeholder="https://company.com" className="sm:col-span-2" />
                                </div>
                            </div>

                            {/* Address */}
                            <div className="glass-card p-6">
                                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                                    <Globe size={16} className="text-cyan-400" /> Address
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InputField label="Address Line 1" value={company.address_line1 || ''} onChange={v => updateCompanyField('address_line1', v)} className="sm:col-span-2" placeholder="Street address" />
                                    <InputField label="Address Line 2" value={company.address_line2 || ''} onChange={v => updateCompanyField('address_line2', v)} className="sm:col-span-2" placeholder="Area, Landmark" />
                                    <InputField label="City" value={company.city || ''} onChange={v => updateCompanyField('city', v)} placeholder="Mumbai" />
                                    <SelectField label="State" value={company.state || ''} onChange={v => updateCompanyField('state', v)}
                                        options={[{ value: '', label: 'Select State' }, ...INDIAN_STATES.map(s => ({ value: s, label: s }))]} />
                                    <InputField label="Pincode" value={company.pincode || ''} onChange={v => updateCompanyField('pincode', v)} placeholder="400001" />
                                </div>
                            </div>

                            {/* Bank Details */}
                            {bankAccounts.length > 0 && (
                                <div className="glass-card p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                            <Landmark size={16} className="text-emerald-400" /> Bank Account
                                        </h3>
                                        {hasBankChanges && (
                                            <Button variant="primary" icon={<Save size={14} />} size="sm" onClick={saveBank} isLoading={saving}>
                                                Save Bank
                                            </Button>
                                        )}
                                    </div>
                                    {bankAccounts.map(bank => (
                                        <div key={bank.id} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <InputField label="Account Name" value={bank.account_name || ''} onChange={v => updateBankField(bank.id, 'account_name', v)} placeholder="Account Name" />
                                            <InputField label="Bank Name" value={bank.bank_name || ''} onChange={v => updateBankField(bank.id, 'bank_name', v)} placeholder="State Bank of India" />
                                            <InputField label="Account Number" value={bank.account_number || ''} onChange={v => updateBankField(bank.id, 'account_number', v)} placeholder="1234567890" />
                                            <InputField label="IFSC Code" value={bank.ifsc_code || ''} onChange={v => updateBankField(bank.id, 'ifsc_code', v)} placeholder="SBIN0001234" />
                                            <InputField label="Branch" value={bank.branch || ''} onChange={v => updateBankField(bank.id, 'branch', v)} placeholder="Main Branch" />
                                            <SelectField label="Account Type" value={bank.account_type || 'current'} onChange={v => updateBankField(bank.id, 'account_type', v)}
                                                options={[{ value: 'current', label: 'Current' }, { value: 'savings', label: 'Savings' }]} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* General Settings */}
                            <div className="glass-card p-6">
                                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                                    <IndianRupee size={16} className="text-amber-400" /> General Settings
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {settings.map(setting => (
                                        <div key={setting.id}>
                                            <label className="block text-xs font-medium text-dark-500 mb-1.5 capitalize">
                                                {setting.key.replace(/_/g, ' ')}
                                            </label>
                                            <input
                                                type="text"
                                                value={setting.value}
                                                onChange={e => setSettings(prev => prev.map(s => s.id === setting.id ? { ...s, value: e.target.value } : s))}
                                                onBlur={e => {
                                                    const original = settings.find(s => s.id === setting.id)
                                                    if (original && original.value !== e.target.value) {
                                                        updateSettingValue(setting, e.target.value)
                                                    }
                                                }}
                                                className="w-full px-3 py-2 bg-dark-200/50 border border-dark-300/50 rounded-lg text-white text-sm
                          placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
                                            />
                                            <p className="text-[10px] text-dark-500 mt-1">{setting.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ============ PROFILE TAB ============ */}
                    {activeTab === 'profile' && profile && (
                        <>
                            <div className="glass-card p-6">
                                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                                    <User size={16} className="text-emerald-400" /> Your Profile
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InputField label="Full Name" value={profile.full_name || ''} onChange={v => setProfile({ ...profile, full_name: v })} placeholder="Your Name" required />
                                    <InputField label="Email" value={profile.email || ''} onChange={() => { }} disabled />
                                    <InputField label="Phone" value={profile.phone || ''} onChange={v => setProfile({ ...profile, phone: v })} placeholder="+91 9876543210" />
                                    <InputField label="Role" value={profile.role || 'admin'} onChange={() => { }} disabled />
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <Button variant="primary" icon={<Save size={14} />} onClick={saveProfile} isLoading={saving} size="sm">
                                        Update Profile
                                    </Button>
                                </div>
                            </div>

                            <div className="glass-card p-6">
                                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                                    <Key size={16} className="text-amber-400" /> Change Password
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InputField label="New Password" value={passwords.new} onChange={v => setPasswords({ ...passwords, new: v })} type="password" placeholder="Min 6 characters" />
                                    <InputField label="Confirm Password" value={passwords.confirm} onChange={v => setPasswords({ ...passwords, confirm: v })} type="password" placeholder="Re-enter password" />
                                </div>
                                {passwords.new && passwords.confirm && (
                                    <div className="mt-2 flex items-center gap-2 text-xs">
                                        {passwords.new === passwords.confirm ? (
                                            <><CheckCircle2 size={14} className="text-emerald-400" /><span className="text-emerald-400">Passwords match</span></>
                                        ) : (
                                            <><AlertCircle size={14} className="text-red-400" /><span className="text-red-400">Passwords do not match</span></>
                                        )}
                                    </div>
                                )}
                                <div className="mt-4 flex justify-end">
                                    <Button variant="secondary" icon={<Shield size={14} />} onClick={handleChangePassword} isLoading={saving} size="sm"
                                        disabled={!passwords.new || passwords.new !== passwords.confirm}>
                                        Change Password
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ============ NUMBERING TAB ============ */}
                    {activeTab === 'numbering' && (
                        <div className="glass-card p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                    <Hash size={16} className="text-purple-400" /> Document Number Sequences
                                </h3>
                                {hasSequenceChanges.size > 0 && (
                                    <Button variant="primary" icon={<Save size={14} />} size="sm" onClick={saveSequences} isLoading={saving}>
                                        Save ({hasSequenceChanges.size} changed)
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-4">
                                {/* Header */}
                                <div className="hidden sm:grid grid-cols-12 gap-4 px-4 text-xs text-dark-500 font-medium">
                                    <div className="col-span-3">Document Type</div>
                                    <div className="col-span-2">Prefix</div>
                                    <div className="col-span-2">Current No.</div>
                                    <div className="col-span-2">Padding</div>
                                    <div className="col-span-3">Preview</div>
                                </div>

                                {sequences.map(seq => {
                                    const Icon = ENTITY_ICONS[seq.entity_type] || FileText
                                    const isChanged = hasSequenceChanges.has(seq.id)
                                    return (
                                        <div key={seq.id} className={cn(
                                            'grid grid-cols-1 sm:grid-cols-12 gap-4 items-center p-4 rounded-lg transition-all',
                                            isChanged ? 'bg-brand-500/5 border border-brand-500/20' : 'bg-dark-200/20'
                                        )}>
                                            <div className="sm:col-span-3 flex items-center gap-2">
                                                <Icon size={16} className="text-purple-400" />
                                                <span className="text-sm text-white font-medium">
                                                    {ENTITY_LABELS[seq.entity_type] || seq.entity_type}
                                                </span>
                                            </div>
                                            <div className="sm:col-span-2">
                                                <input
                                                    type="text"
                                                    value={seq.prefix}
                                                    onChange={e => updateSequenceField(seq.id, 'prefix', e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-dark-200/50 border border-dark-300/50 rounded text-white text-sm
                            focus:outline-none focus:border-brand-500/50 transition-all"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <input
                                                    type="number"
                                                    value={seq.current_number}
                                                    onChange={e => updateSequenceField(seq.id, 'current_number', parseInt(e.target.value) || 0)}
                                                    className="w-full px-2 py-1.5 bg-dark-200/50 border border-dark-300/50 rounded text-white text-sm
                            focus:outline-none focus:border-brand-500/50 transition-all"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <input
                                                    type="number"
                                                    value={seq.padding}
                                                    onChange={e => updateSequenceField(seq.id, 'padding', parseInt(e.target.value) || 1)}
                                                    min={1} max={10}
                                                    className="w-full px-2 py-1.5 bg-dark-200/50 border border-dark-300/50 rounded text-white text-sm
                            focus:outline-none focus:border-brand-500/50 transition-all"
                                                />
                                            </div>
                                            <div className="sm:col-span-3">
                                                <span className="text-sm font-mono text-brand-400">
                                                    {seq.prefix}{String(seq.current_number + 1).padStart(seq.padding, '0')}
                                                </span>
                                                <span className="text-[10px] text-dark-500 ml-2">next</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* ============ SYSTEM TAB ============ */}
                    {activeTab === 'system' && (
                        <>
                            <div className="glass-card p-6">
                                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                                    <Database size={16} className="text-orange-400" /> Database Statistics
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {Object.entries(stats).map(([key, value]) => {
                                        const icons: Record<string, any> = {
                                            products: Package, customers: Users, suppliers: Truck,
                                            sales_orders: ShoppingCart, invoices: Receipt, purchase_orders: Truck,
                                            raw_materials: Package, production_orders: Factory,
                                            inventory: WarehouseIcon, payments: CreditCard,
                                            quotations: FileQuestion, warehouses: WarehouseIcon,
                                        }
                                        const colors: Record<string, string> = {
                                            products: 'text-blue-400', customers: 'text-emerald-400',
                                            suppliers: 'text-purple-400', sales_orders: 'text-cyan-400',
                                            invoices: 'text-amber-400', purchase_orders: 'text-orange-400',
                                            raw_materials: 'text-pink-400', production_orders: 'text-indigo-400',
                                            inventory: 'text-teal-400', payments: 'text-lime-400',
                                            quotations: 'text-rose-400', warehouses: 'text-sky-400',
                                        }
                                        const Icon = icons[key] || Database
                                        return (
                                            <div key={key} className="bg-dark-200/30 rounded-lg p-4 text-center">
                                                <Icon size={18} className={cn('mx-auto mb-2', colors[key] || 'text-dark-500')} />
                                                <p className={cn('text-2xl font-bold', colors[key] || 'text-white')}>{value}</p>
                                                <p className="text-xs text-dark-500 mt-1 capitalize">{key.replace(/_/g, ' ')}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="glass-card p-6">
                                <h3 className="text-sm font-semibold text-white mb-4">System Information</h3>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Application', value: 'Falcon Super Gold ERP v1.0' },
                                        { label: 'Company', value: company?.name || 'Not set' },
                                        { label: 'Frontend', value: 'React + TypeScript + Vite' },
                                        { label: 'UI Library', value: 'Tailwind CSS + Custom Components' },
                                        { label: 'Backend', value: 'Supabase (PostgreSQL)' },
                                        { label: 'Charts', value: 'Recharts' },
                                        { label: 'Auth', value: 'Supabase Auth (Email + Password)' },
                                        { label: 'Tables', value: '43 tables' },
                                        { label: 'Modules', value: '13 (All Complete ✅)' },
                                    ].map(info => (
                                        <div key={info.label} className="flex items-center justify-between py-2 border-b border-dark-300/20 last:border-0">
                                            <span className="text-sm text-dark-500">{info.label}</span>
                                            <span className="text-sm text-white font-medium">{info.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="glass-card p-6 border-emerald-500/20">
                                <div className="text-center py-4">
                                    <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-3" />
                                    <h3 className="text-lg font-bold text-white">All Systems Operational</h3>
                                    <p className="text-sm text-dark-500 mt-1">All 13 modules are active and running</p>
                                    <p className="text-xs text-dark-500 mt-1">43 database tables • Supabase PostgreSQL</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
