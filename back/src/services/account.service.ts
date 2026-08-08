import { prisma } from '../lib/client.js';
import { ApiError } from '../utils/ApiError.js';
import { getByRiotId, type RiotAccount } from '../riot/account.api.js';
import type { RiotCluster } from '../riot/client.js';

// Business logic and database access for the Account entity.
// Orchestrates: Riot API fetch → normalize → idempotent upsert to Postgres.
// Throws ApiError for expected failures so controllers stay thin.
export const accountService = {
  // Resolves a Riot ID (gameName#tagLine) to a cached Account row.
  // Always refreshes from Riot so the cache stays fresh on demand; a
  // staleness/TTL strategy can be layered on later without changing the
  // call sites. Uses upsert keyed on puuid so a refetch never duplicates.
  async findByRiotId(
    cluster: RiotCluster,
    gameName: string,
    tagLine: string,
  ) {
    let riotAccount: RiotAccount;
    try {
      riotAccount = await getByRiotId(cluster, gameName, tagLine);
    } catch (err) {
      // 404s from Riot surface as ApiError.notFound — let them propagate.
      throw err;
    }

    const account = await prisma.account.upsert({
      where: { puuid: riotAccount.puuid },
      create: {
        puuid: riotAccount.puuid,
        gameName: riotAccount.gameName,
        tagLine: riotAccount.tagLine,
      },
      update: {
        // Refresh the Riot ID display fields in case the user renamed.
        gameName: riotAccount.gameName,
        tagLine: riotAccount.tagLine,
      },
    });

    if (!account) throw ApiError.conflict('Account upsert failed');
    return account;
  },
};