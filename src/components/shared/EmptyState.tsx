import { PackageOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface EmptyStateProps {
    icon?: React.ReactNode
    title: string
    description: string
    actionLabel?: string
    onAction?: () => void
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="text-dark-400">
                {icon || <PackageOpen size={48} />}
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-dark-500 text-center max-w-md">{description}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction}>{actionLabel}</Button>
            )}
        </div>
    )
}