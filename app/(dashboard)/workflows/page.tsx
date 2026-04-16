import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import WorkflowsManager from '@/components/dashboard/WorkflowsManager'
import { listTemplates } from '@/services/email.service'
import type { DBWorkflowRule, SafeUser } from '@/types'

export default async function WorkflowsPage() {
    const session = await getSession()
    if (!session) redirect('/login')
    if (session.role !== 'admin') redirect('/dashboard')

    const [rules, templates, staffUsers] = await Promise.all([
        query<DBWorkflowRule & { creator_name: string | null }>(`
      SELECT w.*, u.name AS creator_name
      FROM workflow_rules w
      LEFT JOIN users u ON u.id = w.created_by
      ORDER BY w.created_at DESC
    `),
        listTemplates(),
        query<SafeUser>(
            `SELECT id, name, email, role FROM users WHERE is_active = true AND role IN ('admin','staff') ORDER BY name`
        ),
    ])

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Workflow Rules</h1>
                    <p className="page-subtitle">
                        Automate actions when requests change — assign, notify, update status.
                    </p>
                </div>
            </div>

            <WorkflowsManager
                initialRules={rules}
                templates={templates}
                staffUsers={staffUsers}
            />
        </div>
    )
}