import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SearchBar } from "./SearchBar";

// Mock the API layer — the suggest query fires (debounced) once the game
// name reaches 2+ characters, so every test needs the provider + mock.
vi.mock("../lib/api", () => ({
  apiGet: vi.fn(async (path: string) => {
    if (path.startsWith("/search/suggest")) {
      return {
        suggestions: [
          { gameName: "Faker", tagLine: "KR1", profileIconId: 1 },
          { gameName: "Fakerette", tagLine: "EUW", profileIconId: null },
        ],
      };
    }
    return {};
  }),
}));

import { apiGet } from "../lib/api";

// SearchBar now owns data hooks — every render needs a QueryClient.
function renderWithProviders(node: React.ReactNode, initialPath = "/") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderWithRouter(initialPath = "/") {
  return renderWithProviders(<SearchBar />, initialPath);
}

describe("<SearchBar />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a game-name input, tag-line input, region select, and search button", () => {
    renderWithRouter();
    expect(screen.getByLabelText("Game name")).toBeDefined();
    expect(screen.getByLabelText("Tag line")).toBeDefined();
    expect(screen.getByLabelText("Region")).toBeDefined();
    expect(screen.getByRole("button", { name: "Search" })).toBeDefined();
  });

  it("disables Search when inputs are empty", () => {
    renderWithRouter();
    expect(screen.getByRole("button", { name: "Search" })).toHaveProperty("disabled", true);
  });

  it("enables Search when both game name and tag line are filled", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.type(screen.getByLabelText("Game name"), "Faker");
    await user.type(screen.getByLabelText("Tag line"), "420");

    expect(screen.getByRole("button", { name: "Search" })).toHaveProperty("disabled", false);
  });

  it("does not fetch suggestions below 2 characters", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.type(screen.getByLabelText("Game name"), "F");

    // Outlast the 250ms debounce window, then confirm no suggest call.
    // (The /static/version prefetch is expected; suggestions are not.)
    await new Promise((resolve) => setTimeout(resolve, 350));
    const suggestCalls = vi.mocked(apiGet).mock.calls.filter(([path]) =>
      String(path).startsWith("/search/suggest"),
    );
    expect(suggestCalls).toHaveLength(0);
  });

  it("renders suggestions with tag lines once the debounced query resolves", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.type(screen.getByLabelText("Game name"), "Fak");

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Faker#KR1/i })).toBeDefined();
    });
    expect(screen.getByRole("option", { name: /Fakerette#EUW/i })).toBeDefined();
    expect(apiGet).toHaveBeenCalledWith(
      expect.stringContaining("/search/suggest?q=Fak"),
    );
  });

  it("navigates directly when a suggestion is picked with the keyboard", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<SearchBar />} />
            <Route path="/summoners/:gameName/:tagLine" element={<div data-testid="probe" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText("Game name"), "Fak");
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Faker#KR1/i })).toBeDefined();
    });

    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(screen.getByTestId("probe")).toBeDefined();
  });

  it("marks the combobox expanded state for assistive tech", async () => {
    const user = userEvent.setup();
    renderWithRouter();
    const input = screen.getByLabelText("Game name") as HTMLInputElement;

    expect(input.getAttribute("role")).toBe("combobox");
    await user.type(input, "Fak");

    await waitFor(() => {
      expect(input.getAttribute("aria-expanded")).toBe("true");
    });
  });

  it("navigates to the summoner profile route on submit", async () => {
    const user = userEvent.setup();
    // Mount SearchBar next to a probe route that reports the matched path
    // params — lets us assert the navigation target without mocking history.
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<SearchBar />} />
            <Route
              path="/summoners/:gameName/:tagLine"
              element={<div data-testid="probe" />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText("Game name"), "Faker");
    await user.type(screen.getByLabelText("Tag line"), "420");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByTestId("probe")).toBeDefined();
  });

  it("defaults to na1 region", () => {
    renderWithRouter();
    const regionSelect = screen.getByLabelText("Region") as HTMLSelectElement;
    expect(regionSelect.value).toBe("na1");
  });

  it("lets user change region", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.selectOptions(screen.getByLabelText("Region"), "euw1");
    expect((screen.getByLabelText("Region") as HTMLSelectElement).value).toBe("euw1");
  });
});
