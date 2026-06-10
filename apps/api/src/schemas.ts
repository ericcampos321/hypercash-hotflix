import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
})

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

export const withdrawSchema = z.object({
  amount: z.number({ error: 'Valor inválido' }).positive('Valor deve ser positivo'),
})

export const checkoutSchema = z.object({
  idempotency_key: z.string().uuid('Chave de idempotência inválida'),
})
