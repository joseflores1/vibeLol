# vibeLol

League of Legends statistics platform (op.gg / lolalytics / u.gg style), powered
by the [Riot Games API](https://developer.riotgames.com/).

> vibeLol isn't endorsed by Riot Games and doesn't reflect the views or
> opinions of Riot Games or anyone officially involved in producing or
> managing Riot Games properties. All data shown is provided by Riot Games.

## Prerequisites

- [Node.js 24+](https://nodejs.org)
- [Docker](https://docs.docker.com/get-docker/)
- A [Riot Games API key](https://developer.riotgames.com/) (for the backend)

## First time setup

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

## Running the project

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

## Database

```bash
# Apply migrations after pulling changes that update the schema
cd back && npx prisma migrate dev

# Visual database explorer
cd back && npx prisma studio
```
## Stopping the project

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
