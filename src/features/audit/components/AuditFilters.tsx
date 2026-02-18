import { useState, useEffect } from 'react'
import { Search, X, Calendar, Filter, RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface AuditFiltersProps {
  onFilterChange: (filters: FilterState) => void
  className?: string
}

export interface FilterState {
  search: string
  userId: string
  actionType: string
  entityType: string
  dateFrom: string
  dateTo: string
}

const ACTION_TYPES = [
  { value: 'all', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'EXPORT', label: 'Export' },
]

const ENTITY_TYPES = [
  { value: 'all', label: 'All Entities' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'payment', label: 'Payment' },
  { value: 'sales_order', label: 'Sales Order' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'customer', label: 'Customer' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'work_order', label: 'Work Order' },
  { value: 'scrap_record', label: 'Scrap Record' },
  { value: 'user', label: 'User' },
]

const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
]

export function AuditFilters({ onFilterChange, className }: AuditFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    userId: 'all',
    actionType: 'all',
    entityType: 'all',
    dateFrom: '',
    dateTo: '',
  })
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    onFilterChange(filters)
  }, [filters])

  const loadUsers = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, full_name')
        .order('full_name')

      setUsers(data || [])
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      userId: 'all',
      actionType: 'all',
      entityType: 'all',
      dateFrom: '',
      dateTo: '',
    })
  }

  const applyDatePreset = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)

    setFilters((prev) => ({
      ...prev,
      dateFrom: start.toISOString().split('T')[0],
      dateTo: end.toISOString().split('T')[0],
    }))
  }

  const hasActiveFilters =
    filters.search ||
    filters.userId !== 'all' ||
    filters.actionType !== 'all' ||
    filters.entityType !== 'all' ||
    filters.dateFrom ||
    filters.dateTo

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search actions, entities, details..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowFilters(!showFilters)}
          icon={<Filter size={16} />}
          className={cn(showFilters && 'bg-indigo-500/20 text-indigo-400')}
        >
          Filters
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} icon={<RotateCcw size={16} />}>
            Clear
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="glass-card p-4 space-y-4 animate-in slide-in-from-top-2">
          {/* Date Range */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              <span className="text-sm text-gray-400">Date Range</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.days}
                  onClick={() => applyDatePreset(preset.days)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-dark-200/50 text-gray-400 hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Input
                type="date"
                label="From"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="flex-1"
              />
              <Input
                type="date"
                label="To"
                value={filters.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          {/* Dropdown Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* User Filter */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase">User</label>
              <select
                value={filters.userId}
                onChange={(e) => updateFilter('userId', e.target.value)}
                className="w-full bg-white dark:bg-dark-200 border border-gray-200 dark:border-dark-300 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/30"
              >
                <option value="all">All Users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Type Filter */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase">Action Type</label>
              <select
                value={filters.actionType}
                onChange={(e) => updateFilter('actionType', e.target.value)}
                className="w-full bg-white dark:bg-dark-200 border border-gray-200 dark:border-dark-300 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/30"
              >
                {ACTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Type Filter */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase">Entity Type</label>
              <select
                value={filters.entityType}
                onChange={(e) => updateFilter('entityType', e.target.value)}
                className="w-full bg-white dark:bg-dark-200 border border-gray-200 dark:border-dark-300 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/30"
              >
                {ENTITY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs">
              Search: {filters.search}
              <button onClick={() => updateFilter('search', '')}>
                <X size={12} />
              </button>
            </span>
          )}
          {filters.userId !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-xs">
              User: {users.find((u) => u.id === filters.userId)?.full_name || filters.userId}
              <button onClick={() => updateFilter('userId', 'all')}>
                <X size={12} />
              </button>
            </span>
          )}
          {filters.actionType !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs">
              Action: {filters.actionType}
              <button onClick={() => updateFilter('actionType', 'all')}>
                <X size={12} />
              </button>
            </span>
          )}
          {filters.entityType !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs">
              Entity: {filters.entityType}
              <button onClick={() => updateFilter('entityType', 'all')}>
                <X size={12} />
              </button>
            </span>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs">
              Date: {filters.dateFrom || 'Start'} - {filters.dateTo || 'Now'}
              <button onClick={() => { updateFilter('dateFrom', ''); updateFilter('dateTo', '') }}>
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
