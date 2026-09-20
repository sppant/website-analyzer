import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import ResultsDashboard from "../components/results/ResultsDashboard";
import Seo from "../components/Seo";
import { useAuth } from "../auth/AuthContext";
import { ApiError, apiFetch } from "../lib/api";
import type { StoredAnalysis } from "../types/analyses";

function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { status } = useAuth();

  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [error, setError] = useState("");

  const seo = (
    <Seo
      title="Saved analysis – SEO Opportunity Analyzer"
      description="A saved website SEO analysis."
      path={`/analyses/${id ?? ""}`}
      noindex
    />
  );

  useEffect(() => {
    if (status !== "authenticated" || !id) return;

    let cancelled = false;
    apiFetch<StoredAnalysis>(`/api/analyses/${id}`)
      .then((data) => {
        if (!cancelled) setAnalysis(data);
      })
      .catch((requestError) => {
        if (cancelled) return;
        if (requestError instanceof ApiError && requestError.status === 403) {
          setError(
            "Saved analyses are a Pro feature. Upgrade on the pricing page to browse your history.",
          );
        } else if (
          requestError instanceof ApiError &&
          requestError.status === 404
        ) {
          setError("This analysis could not be found.");
        } else {
          setError("Could not load this analysis.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [status, id]);

  if (status === "loading") {
    return <div className="dashboard-page" />;
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace />;
  }

  if (error) {
    return (
      <div className="dashboard-page">
        {seo}
        <div className="dashboard-head">
          <h1>Not available</h1>
        </div>
        <p className="auth-note">{error}</p>
        <p className="auth-alt">
          <Link to="/dashboard">Back to dashboard</Link>
        </p>
      </div>
    );
  }

  if (!analysis) {
    return <div className="dashboard-page" />;
  }

  return (
    <div className="dashboard-page">
      {seo}
      <p className="detail-back">
        <Link to="/dashboard">← Back to dashboard</Link>
      </p>
      <ResultsDashboard result={analysis.result} />
    </div>
  );
}

export default AnalysisDetailPage;
