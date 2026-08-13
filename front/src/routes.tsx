import { Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "./pages/Home";
import { SummonerProfilePage } from "./pages/SummonerProfile";

// AppRoutes — the inner component that renders <Routes>. Exported so
// tests can wrap it in <MemoryRouter> without nesting routers.
//
// Phase 3a routes:
//   /                       → HomePage (search landing)
//   /summoners/:g/:t        → SummonerProfilePage
//   *                       → redirect home
//
// Phase 3b will add /summoners/:g/:t/matches and /summoners/:g/:t/matches/:id.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/summoners/:gameName/:tagLine" element={<SummonerProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}