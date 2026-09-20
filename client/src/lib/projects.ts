import { apiFetch } from "./api";
import type { AnalysisSummary } from "../types/analyses";
import type {
  AnalysisComparison,
  Project,
  ProjectsResponse,
} from "../types/project";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export function listProjects(): Promise<ProjectsResponse> {
  return apiFetch<ProjectsResponse>("/api/projects");
}

export function getProject(id: string): Promise<{ project: Project }> {
  return apiFetch<{ project: Project }>(`/api/projects/${id}`);
}

export function createProject(
  name: string,
  url: string,
): Promise<{ project: Project }> {
  return apiFetch<{ project: Project }>("/api/projects", {
    method: "POST",
    body: JSON.stringify({ name, url }),
  });
}

export function updateProject(
  id: string,
  patch: { name?: string; url?: string },
): Promise<{ project: Project }> {
  return apiFetch<{ project: Project }>(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteProject(id: string): Promise<void> {
  return apiFetch<void>(`/api/projects/${id}`, { method: "DELETE" });
}

export function getProjectAnalyses(
  id: string,
): Promise<{ analyses: AnalysisSummary[] }> {
  return apiFetch<{ analyses: AnalysisSummary[] }>(
    `/api/projects/${id}/analyses`,
  );
}

export function compareProjectAnalyses(
  id: string,
  before: string,
  after: string,
): Promise<{ comparison: AnalysisComparison }> {
  const query = new URLSearchParams({ before, after }).toString();
  return apiFetch<{ comparison: AnalysisComparison }>(
    `/api/projects/${id}/compare?${query}`,
  );
}

/** Top-level navigation target — the Lax session cookie rides along. */
export function projectExportUrl(id: string): string {
  return `${API_URL}/api/projects/${id}/export.csv`;
}
