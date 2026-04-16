import nodemailer, { Transporter } from "nodemailer";

// ─────────────────────────────────────────────
// Transport singleton
// ─────────────────────────────────────────────

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return _transporter;
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface MailResult {
  success: boolean;
  messageId: string | null;
  error?: string;
}

// ─────────────────────────────────────────────
// Core send function
// ─────────────────────────────────────────────

export async function sendMail(opts: SendMailOptions): Promise<MailResult> {
  try {
    const transporter = getTransporter();

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text ?? stripHtml(opts.html),
      replyTo: opts.replyTo,
      cc: opts.cc,
      bcc: opts.bcc,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Mailer Error]", error);
    return {
      success: false,
      messageId: null,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

// ─────────────────────────────────────────────
// Template interpolation
// ─────────────────────────────────────────────

/**
 * Replace {{variable}} placeholders in a template string.
 * Usage: interpolate(template, { name: 'John', status: 'completed' })
 */
export function interpolate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => variables[key] ?? `{{${key}}}`,
  );
}

// ─────────────────────────────────────────────
// Utility: strip basic HTML tags for plain-text fallback
// ─────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─────────────────────────────────────────────
// Verify SMTP connection (used on startup/health check)
// ─────────────────────────────────────────────

export async function verifyMailConnection(): Promise<boolean> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}
