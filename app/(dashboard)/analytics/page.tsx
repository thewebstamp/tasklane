/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query, queryOne } from '@/lib/db'
import AnalyticsDashboard from '@/components/dashboard/AnalyticsDashboard'

export default async function AnalyticsPage() {
    const session = await getSession()
    if (!session) redirect('/login')
    if (session.role === 'user') redirect('/dashboard')

    const days = 30

    const [overview, trend, statusDist, priorityDist, topSubmitters, emailStats, fileStats, userStats] =
        await Promise.all([
            queryOne(`
        SELECT
          COUNT(*)                                                          AS total_requests,
          COUNT(*) FILTER (WHERE status = 'pending')                       AS pending,
          COUNT(*) FILTER (WHERE status = 'in_progress')                   AS in_progress,
          COUNT(*) FILTER (WHERE status = 'review')                        AS review,
          COUNT(*) FILTER (WHERE status = 'completed')                     AS completed,
          COUNT(*) FILTER (WHERE status = 'rejected')                      AS rejected,
          COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')  AS this_week,
          COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') AS this_month,
          ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)
            FILTER (WHERE completed_at IS NOT NULL), 1)                    AS avg_completion_hours,
          COUNT(*) FILTER (WHERE priority = 'urgent')                      AS urgent_count
        FROM requests
      `),

            query(`
        SELECT DATE_TRUNC('day', created_at)::date AS date, COUNT(*) AS count
        FROM requests
        WHERE created_at >= now() - ($1 || ' days')::interval
        GROUP BY 1 ORDER BY 1 ASC
      `, [days]),

            query(`SELECT status, COUNT(*) AS count FROM requests GROUP BY status ORDER BY count DESC`),
            query(`SELECT priority, COUNT(*) AS count FROM requests GROUP BY priority ORDER BY count DESC`),

            query(`
        SELECT u.name, u.email,
          COUNT(r.id)                                              AS total,
          COUNT(r.id) FILTER (WHERE r.status = 'completed')       AS completed,
          COUNT(r.id) FILTER (WHERE r.status = 'pending')         AS pending
        FROM users u
        LEFT JOIN requests r ON r.submitted_by = u.id
        GROUP BY u.id, u.name, u.email
        HAVING COUNT(r.id) > 0
        ORDER BY total DESC LIMIT 8
      `),

            queryOne(`
        SELECT COUNT(*) AS total_sent,
          COUNT(*) FILTER (WHERE status = 'failed')     AS failed,
          COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') AS this_week
        FROM email_log
      `),

            queryOne(`
        SELECT COUNT(*) AS total_files, COALESCE(SUM(file_size), 0) AS total_bytes
        FROM files
      `),

            queryOne(`
        SELECT COUNT(*) AS total_users,
          COUNT(*) FILTER (WHERE role = 'admin') AS admins,
          COUNT(*) FILTER (WHERE role = 'staff') AS staff,
          COUNT(*) FILTER (WHERE role = 'user')  AS users,
          COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') AS new_this_month
        FROM users WHERE is_active = true
      `),
        ])

    return (
        <div className="mx-auto space-y-8 max-w-7xl">
            <div>
                <h1 className="page-title">Analytics</h1>
                <p className="page-subtitle">Real-time metrics across requests, email, files, and team activity.</p>
            </div>

            <AnalyticsDashboard
                overview={overview as any}
                trend={trend as any}
                statusDist={statusDist as any}
                priorityDist={priorityDist as any}
                topSubmitters={topSubmitters as any}
                emailStats={emailStats as any}
                fileStats={fileStats as any}
                userStats={userStats as any}
                days={days}
            />
        </div>
    )
}