import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../shared/api/client";
import { CasualPage } from "./CasualPage";

vi.mock("../../shared/api/client", () => ({ apiRequest: vi.fn() }));

const almostSolved = [
  [0, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

function renderCasual() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><CasualPage /></QueryClientProvider>);
}

describe("CasualPage", () => {
  it("starts a puzzle and applies a local hint", async () => {
    apiRequest.mockResolvedValue({ id: "puzzle", puzzle_board: almostSolved, difficulty: "Easy", puzzle_rating: 700, given_count: 80 });
    renderCasual();
    await userEvent.click(screen.getByRole("button", { name: "Start game" }));
    await userEvent.click(await screen.findByRole("button", { name: "Hint" }));
    expect(screen.getByLabelText("Row 1, column 1, value 5")).toBeInTheDocument();
  });
});
