import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "./routes";

// Smoke test: ensures the routing tree mounts and the HomePage landing
// renders the "vibeLol" hero heading. Verifies the routing + QueryClient
// wiring doesn't crash on first render.
describe("<AppRoutes/>", () => {
  it("renders the vibeLol hero heading on the home route", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByText("vibeLol")).toBeDefined();
  });
});