import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listTemplates } from '@/services/email.service'
import { listEmailLog } from '@/services/email.service'
import SettingsTabs from '@/components/dashboard/SettingsTabs'

export default async function SettingsPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const isAdmin = session.role === 'admin'
    const isStaff = session.role === 'admin' || session.role === 'staff'

    const [templates, emailLog] = await Promise.all([
        isStaff ? listTemplates() : Promise.resolve([]),
        isStaff ? listEmailLog({ page: 1, per_page: 20 }) : Promise.resolve({ data: [], total: 0 }),
    ])

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">Manage your account, email templates, and system configuration.</p>
            </div>

            <SettingsTabs
                user={{ id: session.sub, name: session.name, email: session.email, role: session.role }}
                templates={templates}
                emailLog={emailLog.data}
                emailLogTotal={emailLog.total}
                isAdmin={isAdmin}
                isStaff={isStaff}
            />
        </div>
    )
}