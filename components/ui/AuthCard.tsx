import { clsx } from 'clsx'

interface AuthCardProps {
    title: string
    description: string
    children: React.ReactNode
    className?: string
}

export default function AuthCard({
    title,
    description,
    children,
    className,
}: AuthCardProps) {
    return (
        <div
            className={clsx(
                'bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl',
                className
            )}
        >
            <div className="mb-6">
                <h2 className="font-display text-xl font-semibold text-white">{title}</h2>
                <p className="text-sm text-slate-400 mt-1">{description}</p>
            </div>
            {children}
        </div>
    )
}