'use client'

import { useMemo } from 'react'
import {
    ClipboardList, CheckCircle2, Clock, TrendingUp,
    Mail, FileText, Users, AlertTriangle
} from 'lucide-react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Overview {
    total_requests: string; pending: string; in_progress: string
    review: string; completed: string; rejected: string
    this_week: string; this_month: string
    avg_completion_hours: string | null; urgent_count: string
}
interface TrendPoint { date: string; count: string }
interface StatusRow { status: string; count: string }
interface PriorityRow { priority: string; count: string }
interface SubmitterRow { name: string; email: string; total: string; completed: string; pending: string }
interface EmailStats { total_sent: string; failed: string; this_week: string }
interface FileStats { total_files: string; total_bytes: string }
interface UserStats { total_users: string; admins: string; staff: string; users: string; new_this_month: string }

interface Props {
    overview: Overview
    trend: TrendPoint[]
    statusDist: StatusRow[]
    priorityDist: PriorityRow[]
    topSubmitters: SubmitterRow[]
    emailStats: EmailStats
    fileStats: FileStats
    userStats: UserStats
    days: number
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function n(v: string | null | undefined) { return parseInt(v ?? '0') || 0 }
function fmt(v: string | null | undefined) { return n(v).toLocaleString() }
function fmtBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
    return `${(bytes / 1073741824).toFixed(2)} GB`
}

const STATUS_COLORS: Record<string, string> = {
    pending: '#f59e0b',
    in_progress: '#3b82f6',
    review: '#8b5cf6',
    completed: '#10b981',
    rejected: '#ef4444',
}

const PRIORITY_COLORS: Record<string, string> = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#f97316',
    urgent: '#ef4444',
}

