/**
 * In-process bounded concurrency — enough for on-demand crawling without a
 * queue/worker system. Structured so it can be swapped for a real job runner
 * later without changing the crawler logic.
 */

/** Runs `fn` for each item, at most `concurrency` at a time. `fn` must not throw. */
export async function pooledForEach<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor++;
      await fn(items[index]!, index);
    }
  };
  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length)) },
    worker,
  );
  await Promise.all(workers);
}

export type CrawlQueueOptions<P> = {
  seeds: string[];
  maxPages: number;
  concurrency: number;
  /**
   * Absolute time (epoch ms) after which no new URLs are dequeued. In-flight
   * work is allowed to finish. Omit for no time limit.
   */
  deadline?: number;
  /**
   * Fetches + processes one URL. Must never reject — return a page describing
   * the failure instead. Returns the page plus any newly discovered URLs.
   */
  process: (url: string) => Promise<{ page: P; discovered: string[] }>;
};

/**
 * Breadth-first crawl with bounded concurrency and a hard page cap.
 *
 * - `queued` guards against re-queuing, self-links and circular navigation.
 * - Never fetches more than `maxPages` URLs.
 * - Newly discovered URLs are only enqueued while under the cap.
 */
export async function runCrawlQueue<P>(
  options: CrawlQueueOptions<P>,
): Promise<P[]> {
  const { maxPages, concurrency, process, deadline } = options;
  const outOfTime = (): boolean =>
    deadline !== undefined && Date.now() >= deadline;

  const queued = new Set<string>();
  const queue: string[] = [];
  for (const seed of options.seeds) {
    if (!queued.has(seed) && queued.size < maxPages) {
      queued.add(seed);
      queue.push(seed);
    }
  }

  const pages: P[] = [];
  let running = 0;
  let settle!: () => void;
  const done = new Promise<void>((resolve) => {
    settle = resolve;
  });

  const pump = (): void => {
    if (running === 0 && (queue.length === 0 || outOfTime())) {
      settle();
      return;
    }

    while (
      running < concurrency &&
      queue.length > 0 &&
      pages.length + running < maxPages &&
      !outOfTime()
    ) {
      const url = queue.shift()!;
      running += 1;

      void process(url)
        .then(({ page, discovered }) => {
          pages.push(page);
          for (const next of discovered) {
            if (!queued.has(next) && queued.size < maxPages) {
              queued.add(next);
              queue.push(next);
            }
          }
        })
        .catch(() => {
          /* process is contracted not to reject; this is a safety net */
        })
        .finally(() => {
          running -= 1;
          pump();
        });
    }

    if (
      running === 0 &&
      (pages.length >= maxPages || queue.length === 0 || outOfTime())
    ) {
      settle();
    }
  };

  pump();
  await done;
  return pages;
}
