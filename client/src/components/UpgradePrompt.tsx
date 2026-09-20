import UpgradeButton from "./UpgradeButton";

type UpgradePromptProps = {
  title: string;
  description?: string;
  /** Bullet list of what Pro unlocks. */
  benefits?: string[];
};

const DEFAULT_BENEFITS = [
  "Full website crawl — up to 100 pages",
  "Broken-link detection (internal + external)",
  "Competitor comparison",
  "SEO score tracking + before / after comparisons",
  "Up to 10 projects, 50 analyses per month",
  "CSV export",
];

/**
 * A non-intrusive "here's what Pro gives you" block. The button reuses the
 * existing Stripe Checkout flow via <UpgradeButton>.
 */
function UpgradePrompt({
  title,
  description,
  benefits = DEFAULT_BENEFITS,
}: UpgradePromptProps) {
  return (
    <div className="upgrade-prompt">
      <span className="upgrade-prompt-badge">PRO</span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      <ul>
        {benefits.map((benefit) => (
          <li key={benefit}>{benefit}</li>
        ))}
      </ul>
      <UpgradeButton label="Upgrade to Pro — $9/month" />
    </div>
  );
}

export default UpgradePrompt;
