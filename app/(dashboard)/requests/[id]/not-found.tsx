import Link from 'next/link'
import { ClipboardList } from 'lucide-react'

export default function RequestNotFound() {
    return (
        <div className="max-w-md mx-auto mt-20 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-5 rounded-full bg-slate-100">
                <ClipboardList className="w-7 h-7 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold font-display text-slate-900">Request not found</h2>
            <p className="mt-2 text-sm text-slate-500">
                This request doesn&apos;t exist or you don&apos;t have permission to view it.
            </p>
            <Link href="/requests" className="inline-flex mt-6 btn-primary">
                Back to Requests
            </Link>
        </div>
    )
}