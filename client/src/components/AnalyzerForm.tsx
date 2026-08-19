import type { FormEvent } from "react";

type AnalyzerFormProps = {
  url: string;
  isLoading: boolean;
  error: string;
  onUrlChange: (url: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function AnalyzerForm({
  url,
  isLoading,
  error,
  onUrlChange,
  onSubmit,
}: AnalyzerFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="website-url">Website URL</label>

      <input
        id="website-url"
        type="text"
        value={url}
        onChange={(event) => onUrlChange(event.target.value)}
        placeholder="https://example.com"
        autoComplete="url"
      />

      <button type="submit" disabled={isLoading}>
        {isLoading ? "Analyzing..." : "Analyze Website"}
      </button>

      {error && <p role="alert">{error}</p>}
    </form>
  );
}

export default AnalyzerForm;
