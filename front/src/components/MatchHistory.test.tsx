import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { MatchHistory } from "./MatchHistory";
import type { Champion, MatchDetail } from "../types/api";

// Mock apiGet so useMatchIds + the per-detail queryFn resolve deterministically.
vi.mock("../lib/api", () => ({
  apiGet: vi.fn(async (path: string) => {
    if (path.endsWith("/matches")) {
      return {
        puuid: "abc123",
        matchIds: ["NA1_1", "NA1_2"],
      };
    }
    // /matches/:matchId
    const matchId = path.split("/").pop() ?? "";
    return {
      matchId,
      dataVersion: "2",
      gameCreation: "2025-08-01T00:00:00.000Z",
      gameDuration: 600,
      gameStartTimestamp: "2025-08-01T00:00:00.000Z",
      gameEndTimestamp: "2025-08-01T00:10:00.000Z",
      gameMode: "CLASSIC",
      gameType: "MATCHED_GAME",
      gameVersion: "15.8.1",
      mapId: 11,
      queueId: 420,
      isCustom: false,
      teams: [],
      participants: [
        {
          id: `p-${matchId}`,
          matchId,
          puuid: "abc123",
          championId: 89,
          championName: "MonkeyKing",
          riotIdGameName: "Faker",
          riotIdTagline: "420",
          profileIcon: 1,
          individualPosition: "MIDDLE",
          teamPosition: "MIDDLE",
          kills: 3,
          deaths: 1,
          assists: 2,
          goldEarned: 7000,
          goldSpent: 6000,
          item0: 3071,
          item1: 3047,
          item2: 3074,
          item3: null,
          item4: null,
          item5: null,
          item6: 3364,
          summoner1Id: 4,
          summoner2Id: 14,
          teamId: 100,
          win: true,
          visionScore: 5,
          wardsPlaced: 3,
          wardsKilled: 0,
          totalMinionsKilled: 80,
          neutralMinionsKilled: 5,
          champLevel: 10,
          totalDamageDealtToChampions: 10000,
          totalDamageTaken: 5000,
          damageDealtToObjectives: 1000,
          damageSelfMitigated: 3000,
          totalHeal: 500,
          totalTimeCCingOthers: 20,
          doubleKills: 0,
          tripleKills: 0,
          quadraKills: 0,
          pentaKills: 0,
          largestKillingSpree: 3,
          largestMultiKill: 1,
          towerKills: 1,
          inhibitorKills: 0,
          baronKills: 0,
          dragonKills: 0,
          firstBloodKill: false,
          perks: {
            styles: [],
            statPerks: { defense: 5001, flex: 5008, offense: 5005 },
          },
        },
      ],
    } satisfies MatchDetail;
  }),
}));

import { apiGet } from "../lib/api";

const championMap = new Map<number, Champion>([
  [89, { key: 89, id: "MonkeyKing", name: "Wukong", title: "the Monkey King", tags: [] }],
]);

