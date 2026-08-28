import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRoutes } from "./routes";

// Smoke test: ensures the routing tree mounts and the HomePage landing
// renders the "vibeLol" hero heading. The SearchBar now runs TanStack
// Query hooks, so a QueryClientProvider is part of the minimal tree.
describe("<AppRoutes/>", () => {
  it("renders the vibeLol hero heading on the home route", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>
          <AppRoutes />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText("vibeLol")).toBeDefined();
  });
});
