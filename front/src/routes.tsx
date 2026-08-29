import { Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/Home";
import { SummonerProfilePage } from "./pages/SummonerProfile";
import { MatchDetailPage } from "./pages/MatchDetail";
import { ChampionsPage } from "./pages/Champions";
import { ChampionDetailPage } from "./pages/ChampionDetail";
import { NotFoundPage } from "./pages/NotFound";

// AppRoutes — the inner component that renders <Routes>. Exported so
// tests can wrap it in <MemoryRouter> without nesting routers.
//
// Routes (all user-facing — Riot IDs only, never puuids; AGENTS.md §5a):
//   /                                          → HomePage (search landing)
//   /summoners/:g/:t                           → SummonerProfilePage
//   /summoners/:g/:t/matches/:matchId          → MatchDetailPage (diptych)
//   /champions                                 → ChampionsPage (analytics table)
//   /champions/:championId                     → ChampionDetailPage (drilldown)
//   *                                          → NotFoundPage
//
// The region rides along as ?region= on summoner/match routes; analytics
// pages take ?queue=, and profiles accept ?champion= for filtered history.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/summoners/:gameName/:tagLine" element={<SummonerProfilePage />} />
      <Route path="/summoners/:gameName/:tagLine/matches/:matchId" element={<MatchDetailPage />} />
      <Route path="/champions" element={<ChampionsPage />} />
      <Route path="/champions/:championId" element={<ChampionDetailPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
