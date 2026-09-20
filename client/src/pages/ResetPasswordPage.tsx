import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import Seo from "../components/Seo";
import { apiFetch } from "../lib/api";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      navigate("/login", { replace: true, state: { passwordReset: true } });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const seo = (
    <Seo
      title="Choose a new password – SEO Opportunity Analyzer"
      description="Set a new password for your SEO Opportunity Analyzer account."
      path="/reset-password"
      noindex
    />
  );

  if (!token) {
    return (
      <div className="auth-page">
        {seo}
        <header>
          <p className="section-eyebrow">RESET PASSWORD</p>
          <h1>Invalid link</h1>
        </header>
        <p className="auth-note">
          This password reset link is missing its token. Request a new one to
          continue.
        </p>
        <p className="auth-alt">
          <Link to="/forgot-password">Request a new link</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {seo}
      <header>
        <p className="section-eyebrow">RESET PASSWORD</p>
        <h1>Choose a new password</h1>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <TextField
          label="New password"
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          hint="At least 8 characters."
        />

        <TextField
          label="Confirm new password"
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          required
        />

        <Button type="submit" disabled={submitting} className="h-12! w-full">
          {submitting ? "Please wait…" : "Update password"}
        </Button>

        <p className="auth-alt">
          <Link to="/login">Back to log in</Link>
        </p>
      </form>
    </div>
  );
}

export default ResetPasswordPage;
