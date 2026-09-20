/**
 * Minimal mailer abstraction. Production uses the SMTP implementation
 * (`createSmtpMailer`); development may use `createConsoleMailer`, which is
 * never selected in production.
 */
export type PasswordResetEmail = {
  to: string;
  resetUrl: string;
};

export interface Mailer {
  sendPasswordResetEmail(email: PasswordResetEmail): Promise<void>;
}

/**
 * Development mailer: prints the reset link to the local console so a developer
 * can complete the flow without configuring SMTP.
 *
 * It writes the link only with `console.info` (the local terminal), never
 * through the application's structured logger — so reset tokens never reach a
 * log-aggregation pipeline. It is refused entirely in production (see
 * `resolveMailer` in `app.ts`).
 */
export function createConsoleMailer(): Mailer {
  return {
    async sendPasswordResetEmail({ to, resetUrl }) {
      console.info(
        `\n[dev-mailer] Password reset link for ${to}\n` +
          `[dev-mailer] ${resetUrl}\n` +
          `[dev-mailer] Configure SMTP_* to send real email.\n`,
      );
    },
  };
}
