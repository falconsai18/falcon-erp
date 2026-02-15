import { cn } from '@/lib/utils'

interface Column<T> {
    key: string
    label: string
    render?: (item: T) => React.ReactNode
    className?: string
}

interface TableProps<T> {
    columns: Column<T>[]
    data: T[]
    onRowClick?: (item: T) => void
    isLoading?: boolean
    emptyMessage?: string
    emptyIcon?: React.ReactNode
}

export function Table<T extends Record<string, any>>({
    columns,
    data,
    onRowClick,
    isLoading,
    emptyMessage = 'No data found',
    emptyIcon,
}: TableProps<T>) {
    if (isLoading) {
        return (
            <div className="glass-card overflow-hidden">
                <div className="p-8 text-center">
                    <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-dark-200 rounded w-1/3 mx-auto" />
                        <div className="h-4 bg-dark-200 rounded w-1/2 mx-auto" />
                        <div className="h-4 bg-dark-200 rounded w-2/5 mx-auto" />
                    </div>
                </div>
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="glass-card overflow-hidden">
                <div className="p-12 text-center space-y-3">
                    {emptyIcon && <div className="text-dark-400 flex justify-center">{emptyIcon}</div>}
                    <p className="text-dark-500 text-sm">{emptyMessage}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-dark-300/50">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={cn(
                                        'px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider',
                                        col.className
                                    )}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-300/30">
                        {data.map((item, index) => (
                            <tr
                                key={index}
                                onClick={() => onRowClick?.(item)}
                                className={cn(
                                    'hover:bg-dark-200/30 transition-colors',
                                    onRowClick && 'cursor-pointer'
                                )}
                            >
                                {columns.map((col) => (
                                    <td key={col.key} className={cn('px-4 py-3 text-sm text-white', col.className)}>
                                        {col.render ? col.render(item) : item[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}