import { NextRequest } from 'next/server'
import { requireAuth, requireRole } from '@/lib/auth'
import { parseBody, UpdateRequestSchema } from '@/lib/validators'
import { ok, badRequest, notFound, withErrorHandler } from '@/lib/response'
import { getRequest, updateRequest, deleteRequest } from '@/services/requests.service'
import { evaluateWorkflowRules } from '@/services/workflows.service'
import { trackEvent } from '@/services/analytics.service'

type Context = { params: { id: string } }

// ─────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────

export const GET = withErrorHandler(async (_req: NextRequest, ctx?: unknown) => {
  const { params } = (await ctx) as Context

  const session = await requireAuth()

  const request = await getRequest(params.id, session.sub, session.role)
  if (!request) return notFound('Request not found')

  return ok(request)
})

// ─────────────────────────────────────────────
// PATCH
// ─────────────────────────────────────────────

export const PATCH = withErrorHandler(async (req: NextRequest, ctx?: unknown) => {
  const { params } = (await ctx) as Context

  const session = await requireAuth()

  const body = await req.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON body')

  const { data, error } = parseBody(UpdateRequestSchema, body)

  // FIX 1: handle null properly
  if (error || !data) return badRequest(error ?? 'Invalid data')

  // FIX 2: normalize null → undefined (critical for DB types)
  const normalizedData = {
    ...data,
    due_date: data.due_date ?? undefined,
    assigned_to: data.assigned_to ?? undefined,
  }

  const updated = await updateRequest(
    params.id,
    normalizedData,
    session.sub,
    session.role,
  )

  if (!updated) return notFound('Request not found or access denied')

  // Workflow handling
  try {
    if (data.status) {
      await evaluateWorkflowRules(
        'on_status_change',
        updated,
        session.sub,
        { newStatus: data.status },
      )
    }

    if (data.assigned_to !== undefined) {
      await evaluateWorkflowRules('on_assign', updated, session.sub)
    }
  } catch (err) {
    console.error('[Workflow] PATCH evaluation failed:', err)
  }

  trackEvent(session.sub, 'request_updated', 'request', updated.id)
    .catch(console.error)

  return ok(updated, 'Request updated successfully')
})

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

export const DELETE = withErrorHandler(async (_req: NextRequest, ctx?: unknown) => {
  const { params } = (await ctx) as Context

  await requireRole(['admin'])

  const deleted = await deleteRequest(params.id)
  if (!deleted) return notFound('Request not found')

  return ok(null, 'Request deleted')
})