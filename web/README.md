# Elastic Bangalore — Web Workshop

SvelteKit web UI for the Elastic Bangalore workshop. Participants enter their name, configure Elastic Cloud credentials (stored in browser local storage), and progress through the 30-step lab — with progress stored in PostgreSQL and an admin dashboard for facilitators.

## Stack

- **SvelteKit** + Netlify adapter
- **PostgreSQL** (Supabase in production) via Drizzle ORM
- **@elastic/elasticsearch** for step verification (same checks as CLI)

## Local development

```bash
cd web
cp .env.example .env

# Create local database once (if needed)
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE elastic_bangalore;"

pnpm install
pnpm run db:migrate
pnpm dev
```

Open http://localhost:5173

- **/** — enter name to join
- **/workshop/[id]/setup** — Elastic credentials (local storage only)
- **/workshop/[id]** — workshop UI
- **/admin** — facilitator dashboard (`ADMIN_PASSWORD`)

## Deploy to Netlify + Supabase

### 1. Supabase database

1. Create a project at [supabase.com](https://supabase.com)
2. Open **Project Settings → Database**
3. Copy the **Transaction pooler** connection string (port **6543**, mode **Transaction**)
4. Replace `[YOUR-PASSWORD]` with your database password

### 2. Run migrations against Supabase

From your machine (once):

```bash
cd web
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" pnpm run db:migrate
```

### 3. Netlify site

**Option A — Netlify UI**

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**
2. Select this repo
3. Set **Base directory** to `web`
4. Build command and publish directory are read from `web/netlify.toml`
5. **Site configuration → Environment variables**:
   - `DATABASE_URL` — Supabase transaction pooler URL
   - `ADMIN_PASSWORD` — facilitator password
6. Deploy

**Option B — Netlify CLI**

```bash
cd web
netlify login
netlify init
netlify env:set DATABASE_URL "postgresql://..."
netlify env:set ADMIN_PASSWORD "your-secure-password"
netlify deploy --prod
```

### Environment variables (Netlify)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase Postgres connection string (use pooler port 6543) |
| `ADMIN_PASSWORD` | Admin panel password |

## Data stored

**On the server (Supabase):**

- Participant name and browser user key
- Session progress (all 30 steps)
- Doubts / stuck signals for facilitators

**In the browser only (local storage):**

- Elastic Cloud credentials (Elasticsearch URL, API key, Kibana URL)

## Security notes

- Change `ADMIN_PASSWORD` in production
- Use HTTPS (Netlify provides this automatically)
- Elastic credentials are not persisted on the workshop server