function withProviders(node: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("<MatchHistory />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders two MatchCards once the matchIds + queries resolve", async () => {
    withProviders(
      <MatchHistory
        gameName="Faker"
        tagLine="420"
        region="na1"
        puuid="abc123"
        version="15.8.1"
        championMap={championMap}
        spellMap={new Map()}
        runeMap={new Map()}
        itemMap={new Map()}
        activeTab="all"
        onTabChange={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Victory").length).toBe(2);
    });
    expect(screen.getAllByText("3/1/2").length).toBe(2);
    expect(apiGet).toHaveBeenCalledWith(expect.stringContaining("/matches"), expect.anything());
  });

  it("renders an EmptyState when the matchIds list is empty", async () => {
    vi.mocked(apiGet).mockResolvedValueOnce({ puuid: "abc123", matchIds: [] });
    withProviders(
      <MatchHistory
        gameName="Nobody"
        tagLine="000"
        region="na1"
        puuid="abc123"
        version="15.8.1"
        championMap={championMap}
        spellMap={new Map()}
        runeMap={new Map()}
        itemMap={new Map()}
        activeTab="all"
        onTabChange={() => {}}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("No matches found.")).toBeDefined();
    });
  });

  it("renders an ErrorState when the matchIds call rejects", async () => {
    vi.mocked(apiGet).mockRejectedValueOnce({
      success: false,
      message: "Riot API timeout",
      status: 504,
    });
    withProviders(
      <MatchHistory
        gameName="Error"
        tagLine="000"
        region="na1"
        puuid="abc123"
        version="15.8.1"
        championMap={championMap}
        spellMap={new Map()}
        runeMap={new Map()}
        itemMap={new Map()}
        activeTab="all"
        onTabChange={() => {}}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("Couldn't load match history")).toBeDefined();
    });
  });

  it("hides Load more when fewer IDs than the page size come back", async () => {
    withProviders(
      <MatchHistory
        gameName="Faker"
        tagLine="420"
        region="na1"
        puuid="abc123"
        version="15.8.1"
        championMap={championMap}
        spellMap={new Map()}
        runeMap={new Map()}
        itemMap={new Map()}
        activeTab="all"
        onTabChange={() => {}}
      />,
    );
    // Fixture returns 2 IDs against a page size of 10 → end of history.
    await waitFor(() => {
      expect(screen.getAllByText("Victory").length).toBe(2);
    });
    expect(screen.queryByRole("button", { name: /Load more/ })).toBeNull();
  });

  it("loads another page when Load more is clicked", async () => {
    const user = userEvent.setup();
    // Full page of 10 IDs → Load more visible.
    vi.mocked(apiGet).mockImplementationOnce(async (path: string) => {
      if (path.endsWith("/matches")) {
        return { puuid: "abc123", matchIds: Array.from({ length: 10 }, (_, i) => `NA1_${i}`) };
      }
      const matchId = path.split("/").pop() ?? "";
      return fixtureDetail(matchId);
    });

    withProviders(
      <MatchHistory
        gameName="Faker"
        tagLine="420"
        region="na1"
        puuid="abc123"
        version="15.8.1"
        championMap={championMap}
        spellMap={new Map()}
        runeMap={new Map()}
        itemMap={new Map()}
        activeTab="all"
        onTabChange={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Load more/ })).toBeDefined();
    });
    await user.click(screen.getByRole("button", { name: /Load more/ }));

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith(
        expect.stringContaining("/matches"),
        expect.objectContaining({ count: 20 }),
      );
    });
  });

  it("renders the champion-filter note and passes the filter through", async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();
    withProviders(
      <MatchHistory
        gameName="Faker"
        tagLine="420"
        region="na1"
        puuid="abc123"
        version="15.8.1"
        championMap={championMap}
        spellMap={new Map()}
        runeMap={new Map()}
        itemMap={new Map()}
        activeTab="all"
        onTabChange={() => {}}
        champion={157}
        championName="Ahri"
        onClearChampion={onClear}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Matches on/)).toBeDefined();
    });
    expect(apiGet).toHaveBeenCalledWith(
      expect.stringContaining("/matches"),
      expect.objectContaining({ champion: 157 }),
    );

    await user.click(screen.getByRole("button", { name: "Clear filter" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

// Same detail fixture the apiGet mock builds inline — extracted for the
// load-more test's mockImplementationOnce.
function fixtureDetail(matchId: string): MatchDetail {
  return {
    matchId,
    dataVersion: "2",
    gameCreation: "2025-08-01T00:00:00.000Z",
    gameDuration: 600,
    gameStartTimestamp: "2025-08-01T00:00:00.000Z",
    gameEndTimestamp: "2025-08-01T00:10:00.000Z",
    gameMode: "CLASSIC",
    gameType: "MATCHED_GAME",
    gameVersion: "15.8.1",
    mapId: 11,
    queueId: 420,
    isCustom: false,
    teams: [],
    participants: [
      {
        id: `p-${matchId}`,
        matchId,
        puuid: "abc123",
        championId: 89,
        championName: "MonkeyKing",
        riotIdGameName: "Faker",
        riotIdTagline: "420",
        profileIcon: 1,
        individualPosition: "MIDDLE",
        teamPosition: "MIDDLE",
        kills: 3,
        deaths: 1,
        assists: 2,
        goldEarned: 7000,
        goldSpent: 6000,
        item0: 3071,
        item1: 3047,
        item2: 3074,
        item3: null,
        item4: null,
        item5: null,
        item6: 3364,
        summoner1Id: 4,
        summoner2Id: 14,
        teamId: 100,
        win: true,
        visionScore: 5,
        wardsPlaced: 3,
        wardsKilled: 0,
        totalMinionsKilled: 80,
        neutralMinionsKilled: 5,
        champLevel: 10,
        totalDamageDealtToChampions: 10000,
        totalDamageTaken: 5000,
        damageDealtToObjectives: 1000,
        damageSelfMitigated: 3000,
        totalHeal: 500,
        totalTimeCCingOthers: 20,
        doubleKills: 0,
        tripleKills: 0,
        quadraKills: 0,
        pentaKills: 0,
        largestKillingSpree: 3,
        largestMultiKill: 1,
        towerKills: 1,
        inhibitorKills: 0,
        baronKills: 0,
        dragonKills: 0,
        firstBloodKill: false,
        perks: {
          styles: [],
          statPerks: { defense: 5001, flex: 5008, offense: 5005 },
        },
      },
    ],
  } satisfies MatchDetail;
}
