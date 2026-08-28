import { Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "./pages/Home";
import { SummonerProfilePage } from "./pages/SummonerProfile";
import { MatchDetailPage } from "./pages/MatchDetail";

// AppRoutes — the inner component that renders <Routes>. Exported so
// tests can wrap it in <MemoryRouter> without nesting routers.
//
// Routes (all user-facing — Riot IDs only, never puuids; AGENTS.md §5a):
//   /                                          → HomePage (search landing)
//   /summoners/:g/:t                           → SummonerProfilePage
//   /summoners/:g/:t/matches/:matchId          → MatchDetailPage (diptych)
//   *                                          → redirect home
//
// The region rides along as ?region= on every route.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/summoners/:gameName/:tagLine" element={<SummonerProfilePage />} />
      <Route path="/summoners/:gameName/:tagLine/matches/:matchId" element={<MatchDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
