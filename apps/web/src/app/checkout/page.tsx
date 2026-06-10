'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '../../stores/useUserStore'
import { CheckoutForm } from '../../components/CheckoutForm'

export default function CheckoutPage() {
  const router = useRouter()
  const { token } = useUserStore()

  useEffect(() => {
    if (!token) router.push('/')
  }, [token, router])

  if (!token) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-800 text-center mb-8">Finalizar Compra</h1>
      <CheckoutForm />
    </div>
  )
}
