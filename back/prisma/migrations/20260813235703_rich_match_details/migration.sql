-- AlterTable
ALTER TABLE "match_participants" ADD COLUMN     "baron_kills" INTEGER,
ADD COLUMN     "champ_level" INTEGER,
ADD COLUMN     "damage_dealt_to_objectives" INTEGER,
ADD COLUMN     "damage_self_mitigated" INTEGER,
ADD COLUMN     "double_kills" INTEGER,
ADD COLUMN     "dragon_kills" INTEGER,
ADD COLUMN     "first_blood_kill" BOOLEAN,
ADD COLUMN     "gold_spent" INTEGER,
ADD COLUMN     "individual_position" TEXT,
ADD COLUMN     "inhibitor_kills" INTEGER,
ADD COLUMN     "largest_killing_spree" INTEGER,
ADD COLUMN     "largest_multi_kill" INTEGER,
ADD COLUMN     "neutral_minions_killed" INTEGER,
ADD COLUMN     "penta_kills" INTEGER,
ADD COLUMN     "perks" JSONB,
ADD COLUMN     "profile_icon" INTEGER,
ADD COLUMN     "quadra_kills" INTEGER,
ADD COLUMN     "riot_id_game_name" TEXT,
ADD COLUMN     "riot_id_tagline" TEXT,
ADD COLUMN     "team_position" TEXT,
ADD COLUMN     "total_damage_dealt_to_champions" INTEGER,
ADD COLUMN     "total_damage_taken" INTEGER,
ADD COLUMN     "total_heal" INTEGER,
ADD COLUMN     "total_time_ccing_others" INTEGER,
ADD COLUMN     "tower_kills" INTEGER,
ADD COLUMN     "triple_kills" INTEGER;

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "is_custom" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "matches_queue_id_idx" ON "matches"("queue_id");

-- CreateIndex
CREATE INDEX "matches_game_creation_idx" ON "matches"("game_creation");

-- CreateIndex
CREATE INDEX "matches_game_version_idx" ON "matches"("game_version");
