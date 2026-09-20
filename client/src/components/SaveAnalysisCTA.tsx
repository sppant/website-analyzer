import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../lib/api";
import { createProject } from "../lib/projects";
import UpgradePrompt from "./UpgradePrompt";

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * Shown under a fresh analysis result. Nudges the visitor toward the next step
 * without pretending the analysis was saved when it wasn't.
 */
function SaveAnalysisCTA({ url }: { url: string }) {
  const { status, plan } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(hostOf(url));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (status === "loading") return null;

  if (status === "anonymous") {
    return (
      <section className="save-cta">
        <h3>Want to keep this analysis?</h3>
        <p>
          Create a free account to start managing your websites. This anonymous
          analysis is not saved.
        </p>
        <Link to="/signup" className="upgrade-button">
          Create a free account
        </Link>
      </section>
    );
  }

  if (plan !== "pro") {
    return (
      <section className="save-cta">
        <UpgradePrompt
          title="Analyze one page for free. Understand your whole website with Pro."
          description="This anonymous analysis is one page. Pro turns it into a full-site picture."
          benefits={[
            "Scan up to 100 pages in one crawl",
            "Find broken internal and external links",
            "Compare your website with a competitor",
            "Track your SEO score over time",
            "50 analyses / month and up to 10 projects",
          ]}
        />
      </section>
    );
  }

  async function handleCreate() {
    setError("");
    setBusy(true);
    try {
      const { project } = await createProject(name.trim() || hostOf(url), url);
      navigate(`/projects/${project.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Could not create the project.",
      );
      setBusy(false);
    }
  }

  return (
    <section className="save-cta">
      <h3>Track this website</h3>
      <p>
        Add it as a project to build a score timeline and compare analyses over
        time.
      </p>
      <div className="save-cta-form">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Project name"
          placeholder="Project name"
        />
        <button
          type="button"
          className="upgrade-button"
          onClick={handleCreate}
          disabled={busy}
        >
          {busy ? "Creating…" : "Create project"}
        </button>
      </div>
      {error && (
        <p className="billing-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

export default SaveAnalysisCTA;
