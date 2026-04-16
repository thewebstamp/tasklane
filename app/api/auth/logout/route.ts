import { clearAuthCookie } from '@/lib/auth'
import { ok, withErrorHandler } from '@/lib/response'

export const POST = withErrorHandler(async () => {
  await clearAuthCookie()
  return ok(null, 'Logged out successfully')
})