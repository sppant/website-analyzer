import { Link } from "react-router-dom";

import { Card } from "./ui/Card";
import type { Project } from "../types/project";

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function relativeDay(iso: string | null): string {
  if (!iso) return "Never";
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ProjectCard({ project }: { project: Project }) {
  const { stats } = project;
  const change = stats.scoreChange;

  return (
    <Card as={Link} to={`/projects/${project.id}`} interactive padding="sm">
      <div className="project-card-head">
        <h3>{project.name}</h3>
        <span className="project-card-host">{hostOf(project.url)}</span>
      </div>

      {stats.latestScore === null ? (
        <p className="project-card-empty">Not analyzed yet</p>
      ) : (
        <>
          <div className="project-card-score">
            <strong>{stats.latestScore}</strong>
            <span>/ 100</span>
            {change !== null && change !== 0 && (
              <span
                className={`project-card-delta ${
                  change > 0 ? "up" : "down"
                }`}
              >
                {change > 0 ? "▲" : "▼"} {Math.abs(change)}
              </span>
            )}
          </div>

          {change !== null && (
            <p className="project-card-note">
              {change > 0
                ? `+${change} since first analysis`
                : change < 0
                  ? `${change} since first analysis`
                  : "No change since first analysis"}
            </p>
          )}

          <dl className="project-card-meta">
            <div>
              <dt>Last analyzed</dt>
              <dd>{relativeDay(stats.lastAnalyzedAt)}</dd>
            </div>
            <div>
              <dt>Issues</dt>
              <dd>
                {stats.currentIssueCount ?? "—"}
                {stats.currentIssueCount !== null ? " remaining" : ""}
              </dd>
            </div>
          </dl>
        </>
      )}

      <span className="project-card-cue">View project →</span>
    </Card>
  );
}

export default ProjectCard;
