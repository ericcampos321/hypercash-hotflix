'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useUserStore } from '../../stores/useUserStore'
import { api } from '../../lib/api'
import { WithdrawForm } from '../../components/WithdrawForm'

interface Transaction {
  id: string
  type: string
  amount: string
  status: string
  createdAt: string
}

const TYPE_LABELS: Record<string, string> = {
  credit: 'Crédito',
  debit: 'Saque',
  checkout: 'Pagamento',
}

const TYPE_COLORS: Record<string, string> = {
  credit: 'text-green-600',
  debit: 'text-red-600',
  checkout: 'text-orange-600',
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, balance, token } = useUserStore()

  useEffect(() => {
    if (!token) router.push('/')
  }, [token, router])

  const { data: txData } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.get<{ transactions: Transaction[] }>('/api/transactions'),
    enabled: !!token,
  })

  if (!user) return null

  const transactions = txData?.transactions ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white">
        <p className="text-blue-100 text-sm mb-1">Saldo disponível</p>
        <p className="text-4xl font-bold">
          {balance !== null ? `R$ ${balance.toFixed(2)}` : '—'}
        </p>
        <p className="text-blue-100 text-sm mt-2">Olá, {user.name}</p>
      </div>

      <WithdrawForm />

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Histórico de Transações</h2>

        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhuma transação encontrada</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {transactions.map((tx) => (
              <li key={tx.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {TYPE_LABELS[tx.type] ?? tx.type}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(tx.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${TYPE_COLORS[tx.type] ?? 'text-gray-800'}`}>
                    {tx.type === 'credit' ? '+' : '-'} R$ {Number(tx.amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">{tx.status}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
