'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUserStore } from '../stores/useUserStore'

export function Header() {
  const { user, balance, logout } = useUserStore()
  const router = useRouter()

  function handleLogout() {
    logout()
    router.push('/')
  }

  if (!user) return null

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-blue-600 text-lg">HyperCash</span>
          <nav className="flex gap-4 text-sm">
            <Link href="/dashboard" className="text-gray-600 hover:text-blue-600">
              Dashboard
            </Link>
            <Link href="/checkout" className="text-gray-600 hover:text-blue-600">
              Checkout
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Saldo:{' '}
            <span className="font-semibold text-gray-900">
              {balance !== null ? `R$ ${balance.toFixed(2)}` : '—'}
            </span>
          </div>
          <span className="text-sm text-gray-500">{user.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
