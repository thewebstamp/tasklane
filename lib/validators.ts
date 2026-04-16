import { z } from 'zod'

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────

export const LoginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const RegisterSchema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters').max(100),
  email:    z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role:     z.enum(['admin', 'staff', 'user']).optional().default('user'),
})

// ─────────────────────────────────────────────
// Shared: due_date field
// Accepts "YYYY-MM-DD" from <input type="date"> OR a full ISO datetime.
// Converts plain dates to midnight UTC so Postgres TIMESTAMPTZ is satisfied.
// ─────────────────────────────────────────────

const dueDateField = z
  .string()
  .optional()
  .nullable()
  .transform((val) => {
    if (!val) return null
    if (val.includes('T')) return val
    return `${val}T00:00:00.000Z`
  })

// ─────────────────────────────────────────────
// Requests
// ─────────────────────────────────────────────

export const CreateRequestSchema = z.object({
  title:       z.string().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().max(5000).optional(),
  priority:    z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  due_date:    dueDateField,
  assigned_to: z.string().uuid().optional().nullable(),
  form_data: z.record(z.string(), z.unknown()).optional().default({}),
})

export const UpdateRequestSchema = z.object({
  title:       z.string().min(3).max(255).optional(),
  description: z.string().max(5000).optional(),
  status:      z.enum(['pending', 'in_progress', 'review', 'completed', 'rejected']).optional(),
  priority:    z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  due_date:    dueDateField,
  assigned_to: z.string().uuid().optional().nullable(),
  form_data: z.record(z.string(), z.unknown()).optional(),
})

export const RequestCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000),
  type:    z.enum(['comment', 'status_change', 'assignment', 'system']).optional().default('comment'),
})

// ─────────────────────────────────────────────
// Pagination / Filtering
// ─────────────────────────────────────────────

export const PaginationSchema = z.object({
  page:        z.coerce.number().int().positive().optional().default(1),
  per_page:    z.coerce.number().int().min(1).max(100).optional().default(20),
  search:      z.string().max(200).optional(),
  status:      z.enum(['pending', 'in_progress', 'review', 'completed', 'rejected']).optional(),
  priority:    z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigned_to: z.string().uuid().optional(),
  sort_by:     z.string().optional().default('created_at'),
  sort_dir:    z.enum(['asc', 'desc']).optional().default('desc'),
})

// ─────────────────────────────────────────────
// Workflow Rules
// ─────────────────────────────────────────────

const WorkflowConditionsSchema = z.object({
  status:      z.enum(['pending', 'in_progress', 'review', 'completed', 'rejected']).optional(),
  priority:    z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
}).passthrough()

const WorkflowActionSchema = z.object({
  type:    z.enum(['set_status', 'assign_user', 'send_email', 'add_comment']),
  payload: z.record(z.string(), z.unknown()),
})

export const CreateWorkflowSchema = z.object({
  name:          z.string().min(2).max(100),
  description:   z.string().max(500).optional(),
  trigger_event: z.enum(['on_create', 'on_status_change', 'on_assign', 'on_due_date']),
  conditions:    WorkflowConditionsSchema,
  actions:       z.array(WorkflowActionSchema).min(1, 'At least one action is required'),
  is_active:     z.boolean().optional().default(true),
})

export const UpdateWorkflowSchema = CreateWorkflowSchema.partial()

// ─────────────────────────────────────────────
// Email Templates
// ─────────────────────────────────────────────

export const CreateEmailTemplateSchema = z.object({
  name:      z.string().min(2).max(100),
  subject:   z.string().min(1).max(200),
  body_html: z.string().min(1),
  body_text: z.string().min(1),
  variables: z.array(z.string()).optional().default([]),
})

export const SendEmailSchema = z.object({
  to:          z.string().email(),
  template_id: z.string().uuid().optional(),
  subject:     z.string().max(200).optional(),
  body_html:   z.string().optional(),
  body_text:   z.string().optional(),
  variables: z.record(z.string(), z.string()).optional().default({}),
  request_id:  z.string().uuid().optional(),
})

// ─────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────

export const UpdateUserSchema = z.object({
  name:      z.string().min(2).max(100).optional(),
  email:     z.string().email().optional(),
  role:      z.enum(['admin', 'staff', 'user']).optional(),
  is_active: z.boolean().optional(),
})

export const ChangePasswordSchema = z.object({
  current_password: z.string().min(8),
  new_password:     z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
})

// ─────────────────────────────────────────────
// Helper: parse + return typed errors
// ─────────────────────────────────────────────

export function parseBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const msg = result.error.issues.map((i) => i.message).join('; ')
    return { data: null, error: msg }
  }
  return { data: result.data, error: null }
}