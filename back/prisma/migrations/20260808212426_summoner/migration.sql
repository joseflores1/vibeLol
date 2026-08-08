-- CreateTable
CREATE TABLE "summoners" (
    "puuid" TEXT NOT NULL,
    "summoner_id" TEXT,
    "name" TEXT,
    "summoner_level" INTEGER NOT NULL,
    "profile_icon_id" INTEGER NOT NULL,
    "revision_date" TIMESTAMP(3) NOT NULL,
    "region" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "summoners_pkey" PRIMARY KEY ("puuid")
);

-- AddForeignKey
ALTER TABLE "summoners" ADD CONSTRAINT "summoners_puuid_fkey" FOREIGN KEY ("puuid") REFERENCES "accounts"("puuid") ON DELETE CASCADE ON UPDATE CASCADE;
