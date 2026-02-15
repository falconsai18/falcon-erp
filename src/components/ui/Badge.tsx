import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

interface BadgeProps {
    children: React.ReactNode
    variant?: BadgeVariant
    className?: string
    dot?: boolean
}

const VARIANTS: Record<BadgeVariant, string> = {
    default: 'bg-dark-300/50 text-dark-500 border-dark-300',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    danger: 'bg-red-500/10 text-red-400 border-red-500/30',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
}

export function Badge({ children, variant = 'default', className, dot }: BadgeProps) {
    return (
        <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
            VARIANTS[variant],
            className
        )}>
            {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
            {children}
        </span>
    )
}