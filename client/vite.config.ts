import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // The SPA (analyzer tool + auth/dashboard) is served under /app — the
  // marketing site (web/) owns the domain root. This makes every built asset
  // resolve under /app/, so it can sit in an `app/` subfolder next to the
  // marketing files without path collisions. Pair with <BrowserRouter
  // basename="/app"> in App.tsx.
  base: "/app/",
  plugins: [react(), tailwindcss()],
});
