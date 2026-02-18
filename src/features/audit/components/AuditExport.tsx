import { useState } from 'react'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import type { AuditLog } from '@/services/auditService'

interface AuditExportProps {
  logs: AuditLog[]
  filters: {
    dateFrom?: string
    dateTo?: string
  }
}

export function AuditExport({ logs, filters }: AuditExportProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (logs.length === 0) {
      toast.error('No data to export')
      return
    }

    try {
      setExporting(true)

      // CSV Header
      const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Details']

      // CSV Rows
      const rows = logs.map((log) => [
        log.created_at,
        log.users?.full_name || 'System',
        log.action,
        log.entity_type,
        log.entity_id || '',
        log.ip_address || '',
        JSON.stringify(log.details || {}),
      ])

      // Combine
      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row
            .map((cell) => {
              // Escape cells with commas or quotes
              const cellStr = String(cell)
              if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`
              }
              return cellStr
            })
            .join(',')
        ),
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      // Filename with date range
      const fromDate = filters.dateFrom || 'start'
      const toDate = filters.dateTo || 'now'
      const filename = `audit_log_${fromDate}_${toDate}.csv`

      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Exported ${logs.length} records to ${filename}`)
    } catch (error: any) {
      toast.error('Export failed: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleExport}
      isLoading={exporting}
      icon={exporting ? <Loader2 size={16} /> : <Download size={16} />}
      disabled={logs.length === 0}
    >
      Export CSV
    </Button>
  )
}

// Export all logs (for full data export)
export async function exportAllAuditLogs(
  filters: {
    dateFrom?: string
    dateTo?: string
    userId?: string
    actionType?: string
    entityType?: string
  }
): Promise<void> {
  try {
    // This would fetch all matching logs and export them
    // For now, we'll show a coming soon message
    toast.info('Full export feature coming soon')
  } catch (error: any) {
    toast.error('Export failed: ' + error.message)
  }
}
