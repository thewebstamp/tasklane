export default function Loading() {
    return (
        <div className="mx-auto space-y-6 max-w-7xl animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="w-48 rounded-lg h-7 bg-slate-200" />
                    <div className="w-32 h-4 rounded bg-slate-100" />
                </div>
                <div className="w-32 rounded-lg h-9 bg-slate-200" />
            </div>

            {/* Stats grid skeleton */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-5 card">
                        <div className="flex items-start justify-between">
                            <div className="space-y-2">
                                <div className="w-20 h-3 rounded bg-slate-200" />
                                <div className="w-12 h-8 rounded bg-slate-200" />
                                <div className="w-24 h-3 rounded bg-slate-100" />
                            </div>
                            <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Table skeleton */}
            <div className="card">
                <div className="px-6 py-4 border-b border-slate-100">
                    <div className="h-5 rounded w-36 bg-slate-200" />
                </div>
                <div className="divide-y divide-slate-100">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-6 py-4">
                            <div className="flex-1 space-y-1.5">
                                <div className="w-64 h-4 rounded bg-slate-200" />
                                <div className="w-40 h-3 rounded bg-slate-100" />
                            </div>
                            <div className="flex gap-2">
                                <div className="w-16 h-5 rounded-full bg-slate-100" />
                                <div className="w-16 h-5 rounded-full bg-slate-100" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}