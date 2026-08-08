-- CreateTable
CREATE TABLE "match_participants" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "champion_id" INTEGER NOT NULL,
    "champion_name" TEXT NOT NULL,
    "kills" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "gold_earned" INTEGER NOT NULL,
    "item0" INTEGER,
    "item1" INTEGER,
    "item2" INTEGER,
    "item3" INTEGER,
    "item4" INTEGER,
    "item5" INTEGER,
    "item6" INTEGER,
    "summoner1_id" INTEGER NOT NULL,
    "summoner2_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "win" BOOLEAN NOT NULL,
    "vision_score" INTEGER,
    "wards_placed" INTEGER,
    "wards_killed" INTEGER,
    "total_minions_killed" INTEGER,

    CONSTRAINT "match_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "match_id" TEXT NOT NULL,
    "data_version" TEXT,
    "game_creation" TIMESTAMP(3) NOT NULL,
    "game_duration" INTEGER NOT NULL,
    "game_start_timestamp" TIMESTAMP(3) NOT NULL,
    "game_end_timestamp" TIMESTAMP(3),
    "game_mode" TEXT NOT NULL,
    "game_type" TEXT NOT NULL,
    "game_version" TEXT,
    "map_id" INTEGER,
    "queue_id" INTEGER,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("match_id")
);

-- CreateIndex
CREATE INDEX "match_participants_puuid_idx" ON "match_participants"("puuid");

-- CreateIndex
CREATE INDEX "match_participants_champion_id_idx" ON "match_participants"("champion_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_participants_match_id_puuid_key" ON "match_participants"("match_id", "puuid");

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("match_id") ON DELETE CASCADE ON UPDATE CASCADE;
