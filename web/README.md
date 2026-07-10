# Elastic Bangalore — Web Workshop

SvelteKit web UI for the Elastic Bangalore workshop. Participants enter their name, configure Elastic Cloud credentials (stored in browser local storage), and progress through the 30-step lab — with progress stored in Elasticsearch and an admin dashboard for facilitators.

## Stack

- **SvelteKit** + Netlify adapter
- **Elasticsearch** (Elastic Cloud) for workshop state
- **@elastic/elasticsearch** for step verification (same checks as CLI)

## Local development

```bash
cd web
cp .env.example .env
# Set ELASTICSEARCH_URL and ELASTICSEARCH_API_KEY in .env

pnpm install
pnpm run db:bootstrap
pnpm dev
```

Open http://localhost:5173

- **/** — enter name to join
- **/workshop/[id]/setup** — Elastic credentials (local storage only)
- **/workshop/[id]** — workshop UI
- **/admin** — facilitator dashboard (`ADMIN_PASSWORD`)

## Deploy to Netlify + Elastic Cloud

### 1. Elastic Cloud deployment

1. Create a deployment at [cloud.elastic.co](https://cloud.elastic.co)
2. Copy the Elasticsearch endpoint URL (include port `:443`)
3. Create an API key with read/write access to the workshop indices

### 2. Bootstrap indices

From your machine (once per cluster):

```bash
cd web
ELASTICSEARCH_URL="https://..." ELASTICSEARCH_API_KEY="..." pnpm run db:bootstrap
```

This creates five indices: `workshop-participants`, `workshop-sessions`, `workshop-doubts`, `workshop-stuck-events`, `workshop-module-progress`.

### 3. Netlify site

**Option A — Netlify UI**

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**
2. Select this repo
3. Set **Base directory** to `web`
4. Build command and publish directory are read from `web/netlify.toml`
5. **Site configuration → Environment variables**:
   - `ELASTICSEARCH_URL` — Elastic Cloud endpoint
   - `ELASTICSEARCH_API_KEY` — API key for the app cluster
   - `ADMIN_PASSWORD` — facilitator password
6. Deploy

**Option B — Netlify CLI**

```bash
cd web
netlify login
netlify init
netlify env:set ELASTICSEARCH_URL "https://..."
netlify env:set ELASTICSEARCH_API_KEY "your-api-key"
netlify env:set ADMIN_PASSWORD "your-secure-password"
netlify deploy --prod
```

### Environment variables (Netlify)

| Variable | Description |
|----------|-------------|
| `ELASTICSEARCH_URL` | Elastic Cloud Elasticsearch endpoint |
| `ELASTICSEARCH_API_KEY` | API key with index read/write access |
| `ADMIN_PASSWORD` | Admin panel password |

## Data stored

**On the server (Elasticsearch):**

- Participant name and browser user key
- Session progress (all 30 steps)
- Doubts / stuck signals for facilitators

**In the browser only (local storage):**

- Elastic Cloud credentials (Elasticsearch URL and API key)

## Security notes

- Change `ADMIN_PASSWORD` in production
- Rotate API keys if exposed; never commit credentials to git
- Use HTTPS (Netlify provides this automatically)
- Elastic lab credentials are not persisted on the workshop server
