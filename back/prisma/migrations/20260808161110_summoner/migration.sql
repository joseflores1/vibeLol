-- CreateTable
CREATE TABLE "summoners" (
    "summoner_id" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "name" TEXT,
    "summoner_level" INTEGER NOT NULL,
    "profile_icon_id" INTEGER NOT NULL,
    "revision_date" TIMESTAMP(3) NOT NULL,
    "region" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "summoners_pkey" PRIMARY KEY ("summoner_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "summoners_puuid_key" ON "summoners"("puuid");

-- AddForeignKey
ALTER TABLE "summoners" ADD CONSTRAINT "summoners_puuid_fkey" FOREIGN KEY ("puuid") REFERENCES "accounts"("puuid") ON DELETE CASCADE ON UPDATE CASCADE;
