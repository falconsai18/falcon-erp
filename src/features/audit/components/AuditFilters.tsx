import { useState, useEffect, useRef } from 'react'
import { Search, X, Calendar, Filter, RotateCcw, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
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

// Custom Dropdown Component
interface DropdownOption {
  value: string
  label: string
}

interface CustomDropdownProps {
  label: string
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
}

function CustomDropdown({ label, value, options, onChange }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedOption = options.find((o) => o.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="space-y-1" ref={dropdownRef}>
      <label className="text-xs text-gray-400 uppercase">{label}</label>
      <div className="relative">
        {/* Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg',
            'glass-card bg-white/50 dark:bg-dark-100/50 backdrop-blur-md',
            'border border-gray-200 dark:border-dark-300',
            'text-sm text-gray-900 dark:text-white',
            'hover:bg-white/70 dark:hover:bg-dark-200/70 transition-all'
          )}
        >
          <span>{selectedOption?.label || 'Select...'}</span>
          <ChevronDown
            size={16}
            className={cn('text-gray-400 transition-transform', isOpen && 'rotate-180')}
          />
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div
            className={cn(
              'absolute z-50 w-full mt-1 rounded-xl',
              'bg-white dark:bg-dark-200',
              'shadow-xl border border-gray-200 dark:border-dark-300',
              'max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2'
            )}
          >
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={cn(
                  'px-4 py-2 cursor-pointer text-sm',
                  'text-gray-900 dark:text-white',
                  'hover:bg-gray-100 dark:hover:bg-dark-300',
                  value === option.value && 'bg-indigo-500/10 text-indigo-500'
                )}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

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

  // Prepare user options for dropdown
  const userOptions = [{ value: 'all', label: 'All Users' }, ...users.map((u) => ({ value: u.id, label: u.full_name }))]

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
            <CustomDropdown
              label="User"
              value={filters.userId}
              options={userOptions}
              onChange={(value) => updateFilter('userId', value)}
            />

            {/* Action Type Filter */}
            <CustomDropdown
              label="Action Type"
              value={filters.actionType}
              options={ACTION_TYPES}
              onChange={(value) => updateFilter('actionType', value)}
            />

            {/* Entity Type Filter */}
            <CustomDropdown
              label="Entity Type"
              value={filters.entityType}
              options={ENTITY_TYPES}
              onChange={(value) => updateFilter('entityType', value)}
            />
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
