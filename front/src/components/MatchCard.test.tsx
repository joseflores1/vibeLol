import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchCard } from "./MatchCard";
import type { MatchDetail, Champion, Spell, Rune, Item } from "../types/api";

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

const spellMap = new Map<number, Spell>([
  [4, { key: 4, name: "Flash", id: "SummonerFlash" }],
  [14, { key: 14, name: "Ignite", id: "SummonerDot" }],
]);

const runeMap = new Map<number, Rune>([
  [8112, {
    id: 8112,
    key: "Electrocute",
    name: "Electrocute",
    shortDesc: "",
    longDesc: "",
    icon: "perk-images/styles/domination/electrocute/electrocute.png",
    styleId: 8100,
    styleKey: "Domination",
    styleName: "Domination",
  }],
]);

const itemMap = new Map<number, Item>([
  [3071, { id: 3071, name: "Black Cleaver", gold: 3000 }],
  [3047, { id: 3047, name: "Plated Steelcaps", gold: 1100 }],
]);

const emptyMaps = {
  spellMap: new Map<number, Spell>(),
  runeMap: new Map<number, Rune>(),
  itemMap: new Map<number, Item>(),
};

describe("<MatchCard />", () => {
  it("renders Victory for a winning participant with blue stripe class", () => {
    render(
      <MatchCard
        match={baseMatch}
        puuid="abc123"
        version="15.8.1"
        championMap={championMap}
        spellMap={spellMap}
        runeMap={runeMap}
        itemMap={itemMap}
      />,
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

  it("labels item slots with the item name (tooltip + alt)", () => {
    render(
      <MatchCard
        match={baseMatch}
        puuid="abc123"
        version="15.8.1"
        championMap={championMap}
        spellMap={spellMap}
        runeMap={runeMap}
        itemMap={itemMap}
      />,
    );
    expect(screen.getByAltText("Black Cleaver")).toHaveProperty("title", "Black Cleaver");
    expect(screen.getByAltText("Plated Steelcaps")).toBeDefined();
    // Unmapped items fall back to a generic label instead of disappearing.
    expect(screen.getByAltText("Item 3074")).toBeDefined();
  });

  it("renders the searched player's summoner spells", () => {
    render(
      <MatchCard
        match={baseMatch}
        puuid="abc123"
        version="15.8.1"
        championMap={championMap}
        spellMap={spellMap}
        runeMap={runeMap}
        itemMap={itemMap}
      />,
    );
    expect(screen.getByAltText("Flash")).toBeDefined();
    expect(screen.getByAltText("Ignite")).toBeDefined();
  });

  it("renders the keystone rune when the participant has one", () => {
    const matchWithPerks: MatchDetail = {
      ...baseMatch,
      participants: [
        {
          ...baseMatch.participants[0]!,
          perks: {
            styles: [
              {
                description: "primaryStyle",
                style: 8100,
                selections: [{ perk: 8112, var1: 1, var2: 0, var3: 0 }],
              },
            ],
            statPerks: { defense: 5001, flex: 5008, offense: 5005 },
          },
        },
      ],
    };
    render(
      <MatchCard
        match={matchWithPerks}
        puuid="abc123"
        version="15.8.1"
        championMap={championMap}
        spellMap={spellMap}
        runeMap={runeMap}
        itemMap={itemMap}
      />,
    );
    expect(screen.getByAltText("Electrocute")).toBeDefined();
  });

  it("renders Defeat and red stripe for a losing participant", () => {
    const losingMatch: MatchDetail = {
      ...baseMatch,
      participants: [
        { ...baseMatch.participants[0]!, win: false, teamId: 200, deaths: 9, kills: 1, assists: 2 },
      ],
    };
    render(
      <MatchCard
        match={losingMatch}
        puuid="abc123"
        version="15.8.1"
        championMap={championMap}
        spellMap={spellMap}
        runeMap={runeMap}
        itemMap={itemMap}
      />,
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
      <MatchCard
        match={perfectMatch}
        puuid="abc123"
        version="15.8.1"
        championMap={championMap}
        spellMap={spellMap}
        runeMap={runeMap}
        itemMap={itemMap}
      />,
    );
    expect(screen.getByText("Perfect KDA")).toBeDefined();
  });

  it("renders a missing-participant row when puuid not found among participants", () => {
    render(
      <MatchCard
        match={baseMatch}
        puuid="unknown"
        version="15.8.1"
        championMap={championMap}
        {...emptyMaps}
      />,
    );
    expect(screen.getByText(/your stats unavailable/i)).toBeDefined();
    const missing = document.querySelector(".match-card.missing");
    expect(missing != null).toBe(true);
  });
});
