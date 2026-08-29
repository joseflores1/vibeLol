import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRoutes } from "../routes";

// Unknown routes render the NotFound view instead of silently redirecting.
describe("NotFoundPage route", () => {
  it("renders the 404 view for unknown paths", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/definitely/not/a/page"]}>
          <AppRoutes />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText("This page doesn't exist.")).toBeDefined();
    expect(screen.getByText("404")).toBeDefined();
    // The search bar stays visible as the way forward (Nav + page both have one).
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: /Back to home/ })).toBeDefined();
  });
});
