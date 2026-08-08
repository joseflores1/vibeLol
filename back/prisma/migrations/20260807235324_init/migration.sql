-- CreateTable
CREATE TABLE "accounts" (
    "puuid" TEXT NOT NULL,
    "game_name" TEXT NOT NULL,
    "tag_line" TEXT NOT NULL,
    "region" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("puuid")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_game_name_tag_line_key" ON "accounts"("game_name", "tag_line");
