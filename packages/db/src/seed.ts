import bcrypt from 'bcryptjs'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { users, balances, transactions } from './schema'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is not set')

const client = postgres(connectionString)
const db = drizzle(client)

async function seed() {
  console.log('Seeding demo data...')

  const passwordHash = await bcrypt.hash('Demo@1234', 10)

  const [user] = await db
    .insert(users)
    .values({
      email: 'demo@hypercash.com',
      passwordHash,
      name: 'Demo User',
    })
    .onConflictDoNothing()
    .returning()

  if (!user) {
    console.log('Demo user already exists — skipping.')
    await client.end()
    return
  }

  await db.insert(balances).values({
    userId: user.id,
    amount: '1000.00',
  })

  await db.insert(transactions).values([
    {
      userId: user.id,
      type: 'deposit',
      amount: '1500.00',
      status: 'completed',
      idempotencyKey: 'seed-deposit-1',
    },
    {
      userId: user.id,
      type: 'checkout',
      amount: '300.00',
      status: 'completed',
      idempotencyKey: 'seed-checkout-1',
    },
    {
      userId: user.id,
      type: 'withdraw',
      amount: '200.00',
      status: 'completed',
      idempotencyKey: 'seed-withdraw-1',
    },
  ])

  console.log('Done.')
  console.log('  Email:    demo@hypercash.com')
  console.log('  Senha:    Demo@1234')
  console.log('  Saldo:    R$ 1.000,00')

  await client.end()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
