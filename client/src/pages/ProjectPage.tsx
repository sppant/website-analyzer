import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import AnalysisComparison from "../components/AnalysisComparison";
import CompetitorComparisonView from "../components/CompetitorComparisonView";
import CrawlView from "../components/CrawlView";
import ScoreTrend from "../components/ScoreTrend";
import Seo from "../components/Seo";
import UpgradePrompt from "../components/UpgradePrompt";
import { useAuth } from "../auth/AuthContext";
import { ApiError, apiFetch } from "../lib/api";
import {
  compareProjectAnalyses,
  deleteProject,
  getProject,
  getProjectAnalyses,
  projectExportUrl,
} from "../lib/projects";
import {
  getCrawl,
  getProjectCrawls,
  runComparison as runCompetitorComparison,
  runCrawl,
} from "../lib/crawl";
import type { AnalysisSummary } from "../types/analyses";
import type { AnalysisComparison as Comparison, Project } from "../types/project";
import type {
  CompetitorComparison,
  CrawlResult,
  CrawlSummaryRow,
} from "../types/crawl";

type Tab = "overview" | "website" | "competitor" | "history" | "compare";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { status, plan } = useAuth();
  const navigate = useNavigate();
  const isPro = plan === "pro";

  const [project, setProject] = useState<Project | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const [analyses, setAnalyses] = useState<AnalysisSummary[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [actionError, setActionError] = useState("");

  const [beforeId, setBeforeId] = useState("");
  const [afterId, setAfterId] = useState("");
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [compareError, setCompareError] = useState("");

  const [crawl, setCrawl] = useState<CrawlResult | null>(null);
  const [crawlHistory, setCrawlHistory] = useState<CrawlSummaryRow[] | null>(
    null,
  );
  const [crawling, setCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState("");

  const [competitorUrl, setCompetitorUrl] = useState("");
  const [competitor, setCompetitor] = useState<CompetitorComparison | null>(
    null,
  );
  const [comparing, setComparing] = useState(false);
  const [competitorError, setCompetitorError] = useState("");

  const loadProject = useCallback(async () => {
    if (!id) return;
    try {
      const { project: loaded } = await getProject(id);
      setProject(loaded);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setNotFound(true);
    }
  }, [id]);

  const loadAnalyses = useCallback(async () => {
    if (!id || !isPro) return;
    try {
      const { analyses: list } = await getProjectAnalyses(id);
      setAnalyses(list);
    } catch {
      setAnalyses([]);
    }
  }, [id, isPro]);

  const loadCrawls = useCallback(async () => {
    if (!id || !isPro) return;
    try {
      const { crawls } = await getProjectCrawls(id);
      setCrawlHistory(crawls);
    } catch {
      setCrawlHistory([]);
    }
  }, [id, isPro]);

  useEffect(() => {
    if (status === "authenticated") {
      void loadProject();
      void loadAnalyses();
      void loadCrawls();
    }
  }, [status, loadProject, loadAnalyses, loadCrawls]);

  const trendPoints = useMemo(() => {
    if (!analyses) return [];
    return [...analyses]
      .reverse()
      .map((a) => ({ date: a.createdAt, score: a.score }));
  }, [analyses]);

  if (status === "loading") return <div className="dashboard-page" />;
  if (status === "anonymous") return <Navigate to="/login" replace />;

  if (notFound) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-head">
          <h1>Project not found</h1>
        </div>
        <p className="auth-alt">
          <Link to="/dashboard">Back to dashboard</Link>
        </p>
      </div>
    );
  }

  if (!project) return <div className="dashboard-page" />;

  const stats = project.stats;

  async function handleAnalyzeAgain() {
    setActionError("");
    setAnalyzing(true);
    try {
      await apiFetch("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ url: project!.url, projectId: project!.id }),
      });
      await Promise.all([loadProject(), loadAnalyses()]);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        setActionError(
          "You've used all your analyses this month. The quota resets next month.",
        );
      } else {
        setActionError("Could not run the analysis. Please try again.");
      }
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleCrawl() {
    setCrawlError("");
    setCrawling(true);
    try {
      const { result } = await runCrawl(project!.url, project!.id);
      setCrawl(result);
      await Promise.all([loadCrawls(), loadProject()]);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        setCrawlError(
          "A full crawl needs 5 of your monthly units and you don't have enough left this month.",
        );
      } else if (error instanceof ApiError) {
        setCrawlError(error.message);
      } else {
        setCrawlError("The crawl could not be completed. Please try again.");
      }
    } finally {
      setCrawling(false);
    }
  }

  async function handleCompareCompetitor() {
    setCompetitorError("");
    setCompetitor(null);
    let target = competitorUrl.trim();
    if (!target) {
      setCompetitorError("Enter a competitor URL.");
      return;
    }
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`;
    setComparing(true);
    try {
      const { comparison: result } = await runCompetitorComparison(
        project!.url,
        target,
        project!.id,
      );
      setCompetitor(result);
      await loadProject();
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        setCompetitorError(
          "A comparison needs 2 of your monthly units and you don't have enough left.",
        );
      } else if (error instanceof ApiError) {
        setCompetitorError(error.message);
      } else {
        setCompetitorError("The comparison failed. Please try again.");
      }
    } finally {
      setComparing(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${project!.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteProject(project!.id);
      navigate("/dashboard");
    } catch {
      setActionError("Could not delete the project.");
    }
  }

  async function runComparison() {
    setCompareError("");
    setComparison(null);
    if (!beforeId || !afterId || beforeId === afterId) {
      setCompareError("Choose two different analyses.");
      return;
    }
    try {
      const { comparison: result } = await compareProjectAnalyses(
        project!.id,
        beforeId,
        afterId,
      );
      setComparison(result);
    } catch {
      setCompareError("Could not compare those analyses.");
    }
  }

  return (
    <div className="dashboard-page project-page">
      <Seo
        title={`${project.name} – SEO Opportunity Analyzer`}
        description="Track this website's SEO score and issues over time."
        path={`/projects/${project.id}`}
        noindex
      />

      <p className="detail-back">
        <Link to="/dashboard">← Back to dashboard</Link>
      </p>

      <div className="dashboard-head project-head">
        <div>
          <h1>{project.name}</h1>
          <p>
            <a href={project.url} target="_blank" rel="noopener noreferrer">
              {project.url}
            </a>
          </p>
        </div>
        <div className="project-head-actions">
          <button
            type="button"
            className="upgrade-button"
            onClick={handleAnalyzeAgain}
            disabled={analyzing}
          >
            {analyzing ? "Analyzing…" : "Analyze again"}
          </button>
        </div>
      </div>

      {actionError && (
        <p className="billing-error" role="alert">
          {actionError}
        </p>
      )}

      <nav className="results-tabs" aria-label="Project sections">
        <button
          className={tab === "overview" ? "active" : ""}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>
        <button
          className={tab === "website" ? "active" : ""}
          onClick={() => setTab("website")}
        >
          Website
        </button>
        <button
          className={tab === "competitor" ? "active" : ""}
          onClick={() => setTab("competitor")}
        >
          Competitor
        </button>
        <button
          className={tab === "history" ? "active" : ""}
          onClick={() => setTab("history")}
        >
          History
        </button>
        <button
          className={tab === "compare" ? "active" : ""}
          onClick={() => setTab("compare")}
        >
          Compare
        </button>
      </nav>

      {tab === "website" && (
        <section className="usage-card">
          <h2>Full website crawl</h2>
          {!isPro ? (
            <UpgradePrompt
              title="Crawl your whole website"
              description="Scan up to 100 pages, get a website-level SEO health score, the most common issues, and every broken link."
            />
          ) : (
            <>
              <p className="usage-remaining">
                Scan up to 100 pages of {project.url}. Costs 5 of your monthly
                units.
              </p>
              <button
                type="button"
                className="upgrade-button"
                onClick={handleCrawl}
                disabled={crawling}
              >
                {crawling ? "Scanning website…" : "Scan website"}
              </button>
              {crawlError && (
                <p className="billing-error" role="alert">
                  {crawlError}
                </p>
              )}
              {crawlHistory && crawlHistory.length > 0 && !crawl && (
                <p className="crawl-note">
                  Last crawl:{" "}
                  {formatDateTime(crawlHistory[0].createdAt)} —{" "}
                  {crawlHistory[0].pagesAnalyzed} pages, score{" "}
                  {crawlHistory[0].score}, {crawlHistory[0].brokenLinkCount}{" "}
                  broken links.{" "}
                  <button
                    type="button"
                    className="link-button"
                    onClick={async () => {
                      const stored = await getCrawl(crawlHistory[0].id);
                      setCrawl(stored.result);
                    }}
                  >
                    View
                  </button>
                </p>
              )}
              {crawl && <CrawlView result={crawl} />}
            </>
          )}
        </section>
      )}

      {tab === "competitor" && (
        <section className="usage-card">
          <h2>Competitor comparison</h2>
          {!isPro ? (
            <UpgradePrompt
              title="Compare your site with a competitor"
              description="Analyze your homepage and a competitor's side by side — SEO score, performance, internal links, on-page tags — and see your biggest opportunities."
            />
          ) : (
            <>
              <div className="cmp-form">
                <label>
                  Your website
                  <input type="text" value={project.url} readOnly />
                </label>
                <label>
                  Competitor
                  <input
                    type="text"
                    value={competitorUrl}
                    onChange={(event) => setCompetitorUrl(event.target.value)}
                    placeholder="https://competitor.com"
                  />
                </label>
                <button
                  type="button"
                  className="pricing-cta"
                  onClick={handleCompareCompetitor}
                  disabled={comparing}
                >
                  {comparing ? "Comparing…" : "Compare"}
                </button>
              </div>
              <p className="crawl-note">
                Analyzes the competitor's homepage only. Costs 2 of your monthly
                units.
              </p>
              {competitorError && (
                <p className="billing-error" role="alert">
                  {competitorError}
                </p>
              )}
              {competitor && (
                <CompetitorComparisonView comparison={competitor} />
              )}
            </>
          )}
        </section>
      )}

      {tab === "overview" && (
        <section className="usage-card">
          <h2>Overview</h2>
          {stats.latestScore === null ? (
            <p className="usage-remaining">
              No analyses yet. Run one to start tracking.
            </p>
          ) : (
            <>
              <p className="usage-count">
                <strong>{stats.latestScore}</strong> / 100
              </p>
              {stats.scoreChange !== null && (
                <p className="usage-remaining">
                  {stats.scoreChange > 0
                    ? `+${stats.scoreChange} points since first analysis`
                    : stats.scoreChange < 0
                      ? `${stats.scoreChange} points since first analysis`
                      : "No change since first analysis"}
                </p>
              )}
              <dl className="project-overview-meta">
                <div>
                  <dt>Analyses</dt>
                  <dd>{stats.analysisCount}</dd>
                </div>
                <div>
                  <dt>Issues remaining</dt>
                  <dd>{stats.currentIssueCount ?? "—"}</dd>
                </div>
                <div>
                  <dt>Last analyzed</dt>
                  <dd>
                    {stats.lastAnalyzedAt
                      ? formatDateTime(stats.lastAnalyzedAt)
                      : "Never"}
                  </dd>
                </div>
              </dl>
            </>
          )}
          <p className="project-danger">
            <button type="button" className="link-button" onClick={handleDelete}>
              Delete project
            </button>
          </p>
        </section>
      )}

      {tab === "history" && (
        <section className="usage-card">
          <h2>History</h2>
          {!isPro ? (
            <UpgradePrompt
              title="Score history is a Pro feature"
              description="See every past analysis and how your score has moved."
            />
          ) : !analyses ? (
            <p className="usage-remaining">Loading…</p>
          ) : analyses.length === 0 ? (
            <p className="usage-remaining">
              No analyses yet. Use “Analyze again” to create the first one.
            </p>
          ) : (
            <>
              {analyses.length > 1 && <ScoreTrend points={trendPoints} />}
              <p className="project-export">
                <a href={projectExportUrl(project.id)}>Export CSV</a>
              </p>
              <ul className="history-list">
                {analyses.map((analysis) => (
                  <li key={analysis.id}>
                    <Link
                      to={`/analyses/${analysis.id}`}
                      className="history-item"
                    >
                      <span className="history-url">
                        {formatDateTime(analysis.createdAt)}
                      </span>
                      <span className="history-meta">
                        <span className="history-score">
                          {analysis.score}/100
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {tab === "compare" && (
        <section className="usage-card">
          <h2>Compare</h2>
          {!isPro ? (
            <UpgradePrompt
              title="Comparisons are a Pro feature"
              description="Pick two analyses and see exactly what changed."
            />
          ) : !analyses || analyses.length < 2 ? (
            <p className="usage-remaining">
              You need at least two analyses to compare.
            </p>
          ) : (
            <>
              <div className="compare-picker">
                <label>
                  Before
                  <select
                    value={beforeId}
                    onChange={(event) => setBeforeId(event.target.value)}
                  >
                    <option value="">Choose…</option>
                    {analyses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {formatDateTime(a.createdAt)} — {a.score}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  After
                  <select
                    value={afterId}
                    onChange={(event) => setAfterId(event.target.value)}
                  >
                    <option value="">Choose…</option>
                    {analyses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {formatDateTime(a.createdAt)} — {a.score}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="pricing-cta"
                  onClick={runComparison}
                >
                  Compare
                </button>
              </div>
              {compareError && (
                <p className="billing-error" role="alert">
                  {compareError}
                </p>
              )}
              {comparison && <AnalysisComparison comparison={comparison} />}
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default ProjectPage;
