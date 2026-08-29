import { Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "./pages/Home";
import { SummonerProfilePage } from "./pages/SummonerProfile";
import { MatchDetailPage } from "./pages/MatchDetail";
import { ChampionsPage } from "./pages/Champions";
import { ChampionDetailPage } from "./pages/ChampionDetail";

// AppRoutes — the inner component that renders <Routes>. Exported so
// tests can wrap it in <MemoryRouter> without nesting routers.
//
// Routes (all user-facing — Riot IDs only, never puuids; AGENTS.md §5a):
//   /                                          → HomePage (search landing)
//   /summoners/:g/:t                           → SummonerProfilePage
//   /summoners/:g/:t/matches/:matchId          → MatchDetailPage (diptych)
//   /champions                                 → ChampionsPage (analytics table)
//   /champions/:championId                     → ChampionDetailPage (drilldown)
//   *                                          → redirect home
//
// The region rides along as ?region= on summoner/match routes; analytics
// pages take ?queue= instead (analytics are region-agnostic by design).
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/summoners/:gameName/:tagLine" element={<SummonerProfilePage />} />
      <Route path="/summoners/:gameName/:tagLine/matches/:matchId" element={<MatchDetailPage />} />
      <Route path="/champions" element={<ChampionsPage />} />
      <Route path="/champions/:championId" element={<ChampionDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
