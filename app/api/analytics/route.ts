import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/response";

export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireRole(["admin", "staff"]);

  const url = new URL(req.url);
  const days = Math.min(
    90,
    Math.max(7, parseInt(url.searchParams.get("days") ?? "30")),
  );

  const [
    overview,
    trend,
    statusDist,
    priorityDist,
    topSubmitters,
    recentActivity,
  ] = await Promise.all([
    // Overview counts
    queryOne(`
        SELECT
          COUNT(*)                                                        AS total_requests,
          COUNT(*) FILTER (WHERE status = 'pending')                     AS pending,
          COUNT(*) FILTER (WHERE status = 'in_progress')                 AS in_progress,
          COUNT(*) FILTER (WHERE status = 'review')                      AS review,
          COUNT(*) FILTER (WHERE status = 'completed')                   AS completed,
          COUNT(*) FILTER (WHERE status = 'rejected')                    AS rejected,
          COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')  AS this_week,
          COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') AS this_month,
          ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)
            FILTER (WHERE completed_at IS NOT NULL), 1)                  AS avg_completion_hours,
          COUNT(*) FILTER (WHERE priority = 'urgent')                    AS urgent_count
        FROM requests
      `),

    // Daily trend
    query(
      `
        SELECT
          DATE_TRUNC('day', created_at)::date AS date,
          COUNT(*)                             AS count
        FROM requests
        WHERE created_at >= now() - ($1 || ' days')::interval
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      [days],
    ),

    // Status distribution
    query(`
        SELECT status, COUNT(*) AS count
        FROM requests
        GROUP BY status
        ORDER BY count DESC
      `),

    // Priority distribution
    query(`
        SELECT priority, COUNT(*) AS count
        FROM requests
        GROUP BY priority
        ORDER BY count DESC
      `),

    // Top submitters
    query(`
        SELECT
          u.name,
          u.email,
          COUNT(r.id)                                              AS total,
          COUNT(r.id) FILTER (WHERE r.status = 'completed')       AS completed,
          COUNT(r.id) FILTER (WHERE r.status = 'pending')         AS pending
        FROM users u
        LEFT JOIN requests r ON r.submitted_by = u.id
        GROUP BY u.id, u.name, u.email
        HAVING COUNT(r.id) > 0
        ORDER BY total DESC
        LIMIT 8
      `),

    // Recent analytics events (last 50)
    query(`
        SELECT ae.event_type, ae.entity_type, ae.created_at, u.name AS user_name
        FROM analytics_events ae
        LEFT JOIN users u ON u.id = ae.user_id
        ORDER BY ae.created_at DESC
        LIMIT 50
      `),
  ]);

  // Email stats
  const emailStats = await queryOne(`
    SELECT
      COUNT(*)                                      AS total_sent,
      COUNT(*) FILTER (WHERE status = 'failed')     AS failed,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') AS this_week
    FROM email_log
  `);

  // File stats
  const fileStats = await queryOne(`
    SELECT
      COUNT(*)              AS total_files,
      SUM(file_size)        AS total_bytes,
      COUNT(DISTINCT uploaded_by) AS uploaders
    FROM files
  `);

  // User stats
  const userStats = await queryOne(`
    SELECT
      COUNT(*)                                             AS total_users,
      COUNT(*) FILTER (WHERE role = 'admin')              AS admins,
      COUNT(*) FILTER (WHERE role = 'staff')              AS staff,
      COUNT(*) FILTER (WHERE role = 'user')               AS users,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') AS new_this_month
    FROM users
    WHERE is_active = true
  `);

  return ok({
    overview,
    trend,
    statusDist,
    priorityDist,
    topSubmitters,
    recentActivity,
    emailStats,
    fileStats,
    userStats,
    days,
  });
});
