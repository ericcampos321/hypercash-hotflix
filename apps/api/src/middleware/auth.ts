import { createMiddleware } from 'hono/factory'
import { jwtVerify } from 'jose'

export const authMiddleware = createMiddleware<{
  Variables: { userId: string }
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice(7)

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)

    if (!payload.userId || typeof payload.userId !== 'string') {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    c.set('userId', payload.userId)
    await next()
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }
})
