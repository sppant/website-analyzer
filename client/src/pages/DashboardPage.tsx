import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";

import ProjectCard from "../components/ProjectCard";
import UpgradeButton from "../components/UpgradeButton";
import UpgradePrompt from "../components/UpgradePrompt";
import Seo from "../components/Seo";
import { Button } from "../components/ui/Button";
import { useAuth } from "../auth/AuthContext";
import { useUsage } from "../hooks/useUsage";
import { ApiError } from "../lib/api";
import { openBillingPortal } from "../lib/billing";
import { createProject, listProjects } from "../lib/projects";
import { PLAN_PROJECT_LIMIT } from "../types/plan";
import type { Project } from "../types/project";

function formatResetDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function DashboardPage() {
  const { status, user, plan, subscription, refresh: refreshAuth } = useAuth();
  const { usage, refresh: refreshUsage } = useUsage();
  const [searchParams, setSearchParams] = useSearchParams();

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectLimit, setProjectLimit] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [portalError, setPortalError] = useState("");

  const checkoutReturn = searchParams.get("checkout");
  const [processing, setProcessing] = useState(checkoutReturn === "success");
  const pollCount = useRef(0);

  const loadProjects = useCallback(async () => {
    try {
      const data = await listProjects();
      setProjects(data.projects);
      setProjectLimit(data.limit);
    } catch {
      setProjects([]);
    }
  }, []);

  // After returning from Checkout, poll /api/auth/me until the webhook lands.
  useEffect(() => {
    if (checkoutReturn !== "success") return;
    if (plan === "pro") {
      setProcessing(false);
      setSearchParams({}, { replace: true });
      return;
    }
    if (pollCount.current >= 8) {
      setProcessing(false);
      return;
    }
    const timer = setTimeout(() => {
      pollCount.current += 1;
      void refreshAuth();
      void refreshUsage();
    }, 2000);
    return () => clearTimeout(timer);
  }, [checkoutReturn, plan, refreshAuth, refreshUsage, setSearchParams]);

  useEffect(() => {
    if (status === "authenticated") void loadProjects();
  }, [status, loadProjects, plan]);

  const handleManageBilling = useCallback(async () => {
    setPortalError("");
    try {
      await openBillingPortal();
    } catch {
      setPortalError("Could not open the billing portal. Please try again.");
    }
  }, []);

  async function handleCreateProject(event: React.FormEvent) {
    event.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      await createProject(newName, newUrl);
      setNewName("");
      setNewUrl("");
      await loadProjects();
    } catch (error) {
      setCreateError(
        error instanceof ApiError
          ? error.message
          : "Could not create the project.",
      );
    } finally {
      setCreating(false);
    }
  }

  if (status === "loading") {
    return <div className="dashboard-page" />;
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace />;
  }

  const atUsageLimit = usage ? usage.remaining <= 0 : false;
  const limit = projectLimit ?? PLAN_PROJECT_LIMIT[plan ?? "free"];
  const atProjectLimit = projects ? projects.length >= limit : false;

  return (
    <div className="dashboard-page">
      <Seo
        title="Dashboard – SEO Opportunity Analyzer"
        description="Your projects, saved SEO analyses, monthly usage and plan."
        path="/dashboard"
        noindex
      />

      <div className="dashboard-head">
        <h1>Dashboard</h1>
        <p>{user?.email}</p>
      </div>

      {processing && (
        <p className="billing-processing">
          Payment received — activating your Pro plan. This usually takes a few
          seconds.
        </p>
      )}

      <section className="usage-card">
        <div className="plan-row">
          <span className={`plan-badge plan-${plan ?? "free"}`}>
            {plan === "pro" ? "Pro" : "Free"}
          </span>
          {plan === "pro" ? (
            <>
              <Button variant="link" onClick={handleManageBilling}>
                Manage billing
              </Button>
              {portalError && (
                <p className="billing-error" role="alert">
                  {portalError}
                </p>
              )}
            </>
          ) : (
            <UpgradeButton variant="link" label="Upgrade to Pro" />
          )}
        </div>

        {plan === "pro" && subscription?.status === "past_due" && (
          <p className="usage-limit-note">
            Your last payment failed. Update your card in{" "}
            <Button variant="link" onClick={handleManageBilling}>
              billing
            </Button>{" "}
            to keep Pro.
          </p>
        )}

        {plan === "pro" &&
          subscription?.cancelAtPeriodEnd &&
          subscription.currentPeriodEnd && (
            <p className="usage-remaining">
              Your Pro plan is set to cancel. You'll keep Pro access until{" "}
              {formatFullDate(subscription.currentPeriodEnd)}.
            </p>
          )}

        <h2>Analyses this month</h2>
        {usage ? (
          <>
            <p className="usage-count">
              <strong>
                {usage.used} / {usage.limit}
              </strong>{" "}
              used
            </p>
            <p className="usage-remaining">
              {usage.remaining} remaining · Resets{" "}
              {formatResetDate(usage.resetsAt)}
            </p>
            {atUsageLimit && (
              <div className="usage-limit-block">
                <p>
                  {plan === "pro"
                    ? `You've used all ${usage.limit} Pro analyses this month.`
                    : `You've used all ${usage.limit} free analyses this month. Upgrade to Pro for 50 analyses/month, saved history, score tracking and up to 10 projects.`}
                </p>
                {plan !== "pro" && (
                  <UpgradeButton label="Upgrade to Pro — $9/month" />
                )}
              </div>
            )}
          </>
        ) : (
          <p className="usage-remaining">Loading usage…</p>
        )}
      </section>

      <section className="projects-section">
        <div className="projects-section-head">
          <h2>Projects</h2>
          <span className="projects-count">
            {projects?.length ?? 0} of {limit}
          </span>
        </div>

        {projects && projects.length > 0 && (
          <ul className="project-card-list">
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        )}

        {projects && projects.length === 0 && (
          <p className="history-empty">
            No projects yet. Add a website to start tracking its SEO score.
          </p>
        )}

        {atProjectLimit ? (
          plan === "pro" ? (
            <p className="usage-remaining">
              You've reached the {limit}-project limit.
            </p>
          ) : (
            <UpgradePrompt
              title="You've reached the Free plan limit"
              description="Free includes 1 project. Pro includes up to 10, plus analysis history and score tracking."
            />
          )
        ) : (
          <form className="create-project-form" onSubmit={handleCreateProject}>
            <input
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Project name"
              aria-label="Project name"
              required
            />
            <input
              type="text"
              value={newUrl}
              onChange={(event) => setNewUrl(event.target.value)}
              placeholder="https://example.com"
              aria-label="Website URL"
              required
            />
            <button type="submit" className="pricing-cta" disabled={creating}>
              {creating ? "Adding…" : "Add project"}
            </button>
          </form>
        )}
        {createError && (
          <p className="billing-error" role="alert">
            {createError}
          </p>
        )}
      </section>

      {plan !== "pro" && (
        <section className="projects-section">
          <UpgradePrompt
            title="Free finds what's wrong. Pro tracks what's getting better."
            description="Keep your analysis history, watch your score trend, and compare before / after."
          />
        </section>
      )}

      <p className="dashboard-analyze-link">
        <Link to="/">← Run a new analysis</Link>
      </p>
    </div>
  );
}

export default DashboardPage;
