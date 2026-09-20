export const metadata = {
  title: "Page not found – SEO Opportunity Analyzer",
  description: "The page you were looking for could not be found.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-head">
        <h1>Page not found</h1>
        <p>The page you were looking for doesn't exist or has moved.</p>
      </div>

      <p className="auth-alt">
        <a href="/">Go to the homepage</a> or{" "}
        <a href="/app">run a free SEO analysis</a>.
      </p>
    </div>
  );
}
