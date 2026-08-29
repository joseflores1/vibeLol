import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChampionsPage } from "./Champions";

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
    if (path.startsWith("/analytics/champions")) {
      return {
        queueId: path.includes("queue=420") ? 420 : null,
        patch: null,
        totalGames: 120,
        totalChampions: 2,
        start: 0,
        count: 100,
        champions: [
          {
            championId: 266,
            games: 80,
            wins: 44,
            bans: 6,
            winRate: 0.55,
            pickRate: 0.6667,
            banRate: 0.05,
            avgKills: 5.5,
            avgDeaths: 4,
            avgAssists: 6,
            avgGoldEarned: 12000,
          },
          {
            championId: 157,
            games: 40,
            wins: 30,
            bans: 2,
            winRate: 0.75,
            pickRate: 0.3333,
            banRate: 0.0167,
            avgKills: 6,
            avgDeaths: 3,
            avgAssists: 5,
            avgGoldEarned: 13000,
          },
        ],
      };
    }
    return {};
  }),
}));

import { apiGet } from "../lib/api";

function renderPage(initialPath = "/champions") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <ChampionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("<ChampionsPage />", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders champion rows with formatted rates", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Aatrox/ })).toBeDefined();
    });
    expect(screen.getByText("55.0%")).toBeDefined();
    expect(screen.getByText("80")).toBeDefined();
    // Champion 157 is under the 50-game threshold.
    expect(screen.getByText("low sample")).toBeDefined();
  });

  it("links each row to the champion drilldown with the active queue", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Aatrox/ })).toBeDefined();
    });
    expect(screen.getByRole("link", { name: /Aatrox/ }).getAttribute("href")).toBe("/champions/266");

    await user.click(screen.getByRole("button", { name: "Ranked Solo" }));
    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith(
        "/analytics/champions",
        expect.objectContaining({ queue: 420, count: 100 }),
      );
    });
    expect(screen.getByRole("link", { name: /Aatrox/ }).getAttribute("href")).toBe("/champions/266?queue=420");
  });

  it("sorts by the clicked column header", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Aatrox/ })).toBeDefined();
    });

    // Default sort: games desc → Aatrox (80) first.
    const firstRowChampion = () =>
      document.querySelector("tbody tr .champion-name")?.textContent;
    expect(firstRowChampion()).toBe("Aatrox");

    // Win rate desc → Ahri (75%) first.
    await user.click(screen.getByRole("button", { name: /Win rate/ }));
    expect(firstRowChampion()).toBe("Ahri");

    // Same column again → ascending → Aatrox (55%) first.
    await user.click(screen.getByRole("button", { name: /Win rate/ }));
    expect(firstRowChampion()).toBe("Aatrox");
  });
});
