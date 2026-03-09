import { FileText } from 'lucide-react'
import { ExportStatusBadge } from './ExportStatusBadge'
import type { ExportDocument, DocumentStatus } from '../types/export.types'
import { DOCUMENT_STATUSES } from '../types/export.types'

interface DocumentChecklistProps {
    documents: ExportDocument[]
    onStatusChange: (docId: string, status: DocumentStatus, refNumber?: string, issueDate?: string) => void
}

export function DocumentChecklist({ documents, onStatusChange }: DocumentChecklistProps) {
    const readyCount = documents.filter(
        (d) => d.status === 'READY' || d.status === 'SUBMITTED' || d.status === 'NOT_REQUIRED'
    ).length
    const total = documents.length
    const percent = total > 0 ? Math.round((readyCount / total) * 100) : 0

    return (
        <div className="space-y-4">
            <div>
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-dark-500">
                        {readyCount}/{total} Documents Ready
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{percent}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-dark-300 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${percent}%` }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                    <div
                        key={doc.id}
                        className="rounded-lg border border-gray-200 dark:border-dark-300 p-4 hover:border-blue-500/30 transition-colors"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-gray-100 dark:bg-dark-200">
                                <FileText size={18} className="text-gray-500 dark:text-dark-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {doc.document_name}
                                </p>
                                <div className="mt-2">
                                    <ExportStatusBadge status={doc.status} />
                                </div>
                                {doc.reference_number && (
                                    <p className="text-xs text-gray-500 dark:text-dark-500 mt-1">
                                        Ref: {doc.reference_number}
                                    </p>
                                )}
                                {doc.issue_date && (
                                    <p className="text-xs text-gray-500 dark:text-dark-500">
                                        Issue: {new Date(doc.issue_date).toLocaleDateString('en-IN')}
                                    </p>
                                )}
                                <div className="mt-2">
                                    <select
                                        className="text-xs bg-gray-100 dark:bg-dark-200 rounded px-2 py-1 text-gray-900 dark:text-white border-0"
                                        value={doc.status}
                                        onChange={(e) =>
                                            onStatusChange(doc.id, e.target.value as DocumentStatus)
                                        }
                                    >
                                        {DOCUMENT_STATUSES.map((s) => (
                                            <option key={s.value} value={s.value}>
                                                {s.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
