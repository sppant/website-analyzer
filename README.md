# Website SEO Opportunity Analyzer

A full-stack SEO analysis tool that scans a website and identifies practical opportunities to improve its technical and on-page SEO.

## Overview

The analyzer is designed to turn technical SEO checks into actionable recommendations rather than simply reporting whether individual elements exist.

Instead of presenting a large list of technical findings, it prioritizes issues by severity and potential score impact, helping users understand what should be fixed first.

## Screenshots

### SEO Score

![SEO Score](screenshots/score.png)

### SEO Analysis

![SEO Analysis](screenshots/seo-analysis.png)

### Biggest Opportunities

![Biggest Opportunities](screenshots/opportunities.png)

## Features

### SEO Analysis

- SEO score out of 100
- Page title analysis
- Meta description analysis
- H1 heading analysis
- Canonical URL detection
- HTML language detection
- Viewport detection
- HTTPS detection
- Image and missing `alt` attribute analysis

### Technical SEO

- `robots.txt` detection
- `robots.txt` sitemap detection
- Detection of broad `robots.txt` blocking
- XML sitemap detection
- Sitemap URL count

### Social Metadata

- Open Graph metadata analysis
- Twitter/X card detection

### Recommendations

- Prioritized SEO opportunities
- Severity classification
- Score impact for each issue
- Actionable fix recommendations
- Top 3 highest-priority issues to address

### Search Preview

- Google-style search result preview
- Page title preview
- Search result URL preview
- Meta description preview

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React

### Backend

- Node.js
- TypeScript
- Fastify
- Cheerio
- `@fastify/cors`

## Security

Because the analyzer accepts user-provided URLs, the backend validates remote requests before fetching them.

The analyzer includes:

- HTTP/HTTPS-only URL validation
- Credential-free URL validation
- DNS resolution checks
- Private and reserved IP blocking
- Redirect destination validation
- Maximum redirect limit
- Request timeouts
- Response size limits
- API rate limiting

website-analyzer/

├── client/
│ ├── src/
│ │ ├── components/
│ │ ├── hooks/
│ │ ├── types/
│ │ └── utils/
│ ├── public/
│ └── package.json
│
├── server/
│ ├── src/
│ │ ├── analyzer/
│ │ │ └── seoRules.ts
│ │ ├── routes/
│ │ │ └── analyze.ts
│ │ ├── services/
│ │ │ └── seoAnalyzer.ts
│ │ └── index.ts
│ └── package.json
│
└── README.md

````

## Running Locally

### Frontend

```bash
cd client
npm install
npm run dev
````

The frontend runs on the Vite development server, typically at:

`http://localhost:5173`

### Backend

In a separate terminal:

```bash
cd server
npm install
npm run dev
```

The API runs on:

`http://localhost:3000`

## API

### Health Check

```text
GET /api/health
```

### Analyze a Website

```text
POST /api/analyze
```

Example request:

```json
{
  "url": "https://example.com"
}
```

## How It Works

The user submits a website URL through the React frontend.

The Fastify backend then:

1. Validates and sanitizes the submitted URL.
2. Resolves the hostname and checks that it points to a publicly accessible address.
3. Fetches the website with timeout and response-size limits.
4. Parses the HTML using Cheerio.
5. Extracts on-page SEO and social metadata.
6. Checks technical files such as `robots.txt` and `sitemap.xml`.
7. Evaluates the collected data against a set of SEO rules.
8. Calculates an overall SEO score.
9. Prioritizes the detected issues by severity and score impact.
10. Returns the structured analysis to the frontend.

The frontend turns the analysis into a visual report containing the SEO score, technical analysis, prioritized opportunities, recommendations, and a search-result preview.

## Production Build

The backend is written in TypeScript and compiled before production:

```bash
npm run build
```

The generated JavaScript is placed in the `dist` directory.

## Disclaimer

This tool provides automated SEO checks and should be used as a starting point for further analysis. It does not replace a complete technical SEO audit or search engine-specific diagnostics.
