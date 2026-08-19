# Website SEO Opportunity Analyzer

A full-stack SEO analysis tool that scans a website and identifies practical opportunities to improve its technical and on-page SEO.

## Screenshots

### SEO Score

![SEO Score](screenshots/score.png)

### SEO Analysis

![SEO Analysis](screenshots/seo-analysis.png)

### Biggest Opportunities

![Biggest Opportunities](screenshots/opportunities.png)

## Features

- SEO score out of 100
- Page title analysis
- Meta description analysis
- H1 heading analysis
- Canonical URL detection
- HTML language detection
- Viewport detection
- HTTPS detection
- Image and missing `alt` attribute analysis
- `robots.txt` detection
- `robots.txt` sitemap detection
- Detection of broad `robots.txt` blocking
- XML sitemap detection
- Sitemap URL count
- Open Graph metadata analysis
- Twitter/X card detection
- Prioritized SEO opportunities with score impact

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- CSS

### Backend

- Node.js
- TypeScript
- Fastify
- Cheerio
- `@fastify/cors`

## Project Structure

```text
website-analyzer/
├── client/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── analyzer/
│   │   │   └── seoRules.ts
│   │   └── index.ts
│   └── package.json
│
└── README.md
```

## Running Locally

### Frontend

```bash
cd client
npm install
npm run dev
```

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

The backend fetches the target website and parses its HTML using Cheerio. It extracts SEO-related information, checks technical files such as `robots.txt` and `sitemap.xml`, evaluates social sharing metadata, and calculates an overall SEO score.

The frontend presents the analysis as a visual report and highlights the most important opportunities for improvement.

## Production Build

The backend is written in TypeScript and compiled before production:

```bash
npm run build
```

The generated JavaScript is placed in the `dist` directory.

## Disclaimer

This tool provides automated SEO checks and should be used as a starting point for further analysis. It does not replace a complete technical SEO audit or search engine-specific diagnostics.
