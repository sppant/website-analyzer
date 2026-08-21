import type { FormEvent } from "react";
import { ArrowRight, Loader2, Search } from "lucide-react";

type AnalyzerFormProps = {
  url: string;
  isLoading: boolean;
  error: string | null;
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
    <div>
      <form onSubmit={onSubmit}>
        <div className="flex flex-col gap-2 rounded-2xl border border-surface-700 bg-surface-900/90 p-2 shadow-2xl shadow-black/20 backdrop-blur-xl sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
            <Search className="h-5 w-5 shrink-0 text-text-muted" />

            <input
              id="website-url"
              type="text"
              value={url}
              onChange={(event) => onUrlChange(event.target.value)}
              placeholder="https://example.com"
              autoComplete="url"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
              aria-label="Website URL"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-surface-950 shadow-lg shadow-brand-500/20 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing
              </>
            ) : (
              <>
                Analyze Website
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default AnalyzerForm;
