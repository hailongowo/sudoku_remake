import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../shared/api/client";
import { LeaderboardPage } from "./LeaderboardPage";

vi.mock("../../shared/api/client", () => ({ apiRequest: vi.fn() }));

describe("LeaderboardPage", () => {
  it("renders leaderboard rows", async () => {
    apiRequest.mockResolvedValue([{ rank: 1, display_name: "Player One", rating: 1200, rated_games: 4, rated_wins: 3 }]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><LeaderboardPage /></QueryClientProvider>);
    expect(await screen.findByText("Player One")).toBeInTheDocument();
    expect(screen.getByText("1200")).toBeInTheDocument();
  });
});
