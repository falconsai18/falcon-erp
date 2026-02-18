import { useState } from 'react'
import { Plus, Pencil, Trash2, LogIn, Download, ChevronDown, ChevronUp, User, Clock, Globe } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn, formatDate } from '@/lib/utils'
import type { AuditLog } from '@/services/auditService'

interface AuditTimelineProps {
  logs: AuditLog[]
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

// Action configuration with icons and colors
const ACTION_CONFIG: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
  CREATE: {
    icon: Plus,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500',
    label: 'Created',
  },
  UPDATE: {
    icon: Pencil,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500',
    label: 'Updated',
  },
  DELETE: {
    icon: Trash2,
    color: 'text-red-400',
    bgColor: 'bg-red-500',
    label: 'Deleted',
  },
  LOGIN: {
    icon: LogIn,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500',
    label: 'Login',
  },
  LOGOUT: {
    icon: LogIn,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500',
    label: 'Logout',
  },
  EXPORT: {
    icon: Download,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500',
    label: 'Export',
  },
  OTHER: {
    icon: Pencil,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500',
    label: 'Action',
  },
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateString)
}

// Get user initials
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Format action for human reading
function formatAction(action: string, entityType: string): string {
  const parts = action.split('.')
  const actionVerb = parts[0]?.toUpperCase() || 'ACTION'
  const entityName = entityType.replace(/_/g, ' ')
  
  const config = ACTION_CONFIG[actionVerb] || ACTION_CONFIG.OTHER
  return `${config.label} ${entityName}`
}

// Individual timeline item
function TimelineItem({ log, isLast }: { log: AuditLog; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)
  
  const actionKey = log.action?.split('.')[0]?.toUpperCase() || 'OTHER'
  const config = ACTION_CONFIG[actionKey] || ACTION_CONFIG.OTHER
  const Icon = config.icon
  
  const userName = log.users?.full_name || 'System'
  const userInitials = getInitials(userName)
  
  const relativeTime = formatRelativeTime(log.created_at)
  const absoluteTime = formatDate(log.created_at)

  return (
    <div className="relative flex gap-4 group">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[19px] top-10 bottom-0 w-px bg-dark-300/50" />
      )}
      
      {/* Timeline dot */}
      <div className={cn(
        'relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0',
        'ring-4 ring-gray-900 transition-all duration-300',
        config.bgColor,
        'group-hover:scale-110'
      )}>
        <Icon size={18} className="text-white" />
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="glass-card p-4 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setExpanded(!expanded)}>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* User Avatar */}
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-medium text-indigo-400">
                {userInitials}
              </div>
              
              <div>
                <p className="text-sm font-medium text-white">
                  {userName}
                </p>
                <p className={cn('text-sm', config.color)}>
                  {formatAction(log.action, log.entity_type)}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-gray-400" title={absoluteTime}>
                {relativeTime}
              </p>
              {expanded ? <ChevronUp size={16} className="text-gray-400 mt-1" /> : <ChevronDown size={16} className="text-gray-400 mt-1" />}
            </div>
          </div>
          
          {/* Entity Badge */}
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="default" className="text-[10px]">
              {log.entity_type}
            </Badge>
            {log.entity_id && (
              <span className="text-xs text-gray-500 font-mono">
                ID: {log.entity_id.slice(0, 8)}...
              </span>
            )}
          </div>
          
          {/* IP Address */}
          {log.ip_address && (
            <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500">
              <Globe size={10} />
              {log.ip_address}
            </div>
          )}
          
          {/* Expanded Details */}
          {expanded && log.details && (
            <div className="mt-3 pt-3 border-t border-dark-300/30 animate-in slide-in-from-top-2">
              <p className="text-xs text-gray-400 mb-2">Details:</p>
              <pre className="text-xs text-gray-300 bg-dark-200/50 p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Loading skeleton
function TimelineSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-dark-200 shrink-0" />
          <div className="flex-1 glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-dark-200" />
              <div className="space-y-2">
                <div className="h-4 w-24 bg-dark-200 rounded" />
                <div className="h-3 w-32 bg-dark-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Empty state
function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="relative w-24 h-24 mx-auto mb-6">
        {/* Radar animation */}
        <div className="absolute inset-0 rounded-full border-2 border-dark-300/30" />
        <div className="absolute inset-2 rounded-full border border-dark-300/20" />
        <div className="absolute inset-4 rounded-full border border-dark-300/10" />
        <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500/50 animate-spin" style={{ animationDuration: '3s' }} />
        <Clock size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-400" />
      </div>
      <p className="text-lg font-medium text-white">All quiet</p>
      <p className="text-sm text-gray-400 mt-1">No activity found matching your filters</p>
    </div>
  )
}

export function AuditTimeline({ logs, loading, hasMore, onLoadMore }: AuditTimelineProps) {
  if (loading) {
    return <TimelineSkeleton />
  }

  if (logs.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-2">
      {logs.map((log, index) => (
        <TimelineItem 
          key={log.id} 
          log={log} 
          isLast={index === logs.length - 1} 
        />
      ))}
      
      {/* Load More */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onLoadMore}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-dark-200 transition-colors"
          >
            Load more...
          </button>
        </div>
      )}
    </div>
  )
}
