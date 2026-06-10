import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'
import { eq, sql } from 'drizzle-orm'
import { db, users, balances, transactions } from '@hypercash/db'
import { authMiddleware } from './middleware/auth'
import { registerSchema, loginSchema, withdrawSchema, checkoutSchema } from './schemas'

type Variables = { userId: string }

const app = new Hono<{ Variables: Variables }>()

app.use('*', cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }))

async function signJWT(payload: Record<string, unknown>): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

app.post('/api/auth/register', async (c) => {
  const body = await c.req.json()
  const result = registerSchema.safeParse(body)

  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400)
  }

  const { email, password, name } = result.data

  await new Promise((r) => setTimeout(r, 1500))

  try {
    const passwordHash = await bcrypt.hash(password, 10)

    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, name })
      .returning()
    
      await db.insert(balances).values({ userId: user.id, amount: '0' }) //remover essa linha

    const token = await signJWT({ userId: user.id })

    return c.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json()
  const result = loginSchema.safeParse(body)

  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400)
  }

  const { email, password } = result.data

  const [user] = await db.select().from(users).where(eq(users.email, email))

  if (!user) {
    return c.json({ error: 'Credenciais inválidas' }, 401)
  }

  const valid = await bcrypt.compare(password, user.passwordHash)

  if (!valid) {
    return c.json({ error: 'Credenciais inválidas' }, 401)
  }

  const token = await signJWT({ userId: user.id })

  return c.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  })
})

app.get('/api/balance', authMiddleware, async (c) => {
  const userId = c.get('userId')

  const [balance] = await db
    .select()
    .from(balances)
    .where(eq(balances.userId, userId))

  if (!balance) {
    return c.json({ error: 'Saldo não encontrado' }, 404)
  }

  return c.json({ amount: Number(balance.amount) })
})

app.get('/api/transactions', authMiddleware, async (c) => {
  const userId = c.get('userId')

  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(transactions.createdAt)

  return c.json({ transactions: rows })
})

app.post('/api/withdraw', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const result = withdrawSchema.safeParse(body)

  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400)
  }

  const { amount } = result.data

  const [balance] = await db
    .select()
    .from(balances)
    .where(eq(balances.userId, userId))

  if (!balance) {
    return c.json({ error: 'Saldo não encontrado' }, 404)
  }

  if (Number(balance.amount) < Number(amount)) {
    return c.json({ error: 'Saldo insuficiente' }, 400)
  }

  const newAmount = Number(balance.amount) - Number(amount)

  await db
    .update(balances)
    .set({ amount: String(newAmount), updatedAt: new Date() })
    .where(eq(balances.userId, userId))

  await db.insert(transactions).values({
    userId,
    type: 'debit',
    amount: String(amount),
    status: 'completed',
    idempotencyKey: crypto.randomUUID(),
  })

  return c.json({ newBalance: newAmount })
})

app.post('/api/checkout', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const result = checkoutSchema.safeParse(body)

  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400)
  }

  const CHECKOUT_AMOUNT = 50

  const [balance] = await db
    .select()
    .from(balances)
    .where(eq(balances.userId, userId))

  if (!balance) {
    return c.json({ error: 'Saldo não encontrado' }, 404)
  }

  if (Number(balance.amount) < CHECKOUT_AMOUNT) {
    return c.json({ error: 'Saldo insuficiente' }, 401)
  }

  try {
    const [existing] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.idempotencyKey, body.idempotency_key))

    if (existing) {
      return c.json({ success: true, newBalance: Number(balance.amount) })
    }

    const newAmount = Number(balance.amount) - CHECKOUT_AMOUNT

    await db
      .update(balances)
      .set({ amount: String(newAmount), updatedAt: new Date() })
      .where(eq(balances.userId, userId))

    await db.insert(transactions).values({
      userId,
      type: 'checkout',
      amount: String(CHECKOUT_AMOUNT),
      status: 'completed',
      idempotencyKey: result.data.idempotency_key,
    })

    return c.json({ success: true, newBalance: newAmount })
  } catch (e) {
    // return c.json({ success: true, newBalance: Number(balance.amount) })
    return c.json({ error: 'Erro ao processar pagamento' }, 500) // remover
  }
})

export default {
  port: Number(process.env.PORT) || 3001,
  fetch: app.fetch,
}
