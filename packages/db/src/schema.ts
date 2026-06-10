import { pgTable, uuid, text, numeric, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const balances = pgTable('balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id)
    .unique(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull().default('0'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  type: text('type').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'),
  idempotencyKey: text('idempotency_key'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
