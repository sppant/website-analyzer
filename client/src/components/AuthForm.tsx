import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { Button } from "./ui/Button";
import { TextField } from "./ui/TextField";

type AuthFormProps = {
  mode: "login" | "signup";
};

function AuthForm({ mode }: AuthFormProps) {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const justResetPassword =
    mode === "login" &&
    (location.state as { passwordReset?: boolean } | null)?.passwordReset ===
      true;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === "login";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError("Enter your email and password.");
      return;
    }

    if (!isLogin && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);

    try {
      if (isLogin) {
        await login(trimmedEmail, password);
      } else {
        await signup(trimmedEmail, password);
      }
      navigate("/");
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

  return (
    <div className="auth-page">
      <header>
        <p className="section-eyebrow">{isLogin ? "LOG IN" : "SIGN UP"}</p>
        <h1>{isLogin ? "Welcome back" : "Create your account"}</h1>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        {justResetPassword && !error && (
          <p className="auth-success">
            Your password has been updated. Please log in.
          </p>
        )}

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

        <TextField
          label="Password"
          id="password"
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          minLength={isLogin ? undefined : 8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {isLogin && (
          <p className="auth-forgot">
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
        )}

        <Button type="submit" disabled={submitting} className="h-12! w-full">
          {submitting ? "Please wait…" : isLogin ? "Log in" : "Sign up"}
        </Button>

        <p className="auth-alt">
          {isLogin ? (
            <>
              Don&apos;t have an account? <Link to="/signup">Sign up</Link>
            </>
          ) : (
            <>
              Already have an account? <Link to="/login">Log in</Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}

export default AuthForm;
