# mylilshopper

An AI-powered personal shopping agent that learns your style from wardrobe photos, Pinterest boards, and a style quiz — then finds real products from the stores you actually shop at.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Backend | Vercel serverless functions |
| Database | Supabase (Postgres + Auth + Storage) |
| AI | Anthropic Claude (Sonnet for agent, Haiku for image analysis) |
| Shopping | SerpAPI Google Shopping |

---

## Prerequisites

- **Node.js 18, 20, or 22 LTS** — Node 24+ is not supported. Check with `node --version`.
  If you need to switch versions, install [nvm](https://github.com/nvm-sh/nvm) and run `nvm install 20 && nvm use 20`.
- **Vercel CLI** — `npm i -g vercel`

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd mylittleshopper
npm install
```

### 2. Get your `.env.local`

The environment file is not committed to the repo. **Get it directly from a teammate** — do not pull it from Vercel CLI, as `vercel env pull` will generate empty values for the Supabase keys.

Place the file at the project root as `.env.local`.

**If you need to build it yourself**, you need these keys:

| Key | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon/public key |
| `SUPABASE_URL` | Same as `VITE_SUPABASE_URL` |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API → service_role key |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `SHOPPING_API_KEY` | serpapi.com → Dashboard |
| `SHOPPING_API_PROVIDER` | Set to `serpapi` |

> The app will show a blank screen and throw a Supabase error if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are missing or empty.

### 3. Link to Vercel

```bash
vercel link --yes
```

### 4. Run

```bash
vercel dev
```

Opens at **http://localhost:3000**

> `npm run dev` (port 5173) runs the frontend only — the agent and all `/api` routes won't work. Always use `vercel dev` for the full stack.

---

## Project structure

```
/api          Serverless functions — agent, analyze, feedback, lens, conversations
/src
  /pages      Landing, Login, Onboarding, Dashboard, StyleVault, Orders
  /components UI components + DashboardLayout
  /lib        Supabase client
/tools        Agent tools — search, score, build outfits, analyze images, update DNA
/workflows    Markdown SOPs the agent reads before acting
```

---

## Troubleshooting

**Blank screen + Supabase error on startup**
`VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing or empty in your `.env.local`. Get the real values from the Supabase dashboard. Do not use values pulled via `vercel env pull` — they come through empty.

**`vercel dev` shows blank screen with 404s for `main.jsx`, `@vite/client`, `@react-refresh`**
A catch-all rewrite in `vercel.json` is intercepting Vite's internal assets. The `vercel.json` in this repo has no catch-all rewrite for this reason — do not add one.

**Port 3000 already in use**
A previous server is still running. Kill it and restart:
```bash
lsof -ti :3000 | xargs kill -9
vercel dev
```

**Agent returns no products**
`SHOPPING_API_KEY` or `SHOPPING_API_PROVIDER=serpapi` is missing from `.env.local`.

**`nvm: command not found` after installing nvm**
Run the three `export` lines printed at the end of the nvm install output, or open a new terminal tab before running `nvm install 20`.
