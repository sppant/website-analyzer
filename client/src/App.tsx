import { BrowserRouter, Routes, Route, NavLink, Link } from "react-router-dom";

import "./App.css";

import AnalyzerPage from "./pages/AnalyzerPage";
import FeaturesPage from "./pages/FeaturesPage";
import AboutPage from "./pages/AboutPage";

function Navigation() {
  return (
    <nav className="top-nav" aria-label="Main navigation">
      <Link to="/" className="brand">
        <img src="/logo.png" alt="" />
        <span>SEO Opportunity Analyzer</span>
      </Link>

      <div className="nav-links">
        <NavLink to="/features">Features</NavLink>
        <NavLink to="/about">About</NavLink>

        <Link to="/" className="nav-cta">
          Analyze Website
        </Link>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Navigation />

      <main>
        <Routes>
          <Route path="/" element={<AnalyzerPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
