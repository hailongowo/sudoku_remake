import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../shared/api/client";
import { ProfilePage } from "./ProfilePage";

vi.mock("../auth/AuthProvider", () => ({ useAuth: () => ({ token: "token" }) }));
vi.mock("../../shared/api/client", () => ({ apiRequest: vi.fn() }));

describe("ProfilePage", () => {
  it("edits the display name", async () => {
    apiRequest.mockImplementation((path, options = {}) => {
      if (path === "/players/me" && options.method === "PATCH") {
        return Promise.resolve({ id: "u", display_name: "New Name", rating: 1000, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" });
      }
      return Promise.resolve({
        id: "u",
        display_name: "Old Name",
        rating: 1000,
        rating_rank: 1,
        rated_games: 2,
        rated_wins: 1,
        rated_losses: 1,
        peak_rating: 1010,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      });
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><ProfilePage /></QueryClientProvider>);
    const input = await screen.findByLabelText("Display name");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    await userEvent.click(screen.getByRole("button", { name: "Save display name" }));
    expect(await screen.findByText("Display name updated.")).toBeInTheDocument();
  });
});
