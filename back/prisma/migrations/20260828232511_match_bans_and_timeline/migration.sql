-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "bans_fetched_at" TIMESTAMP(3),
ADD COLUMN     "timeline" JSONB;

-- CreateTable
CREATE TABLE "match_bans" (
    "match_id" TEXT NOT NULL,
    "team_id" INTEGER NOT NULL,
    "champion_id" INTEGER NOT NULL,
    "pick_turn" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "match_bans_pkey" PRIMARY KEY ("match_id","team_id","pick_turn")
);

-- CreateIndex
CREATE INDEX "match_bans_champion_id_idx" ON "match_bans"("champion_id");

-- AddForeignKey
ALTER TABLE "match_bans" ADD CONSTRAINT "match_bans_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("match_id") ON DELETE CASCADE ON UPDATE CASCADE;
