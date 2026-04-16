#!/usr/bin/env node

/**
 * Run this script to apply the full schema to your Neon database.
 * Usage: node scripts/migrate.js
 *
 * Requires DATABASE_URL in your environment (or .env.local).
 */

import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local" });

const SCHEMA = `
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS & AUTH
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'staff', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'user',
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ============================================================
-- REQUESTS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE request_status   AS ENUM ('pending', 'in_progress', 'review', 'completed', 'rejected');
  CREATE TYPE request_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  status       request_status   NOT NULL DEFAULT 'pending',
  priority     request_priority NOT NULL DEFAULT 'medium',
  form_data    JSONB NOT NULL DEFAULT '{}',
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  assigned_to  UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date     TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requests_status       ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_submitted_by ON requests(submitted_by);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_to  ON requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_requests_created_at   ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_form_data    ON requests USING GIN(form_data);

-- ============================================================
-- REQUEST COMMENTS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE comment_type AS ENUM ('comment', 'status_change', 'assignment', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS request_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  type       comment_type NOT NULL DEFAULT 'comment',
  content    TEXT NOT NULL,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_request_id ON request_comments(request_id);

-- ============================================================
-- FILES
-- ============================================================

CREATE TABLE IF NOT EXISTS files (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     UUID REFERENCES requests(id) ON DELETE CASCADE,
  uploaded_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  filename       TEXT NOT NULL,
  original_name  TEXT NOT NULL,
  cloudinary_id  TEXT NOT NULL UNIQUE,
  cloudinary_url TEXT NOT NULL,
  file_type      TEXT NOT NULL,
  file_size      INTEGER NOT NULL,
  is_public      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_files_request_id  ON files(request_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);

-- ============================================================
-- WORKFLOW RULES
-- ============================================================

DO $$ BEGIN
  CREATE TYPE workflow_trigger AS ENUM ('on_create', 'on_status_change', 'on_assign', 'on_due_date');
  CREATE TYPE workflow_action  AS ENUM ('set_status', 'assign_user', 'send_email', 'add_comment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS workflow_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  trigger_event workflow_trigger NOT NULL,
  conditions    JSONB NOT NULL DEFAULT '{}',
  actions       JSONB NOT NULL DEFAULT '[]',
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_rules_trigger ON workflow_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_active  ON workflow_rules(is_active);

-- ============================================================
-- EMAIL TEMPLATES
-- ============================================================

CREATE TABLE IF NOT EXISTS email_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  subject    TEXT NOT NULL,
  body_html  TEXT NOT NULL,
  body_text  TEXT NOT NULL,
  variables  JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- EMAIL LOG
-- ============================================================

DO $$ BEGIN
  CREATE TYPE email_status AS ENUM ('queued', 'sent', 'failed', 'bounced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS email_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID REFERENCES requests(id) ON DELETE SET NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  sent_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  to_address  TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body_html   TEXT NOT NULL,
  status      email_status NOT NULL DEFAULT 'queued',
  error_msg   TEXT,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_request_id ON email_log(request_id);
CREATE INDEX IF NOT EXISTS idx_email_log_status     ON email_log(status);

-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id    ON analytics_events(user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at     ON users;
DROP TRIGGER IF EXISTS trg_requests_updated_at  ON requests;
DROP TRIGGER IF EXISTS trg_workflows_updated_at ON workflow_rules;
DROP TRIGGER IF EXISTS trg_templates_updated_at ON email_templates;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_workflows_updated_at
  BEFORE UPDATE ON workflow_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log("🚀  Running migrations against Neon...\n");

  try {
    await sql.unsafe(SCHEMA);
    console.log("✅  Schema applied successfully!");
    console.log("    Tables: users, requests, request_comments, files,");
    console.log(
      "            workflow_rules, email_templates, email_log, analytics_events",
    );
  } catch (err) {
    console.error("❌  Migration failed:", err);
    process.exit(1);
  }
}

migrate();
