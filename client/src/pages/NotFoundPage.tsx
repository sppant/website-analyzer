import { Link } from "react-router-dom";

import Seo from "../components/Seo";

function NotFoundPage() {
  return (
    <div className="dashboard-page">
      <Seo
        title="Page not found – SEO Opportunity Analyzer"
        description="The page you were looking for could not be found."
        path="/404"
        noindex
      />

      <div className="dashboard-head">
        <h1>Page not found</h1>
        <p>The page you were looking for doesn't exist or has moved.</p>
      </div>

      <p className="auth-alt">
        <Link to="/">Go to the SEO analyzer</Link>
      </p>
    </div>
  );
}

export default NotFoundPage;
