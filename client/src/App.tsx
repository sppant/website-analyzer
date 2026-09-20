import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Link,
} from "react-router-dom";

import "./App.css";

import AnalyzerPage from "./pages/AnalyzerPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectPage from "./pages/ProjectPage";
import AnalysisDetailPage from "./pages/AnalysisDetailPage";
import PricingPage from "./pages/PricingPage";
import NotFoundPage from "./pages/NotFoundPage";
import Footer from "./components/Footer";
import CookieConsent from "./components/CookieConsent";
import { AuthProvider, useAuth } from "./auth/AuthContext";

function Navigation() {
  const { status, user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    // The homepage is the marketing site (a separate app), so this is a full
    // navigation, not a client-side route change.
    window.location.href = "/";
  }

  return (
    <nav className="top-nav" aria-label="Main navigation">
      <a href="/" className="brand">
        <img src="/logo.png" alt="" width={30} height={30} />
        <span>SEO Opportunity Analyzer</span>
      </a>

      <div className="nav-links">
        {/* Served by the standalone Next.js marketing app (see web/) — plain
            links so the browser does a full navigation instead of the SPA
            router trying (and failing) to match a client-side route. */}
        <a href="/features">Features</a>
        <NavLink to="/pricing">Pricing</NavLink>
        <a href="/blog">Blog</a>
        <a href="/about">About</a>

        {status === "authenticated" && (
          <>
            <NavLink to="/dashboard" className="nav-user" title={user?.email}>
              {user?.email}
            </NavLink>
            <button
              type="button"
              className="nav-link-button"
              onClick={handleLogout}
            >
              Log out
            </button>
          </>
        )}

        {status === "anonymous" && (
          <>
            <NavLink to="/login">Log in</NavLink>
            <Link to="/signup" className="nav-cta">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    // Served under /app — the marketing site (web/) owns the domain root.
    // basename keeps route paths below written as "/", "/pricing", … while the
    // browser URLs are "/app", "/app/pricing", …. See vite.config.ts `base`.
    <BrowserRouter basename="/app">
      <AuthProvider>
        <Navigation />
        <CookieConsent />

        <main>
          <Routes>
            <Route path="/" element={<AnalyzerPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects/:id" element={<ProjectPage />} />
            <Route path="/analyses/:id" element={<AnalysisDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        <Footer />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
