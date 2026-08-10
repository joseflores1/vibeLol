-- CreateTable
CREATE TABLE "champion_masteries" (
    "puuid" TEXT NOT NULL,
    "champion_id" INTEGER NOT NULL,
    "champion_level" INTEGER NOT NULL,
    "champion_points" INTEGER NOT NULL,
    "last_play_time" TIMESTAMP(3) NOT NULL,
    "champion_points_since_last_level" INTEGER,
    "champion_points_until_next_level" INTEGER,
    "mark_required_for_next_level" INTEGER,
    "tokens_earned" INTEGER,
    "champion_season_milestone" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "champion_masteries_pkey" PRIMARY KEY ("puuid","champion_id")
);

-- CreateTable
CREATE TABLE "league_entries" (
    "puuid" TEXT NOT NULL,
    "queue_type" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "league_points" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "veteran" BOOLEAN NOT NULL DEFAULT false,
    "inactive" BOOLEAN NOT NULL DEFAULT false,
    "fresh_blood" BOOLEAN NOT NULL DEFAULT false,
    "hot_streak" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_entries_pkey" PRIMARY KEY ("puuid","queue_type")
);

-- CreateIndex
CREATE INDEX "champion_masteries_puuid_idx" ON "champion_masteries"("puuid");

-- CreateIndex
CREATE INDEX "champion_masteries_champion_id_idx" ON "champion_masteries"("champion_id");

-- CreateIndex
CREATE INDEX "league_entries_puuid_idx" ON "league_entries"("puuid");
