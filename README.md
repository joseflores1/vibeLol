# vibeLol

[![CI](https://github.com/joseflores1/vibeLol/actions/workflows/ci.yml/badge.svg)](https://github.com/joseflores1/vibeLol/actions/workflows/ci.yml)
[![backend: TypeScript 7](https://img.shields.io/badge/backend-TypeScript%207-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![frontend: TypeScript 6](https://img.shields.io/badge/frontend-TypeScript%206-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma 7](https://img.shields.io/badge/Prisma-7-5a67d8?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Node 24](https://img.shields.io/badge/Node-24_LTS-5fa04e?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-4169e1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

## Description

League of Legends statistics platform in the style of [op.gg](https://op.gg/),
[lolalytics](https://lolalytics.com/), and [u.gg](https://u.gg/). It aggregates
summoner profiles, match history, ranked stats, champion mastery, and champion
win-rate analytics, powered by the [Riot Games API](https://developer.riotgames.com/).

> vibeLol isn't endorsed by Riot Games and doesn't reflect the views or
> opinions of Riot Games or anyone officially involved in producing or
> managing Riot Games properties. All data shown is provided by Riot Games.

## Motivation

Most LoL stats sites are closed-source black boxes — you can't see how they
handle Riot's rate limits, how they cache expensive match pulls, or how they
normalize the sprawling match-participant payload into something queryable.
vibeLol is a from-scratch, end-to-end implementation of that stack:

- A **thin Riot HTTP layer** (rate-limit-aware, honoring `Retry-After`) so
  the scary parts of the Riot API are isolated and mockable.
- A **Postgres-backed cache** via Prisma (`upsert` keyed on Riot IDs) so the
  frontend never calls Riot directly and repeated lookups are cheap.
- A **typed REST surface** the React frontend consumes, decoupling UI from
  upstream API churn.

It's also a portfolio project: every layer (Riot client, services, Prisma
schema, controllers, routes) is written to industry conventions, with
type-safe contracts (Zod), centralized error handling, and CI that runs a
mocked test suite (no live Riot key in CI).

## Quick Start

### Prerequisites

- [Node.js 24+](https://nodejs.org)
- [Docker](https://docs.docker.com/get-docker/)
- A [Riot Games API key](https://developer.riotgames.com/) (for the backend)

### First time setup

**1. Install dependencies**

```bash
cd back && npm install && cd ..
cd front && npm install
```

**2. Set up environment variables**

```bash
# Root — database credentials for Docker
cp .env.example .env

# Backend — database URL for Prisma + Riot API key
cp back/.env.example back/.env
```

Fill in your values in both `.env` files. The backend `.env` needs at least:

- `DATABASE_URL` — Postgres connection string
- `RIOT_API_KEY` — your Riot Games API key

**3. Start the database and run migrations**

```bash
docker compose up -d
cd back && npx prisma migrate dev
```

## Usage

Open 3 terminals:

```bash
# Terminal 1 — from project root
docker compose up -d

# Terminal 2
cd back && npm run dev

# Terminal 3
cd front && npm run dev
```

| Service  | URL                   |
|----------|-----------------------|
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:3000 |

### Database

```bash
# Apply migrations after pulling changes that update the schema
cd back && npx prisma migrate dev

# Visual database explorer
cd back && npx prisma studio
```

### Stopping the project

**Backend and frontend:** `Ctrl+C` in each terminal

**Database:**

```bash
# Stop the container (keeps data, fast restart)
docker compose stop

# Stop and remove the container (data is safe in the volume)
docker compose down
```

> `stop` vs `down`: both preserve your data. Use `stop` if you'll restart soon,
> `down` for a clean shutdown. To restart after either, run `docker compose up -d`.

## API Reference

All endpoints live under `/api/v1` and share one response envelope:
`{ success: true, data }` on success, `{ success: false, message, errors? }`
on failure. User-facing routes use **Riot IDs** (`gameName/tagLine`) — never
puuids (see AGENTS.md §5a). `region` is the platform code (`na1`, `euw1`,
`kr`, …) and defaults to `na1`.

### Health

| Endpoint | Description |
|---|---|
| `GET /api/health` | Server + DB connectivity ping |

### Summoners — Riot-ID scoped

| Endpoint | Description |
|---|---|
| `GET /summoners/by-riot-id/:gameName/:tagLine?region=` | Account + Summoner profile (level, icon, revision) |
| `GET /summoners/by-riot-id/:g/:t/matches?region=&start=&count=&queue=&type=&startTime=&endTime=&champion=` | Match ID list (`count` ≤ 100). Custom-queue matches are filtered server-side. `champion` switches to a cache-scoped path (Riot can't filter by champion) |
| `GET /summoners/by-riot-id/:g/:t/matches/:matchId?region=` | Full match: 10 participants + team aggregates. Cached on first miss |
| `GET /summoners/by-riot-id/:g/:t/league?region=` | Ranked entries (solo/flex; empty if unranked) |
| `GET /summoners/by-riot-id/:g/:t/mastery?region=` | Full champion mastery list |
| `GET /summoners/by-riot-id/:g/:t/mastery/:championId?region=` | Single-champion mastery |

### Matches — match-scoped

| Endpoint | Description |
|---|---|
| `GET /matches/:matchId/timeline?region=` | Per-minute frames + puuid order. Raw timeline cached forever; bulky events stripped from the response |

### Analytics

| Endpoint | Description |
|---|---|
| `GET /analytics/champions?queue=&patch=&start=&count=` | Per-champion `games/wins/bans/winRate/pickRate/banRate/avg*`, sorted by games desc |
| `GET /analytics/champions/:championId?queue=&patch=` | Drilldown: extended averages, position breakdown, item/keystone/spell popularity, matchup counters |

Scope rules enforced server-side: only analytics-eligible queues (400 on
ARAM/Bots/URF/Arena/tutorials), custom games never counted, `patch` is an
exact Match v5 `gameVersion` bucket. Aggregation runs on-the-fly over the
cached `match_participants` table with a 10-minute response cache; popularity
and matchups sample the champion's most recent ≤1000 cached rows.

### Search

| Endpoint | Description |
|---|---|
| `GET /search/suggest?q=` | Autocomplete over the cached Account table (prefix, case-insensitive, top 10). No Riot call — only covers previously searched players |

### Static (Data Dragon metadata, cached in memory)

| Endpoint | Description |
|---|---|
| `GET /static/version` | Latest Data Dragon version |
| `GET /static/champions` | Champion map (numeric key → alphabetic id/name) |
| `GET /static/items` | Item map with gold costs |
| `GET /static/spells` | Summoner spell map (cast id → asset id) |
| `GET /static/runes` | Flattened rune tree (perk id → icon/name/style) |
| `GET /static/queues` | Queue catalog with `analyticsEligible` flags |

### Caveats

- **Dev-key sample size:** with a Riot development key (~20 req/100s), the
  cache only accumulates matches from summoners people search for. Analytics
  rows with low `games` are noise — gate them in the UI until the sample
  grows.
- **Champion-filtered history is cache-scoped:** Riot's match-list endpoint
  has no champion filter, so `?champion=` serves exclusively from locally
  cached matches. Un-cached games won't appear until the profile's match
  history has been fetched.
- **Custom-game history:** Riot requires RSO (production key) opt-in before a
  player's custom-queue match history may be displayed. Until then the
  backend filters what it can server-side (queued customs are rejected;
  cached customs are dropped from lists) — full coverage lands with a
  production key.
- **No rank-tier analytics dimension:** Match v5 doesn't carry the players'
  ranked tiers, so per-tier win rates (à la lolalytics) aren't computable
  from current data.

## Contributing

Contributions follow the conventions in [`AGENTS.md`](./AGENTS.md) — read it
before touching code. The short version:

- **Layered backend:** `routes → controllers → services → prisma`. Controllers
  stay thin, services throw `ApiError`, central middleware shapes the response.
- **Riot layer:** pure HTTP in `back/src/riot/*.api.ts`; services orchestrate
  fetch → normalize → `upsert` to Postgres.
- **TypeScript split:** backend on TS7 (native Go port, ~10x faster); frontend
  on TS6 (`typescript-eslint` doesn't yet support TS7). See AGENTS.md §9.
- **Tests mock Riot:** `RIOT_API_KEY` is never set in CI; the Riot layer is
  mockable by design.

### Workflow

1. Branch from `main` (`feat/<name>`, `fix/<name>`, `docs/<name>`, `ci/<name>`).
2. Make conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:`).
3. Push and open a PR against `main`. CI runs typecheck + tests + build for
   both packages (backend uses a Postgres service container).
4. **Squash-merge** once CI passes — the squash commit message is the PR title,
   keeping history conventional.
5. Never commit `.env` or `src/generated/prisma/` (both gitignored).

CI: `.github/workflows/ci.yml` runs on every push to `main` and on every PR.