'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import Link from 'next/link'
import {
    Search, ChevronUp, ChevronDown,
    ChevronLeft, ChevronRight, ExternalLink
} from 'lucide-react'
import type { PaginatedResult, RequestWithUsers, PaginationParams, UserRole } from '@/types'

const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' },
]

const PRIORITY_OPTIONS = [
    { value: '', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
]

const SORT_COLUMNS = [
    { value: 'created_at', label: 'Date' },
    { value: 'title', label: 'Title' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'due_date', label: 'Due Date' },
]

interface Props {
    result: PaginatedResult<RequestWithUsers>
    currentParams: PaginationParams
    userRole: UserRole
}

export default function RequestsTable({ result, currentParams, userRole }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const [pending, startTransition] = useTransition()

    const updateParams = useCallback((updates: Record<string, string | undefined>) => {
        const sp = new URLSearchParams()

        const merged = { ...currentParams, ...updates }

        if (merged.page && merged.page > 1) sp.set('page', String(merged.page))
        if (merged.search) sp.set('search', merged.search)
        if (merged.status) sp.set('status', merged.status)
        if (merged.priority) sp.set('priority', merged.priority)
        if (merged.sort_by && merged.sort_by !== 'created_at') sp.set('sort_by', merged.sort_by)
        if (merged.sort_dir && merged.sort_dir !== 'desc') sp.set('sort_dir', merged.sort_dir)

        for (const [k, v] of Object.entries(updates)) {
            if (!v) sp.delete(k)
        }

        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`)
        })
    }, [currentParams, pathname, router])

    function toggleSort(col: string) {
        if (currentParams.sort_by === col) {
            updateParams({ sort_dir: currentParams.sort_dir === 'asc' ? 'desc' : 'asc', page: '1' })
        } else {
            updateParams({ sort_by: col, sort_dir: 'desc', page: '1' })
        }
    }

    function SortIcon({ col }: { col: string }) {
        if (currentParams.sort_by !== col) return <ChevronDown className="w-3.5 h-3.5 opacity-30" />
        return currentParams.sort_dir === 'asc'
            ? <ChevronUp className="w-3.5 h-3.5 text-brand-600" />
            : <ChevronDown className="w-3.5 h-3.5 text-brand-600" />
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="p-4 card">
                <div className="flex flex-wrap gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                        <input
                            type="search"
                            placeholder="Search requests…"
                            defaultValue={currentParams.search}
                            onChange={(e) => updateParams({ search: e.target.value || undefined, page: '1' })}
                            className="input pl-9"
                        />
                    </div>

                    {/* Status */}
                    <select
                        value={currentParams.status ?? ''}
                        onChange={(e) => updateParams({ status: e.target.value || undefined, page: '1' })}
                        className="w-auto input min-w-36"
                    >
                        {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    {/* Priority */}
                    <select
                        value={currentParams.priority ?? ''}
                        onChange={(e) => updateParams({ priority: e.target.value || undefined, page: '1' })}
                        className="w-auto input min-w-36"
                    >
                        {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className={`table-wrapper transition-opacity ${pending ? 'opacity-60' : 'opacity-100'}`}>
                <table className="table">
                    <thead>
                        <tr>
                            {SORT_COLUMNS.map((col) => (
                                <th key={col.value}>
                                    <button
                                        onClick={() => toggleSort(col.value)}
                                        className="flex items-center gap-1 transition-colors hover:text-slate-700"
                                    >
                                        {col.label} <SortIcon col={col.value} />
                                    </button>
                                </th>
                            ))}
                            <th>Submitted by</th>
                            {(userRole === 'admin' || userRole === 'staff') && <th>Assigned to</th>}
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {result.data.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-16 text-sm text-center text-slate-400">
                                    No requests found. Try adjusting your filters.
                                </td>
                            </tr>
                        ) : (
                            result.data.map((req) => (
                                <tr key={req.id}>
                                    <td>
                                        <Link
                                            href={`/requests/${req.id}`}
                                            className="font-medium transition-colors text-slate-900 hover:text-brand-700 line-clamp-1"
                                        >
                                            {req.title}
                                        </Link>
                                    </td>
                                    <td>
                                        <span className={`badge badge-${req.status}`}>
                                            {req.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge badge-${req.priority}`}>{req.priority}</span>
                                    </td>
                                    <td className="text-xs text-slate-500">
                                        {req.due_date
                                            ? new Date(req.due_date).toLocaleDateString()
                                            : '—'}
                                    </td>
                                    <td className="text-xs text-slate-500 whitespace-nowrap">
                                        {new Date(req.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="text-sm text-slate-600">{req.submitter_name}</td>
                                    {(userRole === 'admin' || userRole === 'staff') && (
                                        <td className="text-sm text-slate-500">{req.assignee_name ?? '—'}</td>
                                    )}
                                    <td>
                                        <Link href={`/requests/${req.id}`} className="btn-ghost btn-sm">
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {result.total_pages > 1 && (
                <div className="flex items-center justify-between px-1">
                    <p className="text-sm text-slate-500">
                        Showing {((result.page - 1) * result.per_page) + 1}–{Math.min(result.page * result.per_page, result.total)} of {result.total}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => updateParams({ page: String(result.page - 1) })}
                            disabled={result.page <= 1}
                            className="btn-secondary btn-sm disabled:opacity-40"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-3 py-1.5 text-sm text-slate-600">
                            {result.page} / {result.total_pages}
                        </span>
                        <button
                            onClick={() => updateParams({ page: String(result.page + 1) })}
                            disabled={result.page >= result.total_pages}
                            className="btn-secondary btn-sm disabled:opacity-40"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}