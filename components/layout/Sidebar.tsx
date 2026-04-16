/* eslint-disable react-hooks/static-components */
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { clsx } from 'clsx'
import {
    LayoutDashboard, ClipboardList, FolderOpen,
    GitBranch, Users, BarChart3, Settings, Zap, X,
} from 'lucide-react'
import type { UserRole } from '@/types'

interface NavItem {
    label: string
    href: string
    icon: React.ElementType
    roles?: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Requests', href: '/requests', icon: ClipboardList },
    { label: 'Files', href: '/files', icon: FolderOpen },
    { label: 'Workflows', href: '/workflows', icon: GitBranch, roles: ['admin'] },
    { label: 'Team', href: '/team', icon: Users, roles: ['admin'] },
    { label: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['admin', 'staff'] },
    { label: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
    role: UserRole
    mobileOpen?: boolean
    onMobileClose?: () => void
}

function NavContent({ role, onLinkClick }: { role: UserRole; onLinkClick?: () => void }) {
    const pathname = usePathname()
    const visible = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))

    return (
        <>
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {visible.map((item) => {
                    const active =
                        item.href === '/dashboard'
                            ? pathname === '/dashboard'
                            : pathname.startsWith(item.href)

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onLinkClick}
                            className={clsx(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                                active
                                    ? 'bg-brand-50 text-brand-700'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            )}
                        >
                            <item.icon className={clsx(
                                'w-4 h-4 shrink-0 transition-colors',
                                active ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                            )} />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="px-4 py-4 border-t border-slate-100">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50">
                    <div className={clsx(
                        'w-2 h-2 rounded-full',
                        role === 'admin' ? 'bg-brand-500' :
                            role === 'staff' ? 'bg-emerald-500' : 'bg-slate-400'
                    )} />
                    <span className="text-xs font-medium capitalize text-slate-500">{role} account</span>
                </div>
            </div>
        </>
    )
}

export default function Sidebar({ role, mobileOpen = false, onMobileClose }: SidebarProps) {
    // Lock body scroll when drawer is open
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [mobileOpen])

    const Logo = () => (
        <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-600 shrink-0">
                <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold font-display text-slate-900">FlowDesk</span>
        </div>
    )

    return (
        <>
            {/* ── Desktop sidebar (lg+) ── */}
            <aside className="flex-col hidden w-64 bg-white border-r lg:flex shrink-0 border-slate-200">
                {/* <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
                    <Logo />
                </div> */}
                <NavContent role={role} />
            </aside>

            {/* ── Mobile: backdrop ── */}
            <div
                aria-hidden="true"
                onClick={onMobileClose}
                className={clsx(
                    'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300',
                    mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                )}
            />

            {/* ── Mobile: drawer panel ── */}
            <div className={clsx(
                'fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white shadow-2xl lg:hidden',
                'transition-transform duration-300 ease-in-out',
                mobileOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <Logo />
                    <button
                        onClick={onMobileClose}
                        aria-label="Close menu"
                        className="p-2 transition-colors rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <NavContent role={role} onLinkClick={onMobileClose} />
            </div>
        </>
    )
}