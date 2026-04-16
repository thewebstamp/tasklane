import { getSession } from '@/lib/auth'
import { queryOne, query } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
    ClipboardList, Clock, CheckCircle2,
    TrendingUp, Plus, ArrowRight
} from 'lucide-react'
import type { RequestWithUsers, AnalyticsOverview } from '@/types'

// ─────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────

async function getOverview(userId: string, role: string): Promise<AnalyticsOverview> {
    const isStaff = role === 'admin' || role === 'staff'

    const row = await queryOne<AnalyticsOverview>(`
    SELECT
      COUNT(*)                                          AS total_requests,
      COUNT(*) FILTER (WHERE status = 'pending')       AS pending,
      COUNT(*) FILTER (WHERE status = 'in_progress')   AS in_progress,
      COUNT(*) FILTER (WHERE status = 'review')        AS review,
      COUNT(*) FILTER (WHERE status = 'completed')     AS completed,
      COUNT(*) FILTER (WHERE status = 'rejected')      AS rejected,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')   AS requests_this_week,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days')  AS requests_this_month,
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)
        FILTER (WHERE completed_at IS NOT NULL)        AS avg_completion_hours
    FROM requests
    ${isStaff ? '' : 'WHERE submitted_by = $1'}
  `, isStaff ? [] : [userId])

    const [fileCount, userCount, emailCount] = await Promise.all([
        queryOne<{ count: string }>('SELECT COUNT(*) FROM files'),
        queryOne<{ count: string }>('SELECT COUNT(*) FROM users WHERE is_active = true'),
        queryOne<{ count: string }>('SELECT COUNT(*) FROM email_log WHERE status = $1', ['sent']),
    ])

    return {
        ...row!,
        total_files: parseInt(fileCount?.count ?? '0'),
        total_users: parseInt(userCount?.count ?? '0'),
        emails_sent: parseInt(emailCount?.count ?? '0'),
    }
}

async function getRecentRequests(userId: string, role: string): Promise<RequestWithUsers[]> {
    const isStaff = role === 'admin' || role === 'staff'

    return query<RequestWithUsers>(`
    SELECT
      r.*,
      u1.name  AS submitter_name,
      u1.email AS submitter_email,
      u2.name  AS assignee_name,
      u2.email AS assignee_email
    FROM requests r
    JOIN users u1 ON u1.id = r.submitted_by
    LEFT JOIN users u2 ON u2.id = r.assigned_to
    ${isStaff ? '' : 'WHERE r.submitted_by = $1'}
    ORDER BY r.created_at DESC
    LIMIT 5
  `, isStaff ? [] : [userId])
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function StatCard({
    label, value, icon: Icon, color, sub,
}: {
    label: string
    value: number | string
    icon: React.ElementType
    color: string
    sub?: string
}) {
    return (
        <div className="p-5 card">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <p className="mt-1 text-3xl font-semibold font-display text-slate-900">{value}</p>
                    {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
                </div>
                <div className={`p-2.5 rounded-xl ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    )
}

const STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    review: 'Review',
    completed: 'Completed',
    rejected: 'Rejected',
}

const PRIORITY_LABELS: Record<string, string> = {
    low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function DashboardPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const [overview, recent] = await Promise.all([
        getOverview(session.sub, session.role),
        getRecentRequests(session.sub, session.role),
    ])

    const completionRate = overview.total_requests > 0
        ? Math.round((Number(overview.completed) / Number(overview.total_requests)) * 100)
        : 0

    return (
        <div className="mx-auto space-y-8 max-w-7xl">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Good to see you, {session.name.split(' ')[0]} 👋</h1>
                    <p className="page-subtitle">Here&apos;s what&apos;s happening across your workspace.</p>
                </div>
                <Link href="/requests/new" className="btn-primary">
                    <Plus className="w-4 h-4" />
                    New Request
                </Link>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Total Requests"
                    value={Number(overview.total_requests).toLocaleString()}
                    icon={ClipboardList}
                    color="bg-brand-50 text-brand-600"
                    sub={`${overview.requests_this_week} this week`}
                />
                <StatCard
                    label="Pending"
                    value={Number(overview.pending).toLocaleString()}
                    icon={Clock}
                    color="bg-amber-50 text-amber-600"
                    sub="Awaiting action"
                />
                <StatCard
                    label="In Progress"
                    value={Number(overview.in_progress).toLocaleString()}
                    icon={TrendingUp}
                    color="bg-blue-50 text-blue-600"
                    sub="Being worked on"
                />
                <StatCard
                    label="Completed"
                    value={Number(overview.completed).toLocaleString()}
                    icon={CheckCircle2}
                    color="bg-emerald-50 text-emerald-600"
                    sub={`${completionRate}% completion rate`}
                />
            </div>

            {/* Two-column: recent requests + pipeline */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                {/* Recent Requests */}
                <div className="xl:col-span-2 card">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h2 className="font-semibold font-display text-slate-900">Recent Requests</h2>
                        <Link href="/requests" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
                            View all <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {recent.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                            <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-slate-100">
                                <ClipboardList className="w-5 h-5 text-slate-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-600">No requests yet</p>
                            <p className="mt-1 text-xs text-slate-400">Submit your first request to get started</p>
                            <Link href="/requests/new" className="mt-4 btn-primary btn-sm">
                                <Plus className="w-3.5 h-3.5" /> New Request
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {recent.map((req) => (
                                <Link
                                    key={req.id}
                                    href={`/requests/${req.id}`}
                                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50/70 group"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate transition-colors text-slate-900 group-hover:text-brand-700">
                                            {req.title}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            by {req.submitter_name} · {new Date(req.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`badge badge-${req.priority}`}>
                                            {PRIORITY_LABELS[req.priority]}
                                        </span>
                                        <span className={`badge badge-${req.status}`}>
                                            {STATUS_LABELS[req.status]}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Status pipeline */}
                <div className="card">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h2 className="font-semibold font-display text-slate-900">Pipeline Overview</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        {(
                            [
                                { key: 'pending', label: 'Pending', color: 'bg-amber-400' },
                                { key: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
                                { key: 'review', label: 'In Review', color: 'bg-violet-500' },
                                { key: 'completed', label: 'Completed', color: 'bg-emerald-500' },
                                { key: 'rejected', label: 'Rejected', color: 'bg-red-400' },
                            ] as const
                        ).map(({ key, label, color }) => {
                            const count = Number(overview[key as keyof AnalyticsOverview]) || 0
                            const total = Number(overview.total_requests) || 1
                            const pct = Math.round((count / total) * 100)

                            return (
                                <div key={key}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm text-slate-600">{label}</span>
                                        <span className="text-sm font-medium text-slate-900">{count}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${color} rounded-full transition-all duration-500`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Quick metrics */}
                    <div className="px-6 py-4 space-y-3 border-t border-slate-100">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Avg. completion</span>
                            <span className="font-medium text-slate-900">
                                {overview.avg_completion_hours
                                    ? `${Math.round(Number(overview.avg_completion_hours))}h`
                                    : '—'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Files stored</span>
                            <span className="font-medium text-slate-900">{Number(overview.total_files).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Emails sent</span>
                            <span className="font-medium text-slate-900">{Number(overview.emails_sent).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}