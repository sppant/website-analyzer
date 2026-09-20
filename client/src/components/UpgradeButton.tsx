import { useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { startProCheckout } from "../lib/billing";
import { Button, LinkButton } from "./ui/Button";
import type { ButtonVariant } from "./ui/Button";

type UpgradeButtonProps = {
  variant?: ButtonVariant;
  className?: string;
  label?: string;
};

/**
 * "Upgrade to Pro" — starts Stripe Checkout. Anonymous visitors are sent to
 * sign up first (the analyzer stays usable without an account).
 */
function UpgradeButton({
  variant = "primary",
  className,
  label = "Upgrade to Pro",
}: UpgradeButtonProps) {
  const { status, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (status === "anonymous") {
    return (
      <LinkButton to="/signup" variant={variant} className={className}>
        Sign up to upgrade
      </LinkButton>
    );
  }

  async function handleClick() {
    setError("");
    setBusy(true);
    try {
      const result = await startProCheckout();
      if (result === "already-pro") {
        await refresh();
        setError("You're already on Pro.");
      }
    } catch {
      setError("Could not start checkout. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant={variant}
        className={className}
        onClick={handleClick}
        disabled={busy || status === "loading"}
      >
        {busy ? "Starting checkout…" : label}
      </Button>
      {error && (
        <p className="billing-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

export default UpgradeButton;
