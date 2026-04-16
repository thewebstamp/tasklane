import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="flex items-center justify-center p-6 min-h-dvh bg-surface-50">
            <div className="max-w-sm text-center">
                <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 border-2 rounded-full bg-brand-50 border-brand-100">
                    <span className="text-3xl font-bold font-display text-brand-400">404</span>
                </div>
                <h1 className="text-2xl font-semibold font-display text-slate-900">Page not found</h1>
                <p className="mt-2 text-sm text-slate-500">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <div className="flex items-center justify-center gap-3 mt-6">
                    <Link href="/dashboard" className="btn-primary">Go to dashboard</Link>
                    <Link href="/" className="btn-secondary">Home</Link>
                </div>
            </div>
        </div>
    )
}