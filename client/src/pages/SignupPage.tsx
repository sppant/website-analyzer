import AuthForm from "../components/AuthForm";
import Seo from "../components/Seo";

function SignupPage() {
  return (
    <>
      <Seo
        title="Sign up – SEO Opportunity Analyzer"
        description="Create a free SEO Opportunity Analyzer account to save your analyses and track usage."
        path="/signup"
        noindex
      />
      <AuthForm mode="signup" />
    </>
  );
}

export default SignupPage;
