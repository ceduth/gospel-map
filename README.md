# Gospel Map - Setup Guide

Next.js application visualizing Jesus Film Project user engagement on an interactive map with 24-hour timeline playback.

## Prerequisites

- Node.js 18+
- Google Cloud service account with BigQuery Storage Read API access
- Service account key JSON file

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure BigQuery Access

1. Place `service-account-key.json` in project root (local dev)
2. Grant service account these IAM roles in Google Cloud Console:
   - **BigQuery Data Viewer** (read table data)
   - **BigQuery Read Session User** (Storage Read API)

### 3. Environment Variables

**Local development** - create `.env.local`:
```env
# Required
GOOGLE_SERVICE_ACCOUNT_PATH=./service-account-key.json
BIGQUERY_PROJECT_ID=jfp-data-warehouse
BIGQUERY_DATASET=prod

# Optional - Debug logging
DEBUG_BIGQUERY=true                      # Server-side BQ logs
NEXT_PUBLIC_DEBUG_METRICS=true           # Client-side metrics logs

# Optional - Data source behavior
NEXT_PUBLIC_DEMO_MODE=true               # Use local CSV only, skip BigQuery
NEXT_PUBLIC_DISABLE_CSV_FALLBACK=true    # Disable CSV fallback, show "No Data" UI
```

**Production (Vercel)** - add env vars in dashboard:
```env
GOOGLE_SERVICE_ACCOUNT_JSON=<paste entire JSON file content>
BIGQUERY_PROJECT_ID=jfp-data-warehouse
BIGQUERY_DATASET=prod
```

### 4. Run Development Server
```bash
npm run dev
```

Open http://localhost:3000

## Data Flow
```
BigQuery Storage Read API → /api/metrics → Frontend → Map visualization

Tables:
- prod.map_ga4 → app
- prod.map_web → web
```

## Features

- **Media Views**: Cumulative view counts from app and web sources
- **Cumulative Visualization**: Markers grow as timeline progresses through 24 hours
- **Source Filtering**: Toggle app/web data sources
- **24-Hour Playback**: Auto-plays through day with pause/scrub controls

## Troubleshooting

**500 Error**: Check service account has BigQuery Storage Read API permissions  
**No Data**: Verify `.env.local` values match your GCP project  
**"No Data Available" UI**: API failed and CSV fallback is disabled  
**Fallback to CSV**: BigQuery unavailable, using local CSV file  
**Demo Mode**: Set `NEXT_PUBLIC_DEMO_MODE=true` to use sample data without BigQuery