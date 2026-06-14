import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../shared/api/client";
import { RatedPage } from "./RatedPage";

vi.mock("../auth/AuthProvider", () => ({ useAuth: () => ({ token: "token" }) }));
vi.mock("../../shared/api/client", () => ({ apiRequest: vi.fn() }));

const emptyBoard = Array.from({ length: 9 }, () => Array(9).fill(0));
const game = {
  game_id: "11111111-1111-1111-1111-111111111111",
  puzzle_id: "22222222-2222-2222-2222-222222222222",
  mode: "rated",
  status: "in_progress",
  puzzle_board: emptyBoard,
  current_board: emptyBoard,
  difficulty: "Easy",
  puzzle_rating: 900,
  rating_before: 1000,
  rating_after: null,
  rating_change: null,
  formula_version: null,
  rating_eligible: true,
  rating_ineligibility_reason: null,
  hints_used: 0,
  mistakes_made: 0,
  time_spent: 0,
  started_at: new Date(Date.now() - 1000).toISOString(),
  last_activity_at: new Date().toISOString(),
  completed_at: null,
};

function renderRated() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><RatedPage /></QueryClientProvider>);
}

describe("RatedPage", () => {
  beforeEach(() => {
    apiRequest.mockImplementation((path) => {
      if (path === "/rated/active") return Promise.resolve(game);
      if (path.endsWith("/move")) return Promise.resolve({ ...game, accepted: true, correct: false, mistakes_made: 1 });
      if (path.endsWith("/abandon")) return Promise.resolve({ ...game, status: "abandoned", rating_after: 984, rating_change: -16 });
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });
  });

  it("prompts for active games and reports incorrect moves", async () => {
    renderRated();
    expect(await screen.findByText("Active game found")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Continue game" }));
    fireEvent.click(screen.getByLabelText("Row 1, column 1"));
    await userEvent.click(screen.getByRole("button", { name: "5" }));
    expect(await screen.findByText("Incorrect move. A mistake was recorded.")).toBeInTheDocument();
  });
});
