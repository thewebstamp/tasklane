import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import TeamManager from '@/components/dashboard/TeamManager'
import type { SafeUser } from '@/types'

export default async function TeamPage() {
    const session = await getSession()
    if (!session) redirect('/login')
    if (session.role !== 'admin') redirect('/dashboard')

    const users = await query<SafeUser & { request_count: string }>(`
    SELECT
      u.id, u.name, u.email, u.role, u.avatar_url, u.is_active,
      u.created_at, u.updated_at,
      COUNT(r.id) AS request_count
    FROM users u
    LEFT JOIN requests r ON r.submitted_by = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `)

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Team Management</h1>
                    <p className="page-subtitle">
                        Manage user accounts, roles, and access control.
                    </p>
                </div>
            </div>

            <TeamManager
                initialUsers={users}
                currentUserId={session.sub}
            />
        </div>
    )
}