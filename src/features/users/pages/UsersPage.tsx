import { useState, useEffect, useMemo } from 'react'
import {
    Plus, Search, Download, Trash2, X, Save, ChevronLeft, ChevronRight,
    Users, UserCheck, UserX, Shield, Edit2, Check, AlertTriangle, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuthStore } from '@/features/auth/store/authStore'
import { usePermission } from '@/hooks/usePermission'
import {
    getAllUsers, updateUserRole, toggleUserStatus, updateUserProfile, inviteUser,
    type User
} from '@/services/userService'
import { exportToCSV } from '@/services/exportService'
import { ROLE_COLORS, ROLE_LABELS, type UserRole } from '@/config/permissions'

// ============ COMPONENTS ============

function UserAvatar({ name, color, url }: { name: string; color: string; url?: string | null }) {
    if (url) {
        return <img src={url} alt={name} className="w-8 h-8 rounded-full object-cover" />
    }
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    // Map role color (e.g., 'purple') to tailwind classes
    const colorClasses: Record<string, string> = {
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        gold: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    }
    return (
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold", colorClasses[color] || colorClasses.gray)}>
            {initials}
        </div>
    )
}

function RoleBadge({ role, onClick }: { role: UserRole, onClick?: () => void }) {
    const color = ROLE_COLORS[role] || 'gray'
    const label = ROLE_LABELS[role] || role

    // Map abstract colors to Badge variants
    const variantMap: Record<string, any> = {
        purple: 'brand', // Super Admin
        gold: 'warning', // Admin
        blue: 'info',    // Manager
        green: 'success',// Accountant
        orange: 'danger', // Staff (using danger for orange-ish look or warning) - actually lets use custom classes or closest match
        gray: 'secondary'
    }

    // Custom mapping for Badge variants based on our Badge component
    const badgeVariant = variantMap[color] || 'default'

    return (
        <div onClick={onClick} className={cn(onClick && "cursor-pointer hover:opacity-80 transition-opacity")}>
            <Badge variant={badgeVariant}>{label}</Badge>
        </div>
    )
}

// ============ MAIN PAGE ============

