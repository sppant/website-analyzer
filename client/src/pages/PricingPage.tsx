import { useState } from "react";

import UpgradeButton from "../components/UpgradeButton";
import Seo from "../components/Seo";
import { Button, LinkButton } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../auth/AuthContext";
import { openBillingPortal } from "../lib/billing";

function PricingPage() {
  const { status, plan } = useAuth();
  const [portalError, setPortalError] = useState("");

  const isPro = plan === "pro";

  async function handleManageBilling() {
    setPortalError("");
    try {
      await openBillingPortal();
    } catch {
      setPortalError("Could not open the billing portal. Please try again.");
    }
  }

  return (
    <div className="pricing-page">
      <Seo
        title="SEO Opportunity Analyzer Pricing – Free & Pro Plans"
        description="Free finds what's wrong: 5 full SEO analyses a month and 1 project. Pro tracks what's getting better — $9/month for 50 analyses, 10 projects, saved history, score trends and comparisons."
        path="/pricing"
      />

      <div className="dashboard-head">
        <h1>Pricing</h1>
        <p>
          <strong>Free</strong> finds what's wrong. <strong>Pro</strong> tracks
          what's getting better.
        </p>
      </div>

      <div className="pricing-grid">
        <Card as="section" className="flex flex-col gap-3.5">
          <h2 className="m-0 text-xl text-white">Free</h2>
          <p className="pricing-price">
            <strong>$0</strong> / month
          </p>
          <ul className="m-0 grid gap-2 pl-[18px] text-sm leading-normal text-[var(--muted)] [&_strong]:text-[var(--text)]">
            <li>
              <strong>5 analyses per month</strong>
            </li>
            <li>Full SEO analysis &amp; PageSpeed</li>
            <li>1 project</li>
            <li>No account needed to try the analyzer</li>
          </ul>
          {status === "anonymous" ? (
            <LinkButton to="/signup" variant="secondary" className="mt-auto">
              Create a free account
            </LinkButton>
          ) : (
            <span className="pricing-current">
              {isPro ? "Included with Pro" : "Your current plan"}
            </span>
          )}
        </Card>

        <Card as="section" featured className="flex flex-col gap-3.5">
          <h2 className="m-0 text-xl text-white">Pro</h2>
          <p className="pricing-price">
            <strong>$9</strong> / month
          </p>
          <ul className="m-0 grid gap-2 pl-[18px] text-sm leading-normal text-[var(--muted)] [&_strong]:text-[var(--text)]">
            <li>
              <strong>50 analyses per month</strong>
            </li>
            <li>
              <strong>10 projects</strong>
            </li>
            <li>Saved analysis history &amp; score tracking</li>
            <li>Before / after comparisons + CSV export</li>
            <li>Cancel anytime</li>
          </ul>

          {isPro ? (
            <>
              <Button onClick={handleManageBilling} className="mt-auto">
                Manage billing
              </Button>
              {portalError && (
                <p className="billing-error" role="alert">
                  {portalError}
                </p>
              )}
            </>
          ) : (
            <UpgradeButton className="mt-auto" />
          )}
        </Card>
      </div>
    </div>
  );
}

export default PricingPage;
