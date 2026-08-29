import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChampionDetailPage } from "./ChampionDetail";

vi.mock("../lib/api", () => ({
  apiGet: vi.fn(async (path: string) => {
    if (path.startsWith("/static/champions")) {
      return {
        version: "16.15.1",
        champions: [
          { key: 266, id: "Aatrox", name: "Aatrox", title: "the Darkin Blade", tags: [] },
          { key: 157, id: "Ahri", name: "Ahri", title: "the Nine-Tailed Fox", tags: [] },
        ],
      };
    }
    if (path.startsWith("/static/items")) {
      return { version: "16.15.1", items: [{ id: 3071, name: "Black Cleaver", gold: 3000 }] };
    }
    if (path.startsWith("/static/runes")) {
      return {
        version: "16.15.1",
        runes: [{
          id: 8112, key: "Electrocute", name: "Electrocute", shortDesc: "", longDesc: "",
          icon: "perk-images/styles/domination/electrocute/electrocute.png",
          styleId: 8100, styleKey: "Domination", styleName: "Domination",
        }],
      };
    }
    if (path.startsWith("/static/spells")) {
      return { version: "16.15.1", spells: [{ key: 4, name: "Flash", id: "SummonerFlash" }] };
    }
    if (/^\/analytics\/champions\/266$/.test(path)) {
      return {
        championId: 266,
        queueId: null,
        patch: null,
        games: 80,
        wins: 44,
        bans: 6,
        winRate: 0.55,
        banRate: 0.075,
        avgKills: 5.5,
        avgDeaths: 4,
        avgAssists: 6,
        avgGoldEarned: 12000,
        avgCs: 220,
        avgDamageDealtToChampions: 20000,
        avgDamageTaken: 15000,
        avgVisionScore: 15,
        avgChampLevel: 17,
        positions: [
          { position: "TOP", games: 70, wins: 40, winRate: 0.5714 },
          { position: "MIDDLE", games: 10, wins: 4, winRate: 0.4 },
        ],
        items: [{ id: 3071, games: 60, pickRate: 0.75 }],
        keystones: [],
        spells: [],
        matchups: [
          { opponentChampionId: 157, games: 20, wins: 13, winRate: 0.65 },
        ],
      };
    }
    // Champion 999 → no cached games.
    return {
      championId: 999, queueId: null, patch: null, games: 0, wins: 0, bans: 0,
      winRate: 0, banRate: 0, avgKills: 0, avgDeaths: 0, avgAssists: 0,
      avgGoldEarned: 0, avgCs: 0, avgDamageDealtToChampions: 0, avgDamageTaken: 0,
      avgVisionScore: 0, avgChampLevel: 0, positions: [], items: [],
      keystones: [], spells: [], matchups: [],
    };
  }),
}));

import { apiGet } from "../lib/api";

function renderDetail(championId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/champions/${championId}`]}>
        <Routes>
          <Route path="/champions/:championId" element={<ChampionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("<ChampionDetailPage />", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the header, stat band, and matchups for a champion with data", async () => {
    renderDetail("266");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Aatrox" })).toBeDefined();
    });
    expect(screen.getByText("55.0%")).toBeDefined(); // win rate
    expect(screen.getByText("7.5%")).toBeDefined(); // ban rate
    expect(screen.getByText("TOP")).toBeDefined();
    const matchupLink = screen.getByRole("link", { name: /Ahri/ });
    expect(matchupLink.getAttribute("href")).toBe("/champions/157");
    expect(screen.getByAltText("Black Cleaver")).toBeDefined();
  });

  it("renders the empty state for a champion with no cached games", async () => {
    renderDetail("999");

    await waitFor(() => {
      expect(screen.getByText("No games for this champion yet.")).toBeDefined();
    });
  });

  it("refetches with the selected queue when a tab is clicked", async () => {
    const user = userEvent.setup();
    renderDetail("266");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Aatrox" })).toBeDefined();
    });
    await user.click(screen.getByRole("button", { name: "Ranked Solo" }));

    await waitFor(() => {
      expect(vi.mocked(apiGet)).toHaveBeenCalledWith(
        "/analytics/champions/266",
        expect.objectContaining({ queue: 420 }),
      );
    });
  });
});
