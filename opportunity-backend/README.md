# Opportunity Backend

A backend system that automatically collects opportunities from RSS feeds, cleans and structures the data, stores it in Supabase, generates embeddings, and makes it retrievable through AI-powered semantic search.

## Features

- **RSS Feed Ingestion**: Automatically fetches opportunities from multiple RSS sources
- **Data Cleaning**: Removes HTML, normalizes whitespace, cleans URLs, ensures UTF-8
- **Opportunity Classification**: AI-powered classification by type, field/sector, and location
- **Vector Embeddings**: Generates embeddings using OpenAI for semantic search
- **Semantic Search**: AI-powered natural language search
- **REST API**: Full API for searching and managing opportunities
- **Automated Scheduling**: Runs ingestion every 6-12 hours automatically

## Supported Opportunity Types

- Jobs
- Internships
- Scholarships
- Fellowships
- Training
- Grants
- Competitions
- Volunteer positions
- Conferences

## Setup

### 1. Install Dependencies

```bash
cd opportunity-backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-api-key  # Optional, for embeddings
PORT=3001
NODE_ENV=development
INGESTION_INTERVAL_HOURS=6
```

### 3. Run the Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

## Usage

### Manual Ingestion

Run a one-time ingestion from all configured RSS sources:

```bash
npm run ingest
```

### Single Feed Ingestion

Process a single RSS feed URL:

```bash
npm run ingest:single -- --url=https://opportunitydesk.org/feed/
```

### Start API Server

```bash
npm run serve
```

## API Endpoints

### Search Opportunities

```http
GET /opportunities/search?query=software+engineer&country=Uganda&type=job
```

Query Parameters:
- `query` - Search text (supports natural language)
- `type` - Filter by type (job, internship, scholarship, etc.)
- `field` - Filter by sector (ICT, Engineering, Health, etc.)
- `country` - Filter by country
- `limit` - Max results (default: 20)
- `offset` - Pagination offset

### List Opportunity Types

```http
GET /opportunities/types
```

### List Fields/Sectors

```http
GET /opportunities/fields
```

### Get Statistics

```http
GET /opportunities/stats
```

### Chat Search (AI-formatted response)

```http
POST /opportunities/chat-search
Content-Type: application/json

{
  "query": "Find me tech internships in Kenya"
}
```

### Trigger Ingestion (Admin)

```http
POST /ingestion/run
X-API-Key: your-admin-key
```

### Add RSS Source (Admin)

```http
POST /ingestion/sources
X-API-Key: your-admin-key
Content-Type: application/json

{
  "name": "My Job Board",
  "url": "https://myjobboard.com/feed",
  "is_active": true
}
```

### Validate RSS Feed

```http
POST /ingestion/validate
Content-Type: application/json

{
  "url": "https://example.com/feed"
}
```

## Default RSS Sources

The system comes pre-configured with these sources:

- Opportunities For Youth
- Opportunity Corners
- Opportunity Desk
- After School Africa
- Youth Opportunities
- Scholars4Dev
- MyJobMag East Africa
- Fuzu Uganda Jobs

## Architecture

```
opportunity-backend/
├── config/
│   └── index.ts          # Configuration & constants
├── src/
│   ├── api/
│   │   ├── server.ts     # Express server
│   │   └── routes/       # API routes
│   ├── services/
│   │   ├── classifier.ts      # Opportunity classification
│   │   ├── database.ts        # Supabase operations
│   │   ├── embeddingService.ts # OpenAI embeddings
│   │   ├── ingestion.ts       # Main ingestion pipeline
│   │   ├── rssFetcher.ts      # RSS feed fetching
│   │   └── searchService.ts   # Search & retrieval
│   ├── types/
│   │   └── index.ts      # TypeScript types
│   ├── utils/
│   │   ├── cleaner.ts    # Data cleaning
│   │   ├── logger.ts     # Winston logger
│   │   ├── scheduler.ts  # Cron scheduling
│   │   └── supabase.ts   # Supabase client
│   ├── scripts/
│   │   ├── ingest.ts     # Manual ingestion script
│   │   └── ingest-single.ts
│   └── index.ts          # Main entry point
```

## Database Schema

The system uses these Supabase tables (already created in careercompass-ug):

### opportunities
- `id` - UUID primary key
- `title` - Opportunity title
- `organization` - Company/organization name
- `description` - Full description
- `url` - Unique canonical URL
- `source` - RSS source name
- `type` - job, internship, scholarship, etc.
- `field` - ICT, Engineering, Health, etc.
- `country` - Location
- `published_at` - Original publish date
- `created_at` - Database insert time
- `embedding` - Vector(1536) for semantic search

### rss_sources
- `id` - UUID primary key
- `name` - Source name
- `url` - RSS feed URL
- `is_active` - Whether to fetch from this source
- `last_fetched_at` - Last successful fetch
- `last_error` - Error message if failed
- `items_count` - Items in last fetch

### opportunity_ingestion_logs
- `id` - UUID primary key
- `source_url` - URL being processed
- `status` - running, completed, failed
- `items_fetched/inserted/skipped/failed` - Counts
- `error_message` - If failed
- `started_at/completed_at` - Timestamps

## Integration with CareerCompass AI Chat

The chat-agent Edge Function in the main project already has the `searchOpportunitiesSemantic` tool configured. It will automatically use the opportunities table populated by this backend.

### To enable external API calls from the chat:

1. Set the backend URL in the Edge Function environment:
   ```
   OPPORTUNITY_BACKEND_URL=https://your-backend.com
   ```

2. The chat can then call the backend API for enhanced search capabilities.

## Deployment

### Render (Recommended)

The project includes a `render.yaml` Blueprint for easy deployment:

1. **Create a Render account** at [render.com](https://render.com)

2. **Connect your repository**:
   - Go to Dashboard → New → Blueprint
   - Connect your GitHub/GitLab repo containing `opportunity-backend`
   - Render auto-detects `render.yaml`

3. **Set environment variables** in Render dashboard:
   ```
   SUPABASE_URL=https://xicdxswrtdassnlurnmp.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   OPENAI_API_KEY=<your-openai-key>
   REDIS_URL=<optional-redis-url>
   ```

4. **Deploy** - Render builds and deploys automatically

5. **Update frontend** - In careercompass-ug Vercel settings:
   ```
   VITE_OPPORTUNITIES_API_URL=https://opportunity-backend.onrender.com
   ```

The Blueprint creates:
- **Web Service**: API server on free tier ($0) or starter ($7/mo)
- **Cron Job**: RSS ingestion every 6 hours

### Docker

A `Dockerfile` is included for containerized deployment:

```bash
# Build
docker build -t opportunity-backend .

# Run
docker run -p 3001:3001 \
  -e SUPABASE_URL=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  -e OPENAI_API_KEY=... \
  opportunity-backend
```

### Manual Deployment (Railway/Fly.io/etc)

1. Set environment variables in platform dashboard
2. Build command: `npm run build`
3. Start command: `npm start`
4. Health check path: `/health`

### Cron Jobs (Alternative to built-in scheduler)

If deploying to serverless, use external cron:

```bash
# Every 6 hours (use Render Cron, GitHub Actions, or cron-job.org)
0 */6 * * * curl -X POST https://your-backend.com/ingestion/run
```

## Monitoring

- Logs are written to `logs/combined.log` and `logs/error.log`
- Health check: `GET /health`
- Statistics: `GET /opportunities/stats`

## License

MIT
"# bridge_api" 
