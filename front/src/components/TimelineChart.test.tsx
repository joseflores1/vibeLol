import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TimelineChart, TimelineSection } from "./TimelineChart";
import type { MatchDetail, TimelineResponse, Champion } from "../types/api";

vi.mock("../lib/api", () => ({
  apiGet: vi.fn(async () => fixtureTimeline),
}));

import { apiGet } from "../lib/api";

const fixtureTimeline: TimelineResponse = {
  matchId: "NA1_1",
  puuids: ["p1", "p2"],
  frames: [
    {
      timestamp: 0,
      participantFrames: {
        "1": { participantId: 1, totalGold: 500, minionsKilled: 0 },
        "2": { participantId: 2, totalGold: 500, minionsKilled: 0 },
      },
    },
    {
      timestamp: 60_000,
      participantFrames: {
        "1": { participantId: 1, totalGold: 1200, minionsKilled: 6 },
        "2": { participantId: 2, totalGold: 900, minionsKilled: 4 },
      },
    },
    {
      timestamp: 120_000,
      participantFrames: {
        "1": { participantId: 1, totalGold: 2100, minionsKilled: 14 },
        "2": { participantId: 2, totalGold: 1500, minionsKilled: 9 },
      },
    },
  ],
};

const fixtureMatch: MatchDetail = {
  matchId: "NA1_1",
  dataVersion: "2",
  gameCreation: "2025-08-01T00:00:00.000Z",
  gameDuration: 180,
  gameStartTimestamp: "2025-08-01T00:00:00.000Z",
  gameEndTimestamp: null,
  gameMode: "CLASSIC",
  gameType: "MATCHED_GAME",
  gameVersion: "15.8.1",
  mapId: 11,
  queueId: 420,
  isCustom: false,
  teams: [],
  participants: [
    {
      puuid: "p1",
      championId: 89,
      championName: "MonkeyKing",
      teamId: 100,
      win: true,
      riotIdGameName: "Faker",
      riotIdTagline: "KR1",
    },
    {
      puuid: "p2",
      championId: 157,
      championName: "Ahri",
      teamId: 200,
      win: false,
      riotIdGameName: "Opponent",
      riotIdTagline: "EUW",
    },
  ] as MatchDetail["participants"],
};

const championMap = new Map<number, Champion>([
  [89, { key: 89, id: "MonkeyKing", name: "Wukong", title: "", tags: [] }],
  [157, { key: 157, id: "Ahri", name: "Ahri", title: "", tags: [] }],
]);

describe("<TimelineChart />", () => {
  it("renders one polyline per participant with team/you classes", () => {
    render(
      <TimelineChart
        timeline={fixtureTimeline}
        match={fixtureMatch}
        version="15.8.1"
        championMap={championMap}
        youPuuid="p1"
      />,
    );

    const lines = document.querySelectorAll("svg .tl-line");
    expect(lines).toHaveLength(2);
    // The searched player's line takes the gold "you" class (overriding the
    // team color); the opponent gets their team color.
    expect(document.querySelector("svg .tl-line.you")).not.toBeNull();
    expect(document.querySelector("svg .tl-line.red")).not.toBeNull();
  });

  it("labels the legend with Riot IDs and re-renders on metric switch", async () => {
    const user = userEvent.setup();
    render(
      <TimelineChart
        timeline={fixtureTimeline}
        match={fixtureMatch}
        version="15.8.1"
        championMap={championMap}
        youPuuid="p1"
      />,
    );

    expect(screen.getByText("Faker")).toBeDefined();
    const svgBefore = document.querySelector("svg")!.getAttribute("aria-label");
    expect(svgBefore).toContain("Gold");

    await user.click(screen.getByRole("button", { name: "CS" }));
    expect(document.querySelector("svg")!.getAttribute("aria-label")).toContain("CS");
  });
});

describe("<TimelineSection />", () => {
  beforeEach(() => vi.clearAllMocks());

  function renderSection() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <TimelineSection
          matchId="NA1_1"
          region="na1"
          match={fixtureMatch}
          version="15.8.1"
          championMap={championMap}
          youPuuid="p1"
        />
      </QueryClientProvider>,
    );
  }

  it("does not fetch the timeline until expanded", () => {
    renderSection();
    expect(apiGet).not.toHaveBeenCalled();
  });

  it("fetches and renders the chart once expanded", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: /Show match flow/ }));

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith(
        "/matches/NA1_1/timeline",
        expect.objectContaining({ region: "na1" }),
      );
    });
    await waitFor(() => {
      expect(document.querySelector("svg .tl-line")).not.toBeNull();
    });
  });
});
