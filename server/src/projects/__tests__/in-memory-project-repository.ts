import { randomUUID } from "node:crypto";

import type {
  NewProject,
  Project,
  ProjectRepository,
} from "../project-repository.js";

export function createInMemoryProjectRepository(): ProjectRepository {
  const rows: Project[] = [];

  const owned = (id: string, userId: string) =>
    rows.find((row) => row.id === id && row.userId === userId) ?? null;

  const insert = (project: NewProject): Project => {
    const now = new Date(Date.now() + rows.length);
    const row: Project = {
      id: randomUUID(),
      userId: project.userId,
      name: project.name,
      url: project.url,
      createdAt: now,
      updatedAt: now,
    };
    rows.push(row);
    return row;
  };

  return {
    async listForUser(userId) {
      return rows
        .filter((row) => row.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async countForUser(userId) {
      return rows.filter((row) => row.userId === userId).length;
    },

    async create(project) {
      return insert(project);
    },

    async createWithinLimit(project, limit) {
      // Node is single-threaded, so this count-then-insert is atomic here; the
      // Postgres implementation takes a per-user row lock for the same guarantee.
      if (rows.filter((row) => row.userId === project.userId).length >= limit) {
        return null;
      }
      return insert(project);
    },

    async getForUser(id, userId) {
      return owned(id, userId);
    },

    async update(id, userId, patch) {
      const row = owned(id, userId);
      if (!row) return null;
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.url !== undefined) row.url = patch.url;
      row.updatedAt = new Date();
      return { ...row };
    },

    async delete(id, userId) {
      const index = rows.findIndex(
        (row) => row.id === id && row.userId === userId,
      );
      if (index === -1) return false;
      rows.splice(index, 1);
      return true;
    },
  };
}
