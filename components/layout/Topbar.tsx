'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, User, Settings, ChevronDown, Bell, Menu } from 'lucide-react'
import type { UserRole } from '@/types'

interface TopbarProps {
  user:           { name: string; email: string; role: UserRole }
  onMobileMenuOpen: () => void
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function Topbar({ user, onMobileMenuOpen }: TopbarProps) {
  const router  = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex items-center justify-between h-16 px-4 bg-white border-b shrink-0 lg:px-6 border-slate-200">
      {/* Left: hamburger (mobile) + logo text */}
      <div className="flex items-center gap-3">
        {/* Hamburger — only visible below lg */}
        <button
          onClick={onMobileMenuOpen}
          aria-label="Open navigation menu"
          className="p-2 transition-colors rounded-lg lg:hidden text-slate-500 hover:text-slate-700 hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>

        <span className="text-base font-semibold font-display text-slate-900 lg:hidden">
          FlowDesk
        </span>
      </div>

      {/* Right: bell + user menu */}
      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="relative p-2 transition-colors rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
        >
          <Bell className="w-4 h-4" />
        </button>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center justify-center text-sm font-semibold text-gray-700 rounded-full w-7 h-7 bg-brand-600 shrink-0">
              {getInitials(user.name)}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight text-slate-800">{user.name}</p>
              <p className="text-xs leading-tight capitalize text-slate-400">{user.role}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 z-50 w-56 py-1 mt-2 bg-white border shadow-lg top-full rounded-xl border-slate-200 animate-scale-in">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs truncate text-slate-400">{user.email}</p>
              </div>

              <div className="py-1">
                <Link href="/settings" onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                  <User className="w-4 h-4 text-slate-400" /> Profile
                </Link>
                <Link href="/settings" onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                  <Settings className="w-4 h-4 text-slate-400" /> Settings
                </Link>
              </div>

              <div className="py-1 border-t border-slate-100">
                <button onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}