import AuthForm from "../components/AuthForm";
import Seo from "../components/Seo";

function LoginPage() {
  return (
    <>
      <Seo
        title="Log in – SEO Opportunity Analyzer"
        description="Log in to the SEO Opportunity Analyzer to see your saved analyses and usage."
        path="/login"
        noindex
      />
      <AuthForm mode="login" />
    </>
  );
}

export default LoginPage;
