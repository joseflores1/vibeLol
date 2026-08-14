# AGENTS.md — vibeLol

Shared instructions for AI coding agents (opencode + GLM-5.2, and any other)
working anywhere in this repository. Read this before touching code.

## 1. Project overview

**vibeLol** is a League of Legends statistics platform in the style of
[op.gg](https://op.gg/), [lolalytics](https://lolalytics.com/), and
[u.gg](https://u.gg/). It aggregates summoner profiles, match history,
ranked stats, champion mastery, and champion win-rate analytics, powered by
the [Riot Games API](https://developer.riotgames.com/).

The project is a monorepo:

| Path    | Stack                                                        | Purpose                                  |
|---------|--------------------------------------------------------------|------------------------------------------|
| `back/` | Node 24 LTS, Express 5, Prisma 7, PostgreSQL 16, TypeScript 7    | REST API, Riot API integration, caching  |
| `front/` | React 19, TypeScript 6, Vite 8, ESLint 10                  | Web UI for stats browsing                |

The database runs in Docker (`docker-compose.yml` → Postgres 16). The Riot
Games API is never called directly from the frontend; the backend fetches,
normalizes, caches in Postgres, and exposes a clean REST surface.

> **Attribution (required by Riot's ToS):** vibeLol isn't endorsed by Riot
> Games and doesn't reflect the views or opinions of Riot Games or anyone
> officially involved in producing or managing Riot Games properties. All
> data shown is provided by Riot Games. Keep this disclaimer visible in the
> frontend (e.g. footer / About page).

## 2. Tech stack & versions

### Backend (`back/`)
- **Runtime:** Node.js 24 LTS+
- **Language:** TypeScript 7.0.x (native Go port, ~10x faster). `tsconfig.json`
  uses `module: nodenext`, `moduleResolution: nodenext`, `strict`,
  `verbatimModuleSyntax`, `noUncheckedIndexedAccess`, `target: ES2022`.
- **Framework:** Express 5.2
- **ORM:** Prisma 7.9 (`@prisma/client`, `@prisma/adapter-pg`, `pg`) with
  PostgreSQL via `@prisma/adapter-pg`.
- **Validation:** Zod 4
- **Config:** `dotenv` + `back/src/config/env.ts` (fail-fast `requireEnv`)

### Frontend (`front/`)
- **Language:** TypeScript 6.0.x (intentionally **not** 7 — `typescript-eslint`
  does not yet support TS7; see section 9).
- **Framework:** React 19, Vite 8
- **Lint:** ESLint 10 (flat config `front/eslint.config.js`),
  `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

### ESM import rule (critical)
Both packages use NodeNext/bundler ESM. **In `.ts` files, import with `.js`
specifiers** (e.g. `import { prisma } from './lib/client.js';`). This is the
existing convention — follow it. `verbatimModuleSyntax` is on, so use
`import type` for type-only imports.

## 3. Directory layout

```
.
├── back/
│   ├── prisma/
│   │   ├── schema.prisma          # generator + datasource only
│   │   ├── models/*.prisma        # one file per model (multi-file schema)
│   │   └── migrations/            # prisma migrate history
│   ├── prisma.config.ts           # loads DATABASE_URL via dotenv
│   ├── src/
│   │   ├── index.ts               # Express app entry (cors, json, /api/health, /api/v1)
│   │   ├── config/env.ts          # env.ts — single source of truth for config
│   │   ├── routes/                 # express routers, mounted in routes/index.ts
│   │   ├── controllers/           # thin: validate → call service → shape response
│   │   ├── services/              # business logic + prisma access, throws ApiError
│   │   ├── validators/            # zod schemas (request body/params)
│   │   ├── middlewares/            # notFound, errorHandler (central error handling)
│   │   ├── utils/ApiError.ts      # typed HTTP errors with status codes
│   │   ├── lib/client.ts          # prisma client singleton
│   │   └── generated/prisma/      # Prisma Client output (DO NOT hand-edit; `prisma generate`)
│   └── tsconfig.json
├── front/
│   ├── src/                       # React app (App.tsx, main.tsx, index.css …)
│   ├── eslint.config.js           # flat ESLint config
│   ├── vite.config.ts
│   └── tsconfig.{,app,node}.json  # project-reference build setup
├── docker-compose.yml              # postgres:16-alpine service
├── README.md
└── AGENTS.md                       # this file
```

## 4. Backend conventions

### Layered architecture
`routes → controllers → services → prisma`. Each layer has one job:

- **routes** (`routes/*.routes.ts`): mount endpoints; mounted in
  `routes/index.ts` under `/api/v1`.
- **controllers** (`controllers/*.controller.ts`): validate input with zod,
  call the service, return `{ success: true, data }` (or `204` on delete).
  Hold **no** business logic.
- **services** (`services/*.service.ts`): business logic and database access.
  Throw `ApiError` (from `utils/ApiError.ts`) for expected failures (404, 409,
  422) so controllers stay thin and the central `errorHandler` middleware
  shapes the response.
- **validators** (`validators/*.validator.ts`): zod schemas; export both the
  schema and the inferred input types (`CreateXInput`, `UpdateXInput`).
- **middlewares**: `notFound` (404 for unmatched routes), `errorHandler`
  (catches `ApiError` and zod errors → JSON response with status).

Response shape is consistent: `{ success: boolean, data?: ..., error?: ... }`.
`POST` returns `201`, `DELETE` returns `204`.

### Example pattern (mirror this for new features)
```ts
// services/summoner.service.ts
export const summonerService = {
  async findByPuuid(puuid: string) {
    const summoner = await prisma.summoner.findUnique({ where: { puuid } });
    if (!summoner) throw ApiError.notFound(`Summoner ${puuid} not found`);
    return summoner;
  },
};
```

### Environment configuration
All config lives in `back/src/config/env.ts` via `requireEnv(key)`, which
throws at startup if a required var is missing. **Never read `process.env`
directly elsewhere.** To add a new config value, extend the `env` object in
`env.ts` and add a corresponding variable to `back/.env.example` and
`back/.env`.

## 5. Riot Games API guide (detailed)

Reference docs: <https://developer.riotgames.com/docs/lol> and
<https://developer.riotgames.com/apis>.

### Authentication
- Every request sends `X-Riot-Token: <RIOT_API_KEY>` as a header.
- The key MUST come from env (`RIOT_API_KEY`), wired through `env.ts` via
  `requireEnv('RIOT_API_KEY')`. **Never hardcode the key or commit `.env`.**

### Identifiers & security layer
Riot exposes several player identifiers, each with different stability and
privacy properties. Getting this right prevents subtle bugs when an API
key rotates.

| Field          | Stable across keys? | Use                                          |
|----------------|---------------------|----------------------------------------------|
| `puuid`        | Yes — universal     | Primary join key across all tables. Cache     |
|                | & cross-game         | indefinitely. The whole point of puuid.      |
| `matchId`      | Yes — Riot's public | Safe to cache + expose in URLs (e.g.         |
|                | handle, region-     | `NA1_5000000000`). Not derived from the      |
|                | prefixed             | calling key.                                 |
| `summonerId`   | No — per-key         | Persist as `String?` only for short-term      |
| (`id` in v4)   | encrypted; stale     | League v4 routing within one key lifetime.   |
|                | on key rotation      | Never key long-term logic on it. Before any  |
|                |                      | League v4 call, re-derive it from a fresh     |
|                |                      | Summoner v4 `/by-puuid` lookup.               |
| `accountId`    | No — per-key +       | Don't persist. Riot calls it legacy-          |
|                | legacy-deprecated    | deprecated. Validated in zod for safety,     |
|                |                      | dropped before storage.                       |

**Why this matters:** Riot's 2018 security layer
(<https://www.riotgames.com/en/DevRel/player-universally-unique-identifiers-and-a-new-security-layer>)
originally made **all** v4 IDs (puuid, summonerId, accountId) unique per API
key holder. That would have made any stored ID garbage on a key rotation.
Riot later promoted **only `puuid`** to be universal and keyholder-stable
(see current docs at
<https://developer.riotgames.com/docs/lol#summoner-names-to-riot-ids>);
`summonerId` and `accountId` remain per-key encrypted. This is why the
`Summoner` model keys on `puuid` (not `summonerId`) and why `accountId` is
not persisted anywhere.

### Puuids in public URLs — don't
Treat `puuid` as a **backend routing key only**, never a user-facing URL
segment. User-facing URLs use the **Riot ID** (`gameName#tagLine`):

- ✅ `/api/v1/summoners/by-riot-id/:gameName/:tagLine/matches?region=na1`
- ✅ `/api/v1/summoners/by-riot-id/:gameName/:tagLine/matches/:matchId?region=`
- ❌ `/api/v1/matches/by-puuid/:puuid/ids` (never — puuid is cross-game,
  leaking it in a public URL makes a user's LoL/Valorant/TFT histories
  trivially linkable)

Rationale: Riot's post-Nov-2023 migration explicitly instructs third-party
apps to display Riot IDs in user-facing fields. op.gg, lolalytics, and u.gg
all use Riot-ID-scoped URLs. `puuid` may appear in JSON response bodies
(for the frontend to identify "your row" in a participant list), never in a
URL path or query string.

### Privacy & game-integrity policy (Riot ToS alignment)
- **Hidden players:** if Riot returns 404 for a player, surface it as 404 —
  never invent data Riot refuses to confirm. The Riot client's
  `riotGet` → `ApiError.notFound` mapping already enforces this.
- **Custom-queue matches:** Riot requires opt-in (RSO, production key) to
  publicly display a player's custom-queue match history. Public
  match-history endpoints must filter `queueId` to exclude custom games
  until RSO lands (out of scope for Phase 2b; documented constraint).
- **No augment/arena win-rates** (Riot explicitly disallows).
- **No MMR/ELO calculators** (Riot explicitly disallows alternatives to
  the ranked ladder).
- **Attribution boilerplate** must be visible in the UI (already
  documented in section 1).

### Base URLs & routing
Riot splits APIs by **regional platform** (match/account-level) and
**region** (summoner/league-level):

| Type     | Value examples                         | Used by                         |
|----------|----------------------------------------|---------------------------------|
| Regional | `na1`, `euw1`, `kr`, `br1`, `eune1` …  | Summoner v4, League v4, Mastery |
| Platform | `americas`, `europe`, `asia`           | Account v1, Match v5            |

Base URL pattern: `https://{platform}.api.riotgames.com/lol/...`
(e.g. `https://americas.api.riotgames.com/lol/match/v5/matches/{matchId}`).

Start from a Riot ID (`gameName#tagLine`) → Account v1 (platform routing) to
get a `puuid`, then use the `puuid` across other endpoints.

### Key endpoints
- **Account v1** (platform): `/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}`
  → `puuid`, `gameName`, `tagLine`.
- **Summoner v4** (regional): `/lol/summoner/v4/summoners/by-puuid/{puuid}` →
  `id`, `name`, `summonerLevel`, `profileIconId`, `revisionDate`.
- **Match v5** (platform):
  - `/lol/match/v5/matches/by-puuid/{puuid}/ids?startTime=&endTime=&queue=&type=&start=&count=`
    (max `count=100`).
  - `/lol/match/v5/matches/{matchId}` → full timeline + participant stats.
  - `/lol/match/v5/matches/{matchId}/timeline` → per-minute frame data.
- **League v4** (regional): `/lol/league/v4/entries/by-summoner/{encryptedSummonerId}`.
- **Champion Mastery v4** (regional): `/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}`.

### Rate limits
- **Development key:** ~20 requests/100s and ~100 requests/2min.
- **Production key:** higher, per-app limits — confirm in the Riot portal.
- Riot returns `429` with a `Retry-After` header when exceeded. **Always
  honor `Retry-After`** and implement exponential backoff / a request queue
  in the Riot client layer. Do not burst.

### Static / reference data (Data Dragon)
Champion names, item names, rune trees, profile icons, and spell icons live
on Data Dragon, **not** the Riot API:

- Versions list: `https://ddragon.leagueoflegends.com/api/versions.json` (newest = stable).
- Champion data: `https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json`.
- Rune data: `https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/runesReforged.json`.
- Icons: `https://ddragon.leagueoflegends.com/cdn/{version}/img/{champion|item|profileicon}/{key}.png`.
- Rune icons: `https://ddragon.leagueoflegends.com/cdn/img/{icon-path}` (the path comes from rune data).

Cache the latest version string centrally (it bumps every 2 weeks); don't
fetch it per request. Map champion keys (`Q-89`, etc.) to IDs via the
champion data dump.

### Suggested Riot client layout (new)
Create a dedicated, thin Riot HTTP layer that the LoL services call, rather
than sprinkling `fetch` calls in services:

```
back/src/
├── riot/
│   ├── client.ts        # rate-limited fetch wrapper (X-Riot-Token, retry on 429)
│   ├── account.api.ts    # Account v1
│   ├── summoner.api.ts   # Summoner v4
│   ├── match.api.ts      # Match v5
│   ├── league.api.ts     # League v4
│   └── mastery.api.ts    # Champion Mastery v4
└── services/
    ├── summoner.service.ts   # calls riot/* + persists via prisma
    └── match.service.ts
```

Keep `riot/*.api.ts` as pure HTTP (no Prisma); services orchestrate
fetch → normalize → `upsert` to Postgres. This keeps Riot concerns separate
from persistence and makes the Riot layer easy to mock.

## 6. Prisma & data persistence

### Caching strategy
Riot API responses are persisted in Postgres via Prisma (idempotent `upsert`
keyed on Riot IDs like `puuid` / `matchId`). The backend always reads from
the DB cache first and only refreshes from Riot on miss / staleness. The
**frontend never calls Riot directly**.

Persist `puuid` and `matchId` freely (universal & keyholder-stable). Persist
`summonerId` as `String?` only for short-term League v4 routing — it's
per-key encrypted and goes stale if the dev key ever rotates (see §5a).
Never persist `accountId`.

### LoL-domain models (replace the legacy scaffolding)
The existing `users` / `profiles` / `tasks` models were sample scaffolding
and are considered **legacy** — design and migrate to LoL-domain entities.
Recommended starting set (adapt as needed):

- **Account** — `puuid` (PK), `gameName`, `tagLine`, `region`, `updatedAt`.
- **Summoner** — `summonerId`, `puuid` (FK→Account), `name`, `summonerLevel`,
  `profileIconId`, `revisionDate`.
- **Match** — `matchId` (PK), `queueId`, `mapId`, `duration`, `creation`,
  `region` (platform), `fetchVersion`.
- **MatchParticipant** — per-summoner per-match stats (championId, kills,
  deaths, assists, gold, items, wards, vision, runes, `win`).
- **ChampionMastery** — `puuid`+`championId` (composite key),
  `championLevel`, `championPoints`, `lastPlayTime`.
- **LeagueEntry** — `summonerId`+`queueType` (composite), `tier`, `rank`,
  `leaguePoints`, `wins`, `losses`.

Keep a `User` entity only if you need app accounts/auth (not required for a
pure stats viewer). Use `@map` for snake_case columns (see existing models).
All Riot IDs that come in as strings are fine as `String`.

### Multi-file schema
Models live in `back/prisma/models/*.prisma` (one model per file). The
generator config is in `back/prisma/schema.prisma`:

- `output = "../src/generated/prisma"` → the Prisma Client is imported from
  `src/generated/prisma` (re-exported via `src/lib/client.ts`). **Never
  hand-edit `src/generated/`.**
- `moduleFormat = esm`, `importFileExtension = js`, `generatedFileExtension = ts`.

### Workflow
```bash
cd back
npx prisma generate                # after any schema.prisma/models/*.prisma edit
npx prisma migrate dev --name <desc>   # create + apply a migration
npx prisma studio                  # visual DB explorer
```

`binaryTargets` includes `linux-musl-openssl-3.0.x` for the Docker Postgres
client; don't remove it.

## 7. Frontend conventions

- **Stack:** React 19 + TypeScript 6 + Vite 8. Components are functional,
  hooks-based. No class components.
- **Build:** `npm run build` runs `tsc -b` (project references:
  `tsconfig.app.json` + `tsconfig.node.json`) then `vite build`.
- **Lint:** `npm run lint` (flat ESLint config). Keep configs as
  `tseslint.configs.recommended`; do **not** switch to type-checked rules
  without coordinating with the TS version (see section 9).
- **Routing / data fetching:** fetch stats from our backend only
  (`http://localhost:3000/api/v1/...`), never from Riot directly. Configure
  the API base URL via env (`import.meta.env.VITE_API_URL`) with a sane dev
  default.
- **Disclaimers:** show the Riot Games attribution line (section 1) in the
  UI footer.

## 8. Common commands

| Task                          | Command (from repo root)                             |
|-------------------------------|------------------------------------------------------|
| Start DB                      | `docker compose up -d`                               |
| Backend dev server            | `cd back && npm run dev`                             |
| Frontend dev server           | `cd front && npm run dev`                             |
| Generate Prisma client        | `cd back && npx prisma generate`                     |
| Run/apply migrations          | `cd back && npx prisma migrate dev`                  |
| Prisma Studio                 | `cd back && npx prisma studio`                       |
| Backend typecheck (TS7)       | `cd back && npm run typecheck`                       |
| Backend tests                  | `cd back && npm test`                                |
| Frontend lint                 | `cd front && npm run lint`                           |
| Frontend tests                | `cd front && npm test`                               |
| Frontend build (tsc -b + vite)| `cd front && npm run build`                          |

> Note: the backend has **no** `lint` npm script (no ESLint configured yet).
> Typecheck with `npm run typecheck` (alias for `tsc --noEmit`). CI runs
> typecheck + tests + build for the backend, and lint + tests + build for
> the frontend (see `.github/workflows/ci.yml`).

## 9. TypeScript version policy (important)

This project deliberately runs **two TypeScript versions**:

- **Backend → TypeScript 7.0.x** (native Go port, ~10x faster builds).
  `back/tsconfig.json` explicitly sets `"types": ["node", "express", "cors"]`
  because TS7 defaults `types` to `[]` (no auto-loading of `@types/*`).
  Backend has no ESLint dependency on `typescript-eslint`, so TS7 is safe.
- **Frontend → TypeScript 6.0.x** (`~6.0.2`). **Do not bump the frontend
  to TS7 yet.** `typescript-eslint` (latest 8.x) declares
  `typescript: >=4.8.4 <6.1.0` — it does not support TS7, and TS7 ships with
  no programmatic API that `typescript-eslint` can consume. Wait for a
  `typescript-eslint` 9.x stable that supports TS7 before migrating
  the frontend.

When you add a new backend `@types/*` package, add its name to the `types`
array in `back/tsconfig.json` or those globals won't load under TS7.

## 10. Agent working rules

- **Read before write.** Understand existing patterns (controllers/services/
  validators, the `ApiError` + central middleware flow) and mimic them.
  Don't introduce a new style or a new library without checking the codebase
  first.
- **Library / API docs:** use the Context7 MCP to fetch current docs for
  Riot API specifics, Prisma, Express 5, React 19, Zod 4, etc. Don't rely on
  memory for API shapes.
- **Verify before finishing.** After backend changes run
  `cd back && npx tsc --noEmit` (and `npx prisma generate` if the schema
  changed). After frontend changes run `cd front && npm run lint && npm run build`.
  Don't claim done if these fail.
- **No comments** unless explicitly asked.
- **No new dependencies** without a clear need and without adding them to
  the right `package.json`. Re-check version compatibility (section 9).
- **Never commit** unless the user explicitly asks. Keep `RIOT_API_KEY` and
  `DATABASE_URL` out of code and git (`.env` is gitignored). When asked to
  commit, follow the branch + PR workflow in section 11.
- **Schema changes:** one model per file in `back/prisma/models/`, then
  `prisma generate` + `prisma migrate dev`. Don't hand-edit
  `src/generated/prisma`.
- **Riot keys:** only via `env.ts` (`requireEnv('RIOT_API_KEY')`); add to
  `back/.env.example`. Honor `Retry-After` on 429s. Show attribution in the UI.

## 11. Git workflow (commits, PRs, CI gate)

When the user explicitly asks you to commit and push, follow this flow —
**never** commit on the `main` branch directly (except for the very first
initial baseline commit, which only happens once).

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/<short-name>
   ```
2. Stage **only intended files** — never `.env`, never `src/generated/prisma/`
   (it's generated, not authored). Prefer `git add <paths>` over
   `git add .` so secrets never leak in.
3. Write a concise conventional commit message matching repo style
   (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:`). One scope per
   commit when practical.
4. Push the branch:
   ```bash
   git push -u origin feat/<short-name>
   ```
5. Open a PR targeting `main` with `gh`:
   ```bash
   gh pr create --base main --title "<message subject>" --body "<what changed + verification run>"
   ```
6. Report the PR URL back to the user.
7. **Never** `gh pr merge` unless the user explicitly says so — the CI gate
   and the merge decision stay the user's. If CI fails, fix on the branch
   (more commits) and push; the PR updates automatically.

CI (`.github/workflows/ci.yml`) runs on every push to `main` and on every
pull request to `main`: backend (typecheck + tests + build, postgres service
container) and frontend (lint + tests + build). Tests mock the Riot layer —
`RIOT_API_KEY` is intentionally **not** set in CI.

## 12. Frontend Design System

The vibeLol frontend follows "Option B — Match Card": a distinctive
warm-parchment off-black palette with gold reserved for numerals, mono-
space display type for big numbers, and tier-color stripes as the
signature visual anchor. This is NOT a generic neon LoL dashboard.

### Palette (from `front/src/styles/tokens.css`)

| Token            | Hex       | Usage                                    |
|------------------|-----------|------------------------------------------|
| `--surface-0`    | `#15110c` | Page background (warm off-black)         |
| `--surface-1`    | `#21190f` | Raised card                               |
| `--surface-2`    | `#2a1f12` | Hover / active                           |
| `--hairline`      | `#3a2f1c` | Border                                   |
| `--gold`         | `#c8aa6e` | KDA, LP, mastery numbers ONLY (no decoration) |
| `--blue-team`    | `#2095dd` | Win / blue-side                          |
| `--red-team`     | `#e84057` | Loss / red-side                           |
| `--text-display` | `#f0e6d2` | Parchment cream — headings               |
| `--text-body`    | `#c8b890` | Warm body                                 |
| `--text-muted`   | `#8a7d5a` | Captions / secondary                      |
| `--footer-bg`    | `#100c08` | High-contrast footer                      |

Tier colors: Iron `#5b5a55`, Bronze `#8c523a`, Silver `#80969a`, Gold
`#f0b234`, Platinum `#5d8af6`, Emerald `#2dbf65`, Diamond `#5d76cb`,
Master `#8467c7`, Grandmaster `#c93b3b`, Challenger `#5d8af6`.

### Typography

- **Display face:** JetBrains Mono — big numerals (level, LP, KDA,
  mastery points, winrate %). This is the signature element.
- **Body face:** Sora — prose, labels, navigation.
- Fluid `clamp()` type scale, step-1 through step-6.

### Icon URL templates

| Asset       | URL template                                                                   |
|-------------|--------------------------------------------------------------------------------|
| Profile     | `https://ddragon.leagueoflegends.com/cdn/{version}/img/profileicon/{id}.png`   |
| Champion    | `https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{id}.png`       |
|             | (`id` = alphabetic ID, e.g., `MonkeyKing` for Wukong, from /static/champions) |
| Item        | `https://ddragon.leagueoflegends.com/cdn/{version}/img/item/{id}.png`          |
| Spell       | `https://ddragon.leagueoflegends.com/cdn/{version}/img/spell/{key}.png`        |
| Rune        | `https://ddragon.leagueoflegends.com/cdn/img/{icon-path}`                       |
| Rank crest  | `https://raw.githubusercontent.com/communitydragon/communitydragon-assets/master/assets/images/rankedcrests/24.6.1/24.6.1_{tier-lowercase}.png` |

### Region display map

Riot's platform codes (na1, la1, la2) aren't user-friendly. Show both the
code and a display name in the dropdown and the profile region pill:

```
NA1 — North America     BR1 — Brazil          LA1 — Latin America North
LA2 — Latin America South  OC1 — Oceania       EUW1 — Europe West
EUN1 — Europe Nordic & East  TR1 — Türkiye       RU — Russia
KR — Korea              JP1 — Japan           PH2 — Philippines
SG2 — Singapore         TH2 — Thailand        TW2 — Taiwan
VN2 — Vietnam
```

Dropdown: `<option value="na1">NA1 — North America</option>`.
Profile chip: `NA1 · North America` (compact pill).

### Structural conventions (absorbed from reference sites)

From **u.gg** (triple-column shell + dense match cards):
- Persistent top nav shell (54px, search integrated).
- Profile page: sidebar 30% (ranked + mastery), main 70% (match history).
- Match cards: 96px height, 4px left-edge team-color stripe (blue/red).
- Segmented tab filter: All / Ranked Solo / Ranked Flex / Normal.

From **lolalytics** (information density):
- Monospace decimals aligning vertically in tables.
- Tight row padding for density.
- (Reserved: delta arrows for patch-over-patch comparisons — future phase.)

From **Stitch mock** (Image 1):
- High-contrast footer with distinct background + top border.
- 96px gold-bordered profile icon with 12px radius.
- Level pill overlaid on the icon's bottom-center.
- Community Dragon tier crest inset (80px) in ranked cards.
- 2×3 mastery card grid (not a flat list).

### Restraint principles

1. **Gold is for numerals only** — never decoration, never borders (except
   the profile icon), never backgrounds. KDA, LP, mastery points, level,
   winrate % → gold. Everything else → parchment or muted.
2. **No gradient blobs, glow filters, or drop shadows.**
3. **Empty states are invitations** — "No ranked games this season." with
   the search bar visible, not a sad-face emoji. Never "Oops."
4. **Errors never apologize** — state exactly what went wrong + HTTP status
   + a "Try again" button. Never vague "Something went wrong."
5. **Visible keyboard focus** — 2px gold outline on focus-visible.
6. **`prefers-reduced-motion` respected** — no decorative animation for
   users who disable it.
7. **Responsive down to 360px** — sidebar + main stack vertically, tables
   scroll, type scale holds.
8. **No puuids in URLs** — Riot IDs only (per §5a).
9. **Riot Games attribution in every footer** — required by ToS.
