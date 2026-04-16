'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import type { UserRole } from '@/types'

interface Props {
    role: UserRole
    user: { name: string; email: string; role: UserRole }
    children: React.ReactNode
}

export default function DashboardShell({ role, user, children }: Props) {
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <div className="flex overflow-hidden h-dvh bg-surface-50">
            <Sidebar
                role={role}
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
            />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <Topbar
                    user={user}
                    onMobileMenuOpen={() => setMobileOpen(true)}
                />
                <main className="flex-1 p-4 overflow-y-auto lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}