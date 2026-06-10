'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useUserStore } from '../stores/useUserStore'
import { api } from '../lib/api'

const withdrawSchema = z.object({
  amount: z
    .string()
    .min(1, 'Informe um valor válido')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Valor deve ser positivo'),
})

type WithdrawData = z.infer<typeof withdrawSchema>

export function WithdrawForm() {
  const queryClient = useQueryClient()
  const setBalance = useUserStore((s) => s.setBalance)

  const form = useForm<WithdrawData>({
    resolver: zodResolver(withdrawSchema),
  })

  const mutation = useMutation({
    mutationFn: (data: WithdrawData) =>
      api.post<{ newBalance: number }>('/api/withdraw', { amount: Number(data.amount) }),
    onSuccess: (data) => {
      setBalance(data.newBalance)
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      form.reset()
    },
    onError: (err: Error) => {
      form.setError('root', { message: err.message })
    },
  })

  function onSubmit(data: WithdrawData) {
    form.clearErrors('root')
    mutation.mutate(data)
  }

  const successMsg = mutation.isSuccess
    ? `Saque de R$ ${Number(mutation.variables?.amount).toFixed(2)} realizado com sucesso`
    : null

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Realizar Saque</h2>

      {successMsg && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {form.formState.errors.root && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {form.formState.errors.root.message}
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
          <input
            type="number"
            {...form.register('amount')}
            min="0.01"
            step="0.01"
            placeholder="0,00"
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? 'Processando...' : 'Sacar'}
        </button>
      </form>

      {form.formState.errors.amount && (
        <p className="mt-2 text-xs text-red-600">{form.formState.errors.amount.message}</p>
      )}
    </div>
  )
}
