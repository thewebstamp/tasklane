// ─────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────

export type UserRole = "admin" | "staff" | "user";

export type RequestStatus =
  | "pending"
  | "in_progress"
  | "review"
  | "completed"
  | "rejected";

export type RequestPriority = "low" | "medium" | "high" | "urgent";

export type CommentType = "comment" | "status_change" | "assignment" | "system";

export type WorkflowTrigger =
  | "on_create"
  | "on_status_change"
  | "on_assign"
  | "on_due_date";

export type WorkflowAction =
  | "set_status"
  | "assign_user"
  | "send_email"
  | "add_comment";

export type EmailStatus = "queued" | "sent" | "failed" | "bounced";

// ─────────────────────────────────────────────────────────────
// DATABASE ROW TYPES (match DB columns exactly)
// ─────────────────────────────────────────────────────────────

export interface DBUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DBRequest {
  id: string;
  title: string;
  description: string | null;
  status: RequestStatus;
  priority: RequestPriority;
  form_data: Record<string, unknown>;
  submitted_by: string;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBRequestComment {
  id: string;
  request_id: string;
  user_id: string | null;
  type: CommentType;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DBFile {
  id: string;
  request_id: string | null;
  uploaded_by: string | null;
  filename: string;
  original_name: string;
  cloudinary_id: string;
  cloudinary_url: string;
  file_type: string;
  file_size: number;
  is_public: boolean;
  created_at: string;
}

export interface DBWorkflowRule {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_event: WorkflowTrigger;
  conditions: WorkflowConditions;
  actions: WorkflowActionDef[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBEmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  variables: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBEmailLog {
  id: string;
  request_id: string | null;
  template_id: string | null;
  sent_by: string | null;
  to_address: string;
  subject: string;
  body_html: string;
  status: EmailStatus;
  error_msg: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface DBAnalyticsEvent {
  id: string;
  user_id: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// APPLICATION-LEVEL TYPES (enriched / shaped for the UI)
// ─────────────────────────────────────────────────────────────

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RequestWithUsers extends DBRequest {
  submitter_name: string;
  submitter_email: string;
  assignee_name: string | null;
  assignee_email: string | null;
}

export interface RequestCommentWithUser extends DBRequestComment {
  user_name: string | null;
  user_avatar: string | null;
}

// ─────────────────────────────────────────────────────────────
// WORKFLOW TYPES
// ─────────────────────────────────────────────────────────────

export interface WorkflowConditions {
  status?: RequestStatus;
  priority?: RequestPriority;
  assigned_to?: string | null;
  [key: string]: unknown;
}

export interface WorkflowActionDef {
  type: WorkflowAction;
  payload: WorkflowActionPayload;
}

export type WorkflowActionPayload =
  | { status: RequestStatus }
  | { user_id: string }
  | { template_id: string; to: "submitter" | "assignee" | string }
  | { content: string };

// ─────────────────────────────────────────────────────────────
// API RESPONSE TYPES
// ─────────────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────────────────────────
// AUTH TYPES
// ─────────────────────────────────────────────────────────────

export interface JWTPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  name: string;
  iat?: number;
  exp?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AuthSession extends JWTPayload {
  // Alias for convenience — used in route handlers via getSession()
}

// ─────────────────────────────────────────────────────────────
// FORM / INPUT TYPES
// ─────────────────────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface CreateRequestInput {
  title: string;
  description?: string;
  priority?: RequestPriority;
  due_date?: string;
  form_data?: Record<string, unknown>;
  assigned_to?: string;
}

export interface UpdateRequestInput {
  title?: string;
  description?: string;
  status?: RequestStatus;
  priority?: RequestPriority;
  due_date?: string;
  assigned_to?: string | null;
  form_data?: Record<string, unknown>;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  trigger_event: WorkflowTrigger;
  conditions: WorkflowConditions;
  actions: WorkflowActionDef[];
  is_active?: boolean;
}

export interface SendEmailInput {
  to: string;
  template_id?: string;
  subject?: string;
  body_html?: string;
  body_text?: string;
  variables?: Record<string, string>;
  request_id?: string;
}

// ─────────────────────────────────────────────────────────────
// ANALYTICS TYPES
// ─────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  total_requests: number;
  pending: number;
  in_progress: number;
  review: number;
  completed: number;
  rejected: number;
  total_files: number;
  total_users: number;
  emails_sent: number;
  requests_this_week: number;
  requests_this_month: number;
  avg_completion_hours: number | null;
}

export interface RequestTrend {
  date: string;
  count: number;
}

export interface StatusDistribution {
  status: RequestStatus;
  count: number;
}

// ─────────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: RequestStatus;
  priority?: RequestPriority;
  assigned_to?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}
