import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoaderProps {
    size?: 'sm' | 'md' | 'lg'
    text?: string
    fullScreen?: boolean
}

export function Loader({ size = 'md', text, fullScreen }: LoaderProps) {
    const sizes = { sm: 20, md: 32, lg: 48 }

    const content = (
        <div className="flex flex-col items-center gap-3">
            <Loader2 size={sizes[size]} className="animate-spin text-brand-400" />
            {text && <p className="text-sm text-dark-500">{text}</p>}
        </div>
    )

    if (fullScreen) {
        return (
            <div className="min-h-screen bg-dark flex items-center justify-center">
                {content}
            </div>
        )
    }

    return <div className="flex items-center justify-center p-8">{content}</div>
}