// ─────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, iconClass }: {
    label: string; value: string | number; sub?: string
    icon: React.ElementType; iconClass: string
}) {
    return (
        <div className="p-5 card">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium tracking-wide uppercase text-slate-500">{label}</p>
                    <p className="mt-1 text-3xl font-bold font-display text-slate-900">{value}</p>
                    {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
                </div>
                <div className={`p-2.5 rounded-xl ${iconClass}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Sparkline bar chart (pure SVG, no deps)
// ─────────────────────────────────────────────
function SparkBars({ data, color = '#6366f1' }: { data: number[]; color?: string }) {
    const max = Math.max(...data, 1)
    const W = 200; const H = 48; const gap = 2
    const barW = (W - gap * (data.length - 1)) / data.length

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
            {data.map((v, i) => {
                const h = Math.max(2, (v / max) * H)
                const x = i * (barW + gap)
                const y = H - h
                const alpha = 0.3 + 0.7 * (v / max)
                return (
                    <rect key={i} x={x} y={y} width={barW} height={h}
                        fill={color} opacity={alpha} rx="2" />
                )
            })}
        </svg>
    )
}

// ─────────────────────────────────────────────
// Donut chart (pure SVG)
// ─────────────────────────────────────────────
function DonutChart({ segments }: {
    segments: { label: string; value: number; color: string }[]
}) {
    const total = segments.reduce((a, s) => a + s.value, 0) || 1
    const R = 42; const cx = 56; const cy = 56; const stroke = 14

    let cumulative = 0
    const arcs = segments.map((seg) => {
        const pct = seg.value / total
        const start = cumulative
        // eslint-disable-next-line react-hooks/immutability
        cumulative += pct
        return { ...seg, pct, start }
    })

    function arc(startPct: number, endPct: number) {
        const startAngle = startPct * 2 * Math.PI - Math.PI / 2
        const endAngle = endPct * 2 * Math.PI - Math.PI / 2
        const x1 = cx + R * Math.cos(startAngle)
        const y1 = cy + R * Math.sin(startAngle)
        const x2 = cx + R * Math.cos(endAngle)
        const y2 = cy + R * Math.sin(endAngle)
        const large = endPct - startPct > 0.5 ? 1 : 0
        return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`
    }

    return (
        <div className="flex items-center gap-4">
            <svg viewBox="0 0 112 112" className="w-24 h-24 shrink-0">
                {/* Track */}
                <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
                {/* Segments */}
                {arcs.map((seg, i) => (
                    <path
                        key={i}
                        d={arc(seg.start, seg.start + seg.pct)}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={stroke}
                        strokeLinecap="butt"
                    />
                ))}
                {/* Center text */}
                <text x={cx} y={cy - 4} textAnchor="middle" className="text-xs" fontSize="14" fontWeight="700" fill="#0f172a">{total}</text>
                <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#94a3b8">total</text>
            </svg>

            <div className="space-y-1.5 flex-1 min-w-0">
                {segments.map((seg) => (
                    <div key={seg.label} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                            <span className="text-xs capitalize truncate text-slate-500">{seg.label.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs font-semibold text-slate-800">{seg.value}</span>
                            <span className="text-xs text-slate-400">
                                {total > 0 ? `${Math.round((seg.value / total) * 100)}%` : '0%'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Trend chart (SVG line)
// ─────────────────────────────────────────────
function TrendChart({ data, days }: { data: TrendPoint[]; days: number }) {
    const counts = useMemo(() => {
        const map: Record<string, number> = {}
        data.forEach((d) => { map[d.date] = n(d.count) })

        const result: { date: string; count: number }[] = []
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const key = d.toISOString().split('T')[0]
            result.push({ date: key, count: map[key] ?? 0 })
        }
        return result
    }, [data, days])

    const max = Math.max(...counts.map((c) => c.count), 1)
    const W = 500; const H = 80; const pad = 4

    const points = counts.map((c, i) => ({
        x: pad + (i / (counts.length - 1)) * (W - pad * 2),
        y: H - pad - ((c.count / max) * (H - pad * 2)),
    }))

    const polyline = points.map((p) => `${p.x},${p.y}`).join(' ')
    const area = `M ${points[0].x} ${H} ` +
        points.map((p) => `L ${p.x} ${p.y}`).join(' ') +
        ` L ${points[points.length - 1].x} ${H} Z`

    const totalInPeriod = counts.reduce((a, c) => a + c.count, 0)

    return (
        <div>
            <div className="flex items-baseline justify-between mb-3">
                <p className="text-sm text-slate-500">Submissions over {days} days</p>
                <p className="text-lg font-bold font-display text-slate-900">{totalInPeriod.toLocaleString()} total</p>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={area} fill="url(#areaGrad)" />
                <polyline points={polyline} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {points.map((p, i) => (
                    counts[i].count > 0 && (
                        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1" />
                    )
                ))}
            </svg>
            <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-400">{counts[0]?.date}</span>
                <span className="text-xs text-slate-400">{counts[counts.length - 1]?.date}</span>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export default function AnalyticsDashboard({
    overview, trend, statusDist, priorityDist,
    topSubmitters, emailStats, fileStats, userStats, days,
}: Props) {
    const total = n(overview.total_requests)
    const completed = n(overview.completed)
    const compRate = total > 0 ? Math.round((completed / total) * 100) : 0

    const statusSegments = statusDist.map((s) => ({
        label: s.status, value: n(s.count), color: STATUS_COLORS[s.status] ?? '#94a3b8',
    }))

    const prioritySegments = priorityDist.map((p) => ({
        label: p.priority, value: n(p.count), color: PRIORITY_COLORS[p.priority] ?? '#94a3b8',
    }))

    return (
        <div className="space-y-6">
            {/* Top KPIs */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                    label="Total Requests"
                    value={fmt(overview.total_requests)}
                    sub={`${fmt(overview.this_week)} this week`}
                    icon={ClipboardList}
                    iconClass="bg-brand-50 text-brand-600"
                />
                <StatCard
                    label="Completion Rate"
                    value={`${compRate}%`}
                    sub={`${fmt(overview.completed)} completed`}
                    icon={CheckCircle2}
                    iconClass="bg-emerald-50 text-emerald-600"
                />
                <StatCard
                    label="Avg. Resolution"
                    value={overview.avg_completion_hours ? `${overview.avg_completion_hours}h` : '—'}
                    sub="Hours to complete"
                    icon={Clock}
                    iconClass="bg-blue-50 text-blue-600"
                />
                <StatCard
                    label="Pending / Urgent"
                    value={`${fmt(overview.pending)} / ${fmt(overview.urgent_count)}`}
                    sub="Need attention"
                    icon={AlertTriangle}
                    iconClass="bg-amber-50 text-amber-600"
                />
            </div>

            {/* Second row KPIs */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                    label="Emails Sent"
                    value={fmt(emailStats?.total_sent)}
                    sub={`${fmt(emailStats?.this_week)} this week`}
                    icon={Mail}
                    iconClass="bg-violet-50 text-violet-600"
                />
                <StatCard
                    label="Files Stored"
                    value={fmt(fileStats?.total_files)}
                    sub={fmtBytes(n(fileStats?.total_bytes))}
                    icon={FileText}
                    iconClass="bg-teal-50 text-teal-600"
                />
                <StatCard
                    label="Active Users"
                    value={fmt(userStats?.total_users)}
                    sub={`${fmt(userStats?.new_this_month)} new this month`}
                    icon={Users}
                    iconClass="bg-pink-50 text-pink-600"
                />
                <StatCard
                    label="This Month"
                    value={fmt(overview.this_month)}
                    sub="Requests submitted"
                    icon={TrendingUp}
                    iconClass="bg-orange-50 text-orange-600"
                />
            </div>

            {/* Trend chart */}
            <div className="p-6 card">
                <TrendChart data={trend} days={days} />
            </div>

            {/* Distributions + top submitters */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Status donut */}
                <div className="p-6 card">
                    <p className="mb-4 text-sm font-semibold text-slate-700">By Status</p>
                    <DonutChart segments={statusSegments} />
                </div>

                {/* Priority donut */}
                <div className="p-6 card">
                    <p className="mb-4 text-sm font-semibold text-slate-700">By Priority</p>
                    <DonutChart segments={prioritySegments} />
                </div>

                {/* Team breakdown */}
                <div className="p-6 card">
                    <p className="mb-4 text-sm font-semibold text-slate-700">Team Breakdown</p>
                    <div className="space-y-3">
                        {[
                            { label: 'Admins', value: n(userStats?.admins), color: 'bg-brand-500' },
                            { label: 'Staff', value: n(userStats?.staff), color: 'bg-violet-500' },
                            { label: 'Users', value: n(userStats?.users), color: 'bg-slate-400' },
                        ].map(({ label, value, color }) => {
                            const total = n(userStats?.total_users) || 1
                            const pct = Math.round((value / total) * 100)
                            return (
                                <div key={label}>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm text-slate-600">{label}</span>
                                        <span className="text-sm font-semibold text-slate-800">{value}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="pt-4 mt-4 space-y-2 border-t border-slate-100">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Email failures</span>
                            <span className={`font-semibold ${n(emailStats?.failed) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {fmt(emailStats?.failed)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">In review</span>
                            <span className="font-semibold text-violet-600">{fmt(overview.review)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Rejected</span>
                            <span className="font-semibold text-red-500">{fmt(overview.rejected)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top submitters */}
            <div className="card">
                <div className="px-6 py-4 border-b border-slate-100">
                    <p className="font-semibold font-display text-slate-900">Top Submitters</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th className="text-right">Total</th>
                                <th className="text-right">Completed</th>
                                <th className="text-right">Pending</th>
                                <th>Completion Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topSubmitters.length === 0 ? (
                                <tr><td colSpan={5} className="py-10 text-sm text-center text-slate-400">No data yet.</td></tr>
                            ) : topSubmitters.map((row, i) => {
                                const total = n(row.total)
                                const comp = n(row.completed)
                                const rate = total > 0 ? Math.round((comp / total) * 100) : 0
                                return (
                                    <tr key={i}>
                                        <td>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{row.name}</p>
                                                <p className="text-xs text-slate-400">{row.email}</p>
                                            </div>
                                        </td>
                                        <td className="font-semibold text-right text-slate-900">{total}</td>
                                        <td className="font-medium text-right text-emerald-600">{comp}</td>
                                        <td className="font-medium text-right text-amber-600">{n(row.pending)}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} />
                                                </div>
                                                <span className="w-8 text-xs text-right text-slate-500">{rate}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}