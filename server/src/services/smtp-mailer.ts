import nodemailer from "nodemailer";

import type { SmtpConfig } from "../config.js";
import type { Mailer, PasswordResetEmail } from "./mailer.js";

const SUBJECT = "Reset your SEO Opportunity Analyzer password";

function bodyText(resetUrl: string): string {
  return [
    "We received a request to reset the password for your SEO Opportunity",
    "Analyzer account.",
    "",
    "Reset your password using the link below. It expires in 30 minutes and",
    "can only be used once:",
    "",
    resetUrl,
    "",
    "If you didn't request this, you can safely ignore this email — your",
    "password will not change.",
  ].join("\n");
}

function bodyHtml(resetUrl: string): string {
  // resetUrl is built from our own APP_URL + a random token; safe to embed.
  return [
    "<p>We received a request to reset the password for your SEO Opportunity",
    "Analyzer account.</p>",
    "<p>Reset your password using the link below. It expires in 30 minutes and",
    "can only be used once:</p>",
    `<p><a href="${resetUrl}">${resetUrl}</a></p>`,
    "<p>If you didn't request this, you can safely ignore this email — your",
    "password will not change.</p>",
  ].join(" ");
}

/**
 * Production mailer. Sends the password-reset link over SMTP.
 *
 * Credentials come from `SmtpConfig` (environment only) and are handed to
 * Nodemailer's transport — they are never logged. The optional `log` callback
 * receives a plain message with no recipient-identifying token and never the
 * reset URL.
 */
export function createSmtpMailer(
  config: SmtpConfig,
  log?: (message: string) => void,
): Mailer {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
  });

  return {
    async sendPasswordResetEmail({ to, resetUrl }: PasswordResetEmail) {
      await transporter.sendMail({
        from: config.from,
        to,
        subject: SUBJECT,
        text: bodyText(resetUrl),
        html: bodyHtml(resetUrl),
      });
      log?.("Password reset email sent");
    },
  };
}
