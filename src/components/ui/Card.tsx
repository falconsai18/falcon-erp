import { cn } from '@/lib/utils'

interface CardProps {
    children: React.ReactNode
    className?: string
    hover?: boolean
    onClick?: () => void
}

export function Card({ children, className, hover, onClick }: CardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                'glass-card p-6',
                hover && 'hover:border-dark-200 cursor-pointer transition-all duration-300',
                onClick && 'cursor-pointer',
                className
            )}
        >
            {children}
        </div>
    )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('flex items-center justify-between mb-4', className)}>
            {children}
        </div>
    )
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
    return <h3 className={cn('text-lg font-semibold text-white', className)}>{children}</h3>
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
    return <p className={cn('text-sm text-dark-500', className)}>{children}</p>
}