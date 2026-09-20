import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import Seo from "../components/Seo";
import { apiFetch } from "../lib/api";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    setStatus("submitting");

    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch {
      // The response is intentionally generic — show the same confirmation
      // whether or not the request succeeded.
    }

    setStatus("done");
  }

  return (
    <div className="auth-page">
      <Seo
        title="Reset your password – SEO Opportunity Analyzer"
        description="Request a password reset link for your SEO Opportunity Analyzer account."
        path="/forgot-password"
        noindex
      />

      <header>
        <p className="section-eyebrow">RESET PASSWORD</p>
        <h1>Forgot your password?</h1>
      </header>

      {status === "done" ? (
        <>
          <p className="auth-note">
            If an account exists for that email, a password reset link has been
            sent. The link expires in 30 minutes.
          </p>
          <p className="auth-alt">
            <Link to="/login">Back to log in</Link>
          </p>
        </>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <TextField
            label="Email"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <Button
            type="submit"
            disabled={status === "submitting"}
            className="h-12! w-full"
          >
            {status === "submitting" ? "Please wait…" : "Send reset link"}
          </Button>

          <p className="auth-alt">
            <Link to="/login">Back to log in</Link>
          </p>
        </form>
      )}
    </div>
  );
}

export default ForgotPasswordPage;
