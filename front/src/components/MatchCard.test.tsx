import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchCard } from "./MatchCard";
import type { MatchDetail, Champion } from "../types/api";

const baseMatch: MatchDetail = {
  matchId: "NA1_5000000000",
  dataVersion: "2",
  gameCreation: "2025-08-01T00:00:00.000Z",
  gameDuration: 1834,
  gameStartTimestamp: "2025-08-01T00:00:00.000Z",
  gameEndTimestamp: "2025-08-01T00:30:34.000Z",
  gameMode: "CLASSIC",
  gameType: "MATCHED_GAME",
  gameVersion: "15.8.1",
  mapId: 11,
  queueId: 420,
  isCustom: false,
  teams: [],
  participants: [
    {
      id: "p1",
      matchId: "NA1_5000000000",
      puuid: "abc123",
      championId: 89,
      championName: "MonkeyKing",
      riotIdGameName: "Faker",
      riotIdTagline: "KR1",
      profileIcon: 1,
      individualPosition: "MIDDLE",
      teamPosition: "MIDDLE",
      kills: 12,
      deaths: 4,
      assists: 7,
      goldEarned: 13400,
      goldSpent: 12000,
      item0: 3071,
      item1: 3047,
      item2: 3074,
      item3: 3031,
      item4: 6337,
      item5: 3340,
      item6: 3364,
      summoner1Id: 4,
      summoner2Id: 14,
      teamId: 100,
      win: true,
      visionScore: 17,
      wardsPlaced: 8,
      wardsKilled: 2,
      totalMinionsKilled: 215,
      neutralMinionsKilled: 12,
      champLevel: 18,
      totalDamageDealtToChampions: 30000,
      totalDamageTaken: 18000,
      damageDealtToObjectives: 5000,
      damageSelfMitigated: 10000,
      totalHeal: 2000,
      totalTimeCCingOthers: 100,
      doubleKills: 2,
      tripleKills: 0,
      quadraKills: 0,
      pentaKills: 0,
      largestKillingSpree: 5,
      largestMultiKill: 2,
      towerKills: 2,
      inhibitorKills: 1,
      baronKills: 0,
      dragonKills: 1,
      firstBloodKill: false,
      perks: {
        styles: [],
        statPerks: { defense: 5001, flex: 5008, offense: 5005 },
      },
    },
  ],
};

const championMap = new Map<number, Champion>([
  [89, { key: 89, id: "MonkeyKing", name: "Wukong", title: "the Monkey King", tags: [] }],
]);

describe("<MatchCard />", () => {
  it("renders Victory for a winning participant with blue stripe class", () => {
    render(
      <MatchCard match={baseMatch} puuid="abc123" version="15.8.1" championMap={championMap} />,
    );
    expect(screen.getByText("Victory")).toBeDefined();
    expect(screen.getByText("12/4/7")).toBeDefined();
    expect(screen.getByText("4.75 KDA")).toBeDefined();
    expect(screen.getByText("Wukong")).toBeDefined();
    expect(screen.getByText((_, node) =>
      node?.textContent === "13.4k gold"
    )).toBeDefined();
    expect(screen.getByText((_, node) =>
      node?.textContent === "215 CS"
    )).toBeDefined();
    expect(screen.getByText("CLASSIC")).toBeDefined();
    const card = document.querySelector(".match-card");
    expect(card?.classList.contains("win")).toBe(true);
  });

  it("renders Defeat and red stripe for a losing participant", () => {
    const losingMatch: MatchDetail = {
      ...baseMatch,
      participants: [
        { ...baseMatch.participants[0]!, win: false, teamId: 200, deaths: 9, kills: 1, assists: 2 },
      ],
    };
    render(
      <MatchCard match={losingMatch} puuid="abc123" version="15.8.1" championMap={championMap} />,
    );
    expect(screen.getByText("Defeat")).toBeDefined();
    const card = document.querySelector(".match-card");
    expect(card?.classList.contains("loss")).toBe(true);
  });

  it("renders Perfect KDA when deaths is 0", () => {
    const perfectMatch: MatchDetail = {
      ...baseMatch,
      participants: [
        { ...baseMatch.participants[0]!, kills: 8, deaths: 0, assists: 5 },
      ],
    };
    render(
      <MatchCard match={perfectMatch} puuid="abc123" version="15.8.1" championMap={championMap} />,
    );
    expect(screen.getByText("Perfect KDA")).toBeDefined();
  });

  it("renders a missing-participant row when puuid not found among participants", () => {
    render(
      <MatchCard match={baseMatch} puuid="unknown" version="15.8.1" championMap={championMap} />,
    );
    expect(screen.getByText(/your stats unavailable/i)).toBeDefined();
    const missing = document.querySelector(".match-card.missing");
    expect(missing != null).toBe(true);
  });
});