export default function UsersPage() {
    const { user: currentUser } = useAuthStore()
    const { can } = usePermission()
    const [users, setUsers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [isUpdating, setIsUpdating] = useState(false)

    // Modals
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [formData, setFormData] = useState({
        email: '', full_name: '', role: 'staff' as UserRole, department: '', phone: '', avatar_url: ''
    })

    // Inline editing state
    const [editingRole, setEditingRole] = useState<string | null>(null) // userId

    useEffect(() => { fetchUsers() }, [])

    const fetchUsers = async () => {
        try {
            setIsLoading(true)
            const data = await getAllUsers()
            setUsers(data)
        } catch (err: any) {
            toast.error('Failed to load users')
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    // Filtering
    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = u.full_name.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase())
            const matchesRole = roleFilter === 'all' || u.role === roleFilter
            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' ? u.is_active : !u.is_active)
            return matchesSearch && matchesRole && matchesStatus
        })
    }, [users, search, roleFilter, statusFilter])

    // Stats
    const stats = {
        total: users.length,
        active: users.filter(u => u.is_active).length,
        inactive: users.filter(u => !u.is_active).length,
        admins: users.filter(u => ['super_admin', 'admin'].includes(u.role)).length
    }

    // Actions
    const handleStatusToggle = async (userToToggle: User) => {
        if (userToToggle.id === currentUser?.id) {
            toast.error("Cannot deactivate your own account")
            return
        }

        // Confirmation for deactivation
        if (userToToggle.is_active && !confirm(`Deactivate ${userToToggle.full_name}? They will lose access immediately.`)) {
            return
        }

        try {
            setIsUpdating(true)
            await toggleUserStatus(userToToggle.id, !userToToggle.is_active)
            toast.success(`User ${userToToggle.is_active ? 'deactivated' : 'activated'}`)
            fetchUsers()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsUpdating(false)
        }
    }

    const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
        if (userId === currentUser?.id) {
            toast.error("Cannot change your own role")
            return
        }

        try {
            setIsUpdating(true)
            await updateUserRole(userId, newRole)
            toast.success(`Role updated to ${ROLE_LABELS[newRole]}`)
            setEditingRole(null)
            fetchUsers()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsUpdating(false)
        }
    }

    const handleInvite = async () => {
        if (!formData.full_name || !formData.email) {
            toast.error("Name and Email are required")
            return
        }

        try {
            setIsUpdating(true)
            await inviteUser(formData.email, formData.role, formData.full_name, formData.department)
            toast.success("User added successfully! Ensure they are also created in Supabase Auth.")
            setShowInviteModal(false)
            setFormData({ email: '', full_name: '', role: 'staff', department: '', phone: '', avatar_url: '' })
            fetchUsers()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsUpdating(false)
        }
    }

    const handleUpdateProfile = async () => {
        if (!selectedUser) return

        try {
            setIsUpdating(true)
            await updateUserProfile(selectedUser.id, {
                full_name: formData.full_name,
                department: formData.department || null,
                phone: formData.phone || null,
                // avatar_url: formData.avatar_url // Not implementing file upload here
            })
            toast.success("Profile updated")
            setShowEditModal(false)
            fetchUsers()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsUpdating(false)
        }
    }

    const openEditModal = (u: User) => {
        setSelectedUser(u)
        setFormData({
            email: u.email,
            full_name: u.full_name,
            role: u.role,
            department: u.department || '',
            phone: u.phone || '',
            avatar_url: u.avatar_url || ''
        })
        setShowEditModal(true)
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Team Members"
                description={`${stats.total} users • ${stats.active} active`}
                actions={can('create', 'users') && (
                    <Button icon={<Plus size={16} />} onClick={() => setShowInviteModal(true)}>
                        Add User
                    </Button>
                )}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-dark-500 uppercase font-medium">Total Users</p>
                        <p className="text-2xl font-bold text-blue-500 mt-1">{stats.total}</p>
                    </div>
                    <div className="bg-blue-500/10 p-2 rounded-lg"><Users size={20} className="text-blue-500" /></div>
                </div>
                <div className="glass-card p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-dark-500 uppercase font-medium">Active</p>
                        <p className="text-2xl font-bold text-emerald-500 mt-1">{stats.active}</p>
                    </div>
                    <div className="bg-emerald-500/10 p-2 rounded-lg"><UserCheck size={20} className="text-emerald-500" /></div>
                </div>
                <div className="glass-card p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-dark-500 uppercase font-medium">Inactive</p>
                        <p className="text-2xl font-bold text-red-500 mt-1">{stats.inactive}</p>
                    </div>
                    <div className="bg-red-500/10 p-2 rounded-lg"><UserX size={20} className="text-red-500" /></div>
                </div>
                <div className="glass-card p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-dark-500 uppercase font-medium">Admins</p>
                        <p className="text-2xl font-bold text-amber-500 mt-1">{stats.admins}</p>
                    </div>
                    <div className="bg-amber-500/10 p-2 rounded-lg"><Shield size={20} className="text-amber-500" /></div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 max-w-sm">
                    <Input
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={<Search size={16} />}
                    />
                </div>
                <Select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    options={[
                        { value: 'all', label: 'All Roles' },
                        ...Object.entries(ROLE_LABELS).map(([val, label]) => ({ value: val, label }))
                    ]}
                    className="w-40"
                />
                <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={[
                        { value: 'all', label: 'All Status' },
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' }
                    ]}
                    className="w-40"
                />
            </div>

            {/* Users Table */}
            {isLoading ? (
                <div className="glass-card p-8 space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-center gap-4 animate-pulse">
                            <div className="w-8 h-8 rounded-full bg-dark-200" />
                            <div className="h-4 w-32 bg-dark-200 rounded" />
                            <div className="h-4 w-24 bg-dark-200 rounded ml-auto" />
                        </div>
                    ))}
                </div>
            ) : filteredUsers.length === 0 ? (
                <EmptyState
                    icon={<Users size={48} />}
                    title="No users found"
                    description="Try adjusting your filters or search query"
                    actionLabel="Add User"
                    onAction={() => setShowInviteModal(true)}
                />
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-dark-300">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-dark-500 uppercase">User</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-dark-500 uppercase">Role</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-dark-500 uppercase">Department</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-dark-500 uppercase">Last Login</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-dark-500 uppercase">Status</th>
                                {can('update', 'users') && <th className="px-4"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-dark-300">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-dark-200/50 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar name={user.full_name} color={ROLE_COLORS[user.role]} url={user.avatar_url} />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                                                <p className="text-xs text-dark-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        {editingRole === user.id ? (
                                            <select
                                                autoFocus
                                                value={user.role}
                                                onChange={(e) => handleRoleUpdate(user.id, e.target.value as UserRole)}
                                                onBlur={() => setEditingRole(null)}
                                                className="bg-white dark:bg-dark-200 border border-gray-200 dark:border-dark-300 rounded px-2 py-1 text-xs"
                                            >
                                                {Object.entries(ROLE_LABELS).map(([r, l]) => (
                                                    <option key={r} value={r}>{l}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <RoleBadge
                                                role={user.role}
                                                onClick={() => can('update', 'users') && currentUser?.id !== user.id && setEditingRole(user.id)}
                                            />
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-dark-500">
                                        {user.department || '—'}
                                    </td>
                                    <td className="py-3 px-4">
                                        {user.last_login ? (
                                            <span className="text-sm text-dark-500">{formatDate(user.last_login)}</span>
                                        ) : (
                                            <Badge variant="warning">Never</Badge>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        {can('update', 'users') ? (
                                            <button
                                                onClick={() => handleStatusToggle(user)}
                                                className={cn(
                                                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
                                                    user.is_active ? "bg-emerald-500" : "bg-gray-200 dark:bg-dark-300"
                                                )}
                                                disabled={isUpdating || user.id === currentUser?.id}
                                            >
                                                <span className={cn(
                                                    "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                                                    user.is_active ? "translate-x-5" : "translate-x-1"
                                                )} />
                                            </button>
                                        ) : (
                                            <Badge variant={user.is_active ? 'success' : 'danger'}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        )}
                                    </td>
                                    {can('update', 'users') && (
                                        <td className="py-3 px-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                icon={<Edit2 size={14} />}
                                                onClick={() => openEditModal(user)}
                                            />
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add User Modal */}
            <Modal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                title="Add User"
                size="md"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setShowInviteModal(false)}>Cancel</Button>
                        <Button onClick={handleInvite} isLoading={isUpdating}>Add User</Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex gap-3 text-sm text-blue-600 dark:text-blue-400">
                        <AlertTriangle className="shrink-0" size={20} />
                        <p>Adding a user here creates a profile record. You MUST also create this user manually in the Supabase Auth Dashboard with the same email for them to log in.</p>
                    </div>

                    <Input
                        label="Full Name *"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                    <Input
                        label="Email Address *"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Role *"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                            options={Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                        />
                        <Input
                            label="Department"
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        />
                    </div>
                </div>
            </Modal>

            {/* Edit User Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Edit User Profile"
                size="md"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
                        <Button onClick={handleUpdateProfile} isLoading={isUpdating}>Save Changes</Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Email"
                        value={formData.email}
                        disabled
                        className="opacity-60"
                        title="Email cannot be changed"
                    />
                    <Input
                        label="Full Name *"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Department"
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        />
                        <Input
                            label="Phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    )
}
