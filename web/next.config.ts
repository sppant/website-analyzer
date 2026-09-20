import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app only ever serves static marketing/blog content (no per-request
  // dynamic data, no API routes) — static export lets it be deployed as
  // plain files behind nginx, the same way client/dist is today. No Node
  // server process to run in production.
  output: "export",
  images: {
    unoptimized: true,
  },
  // Don't auto-write AGENTS.md/CLAUDE.md on every dev/build run.
  agentRules: false,
};

export default nextConfig;
