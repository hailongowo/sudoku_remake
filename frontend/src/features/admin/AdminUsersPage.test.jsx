import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../shared/api/client";
import { AdminUsersPage } from "./AdminUsersPage";

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ token: "token" }),
}));
vi.mock("../../shared/api/client", () => ({ apiRequest: vi.fn() }));

const user = {
  id: "11111111-1111-1111-1111-111111111111",
  display_name: "Player One",
  rating: 1000,
  rating_rank: 1,
  rated_games: 3,
  rated_wins: 2,
  rated_losses: 1,
  peak_rating: 1020,
  suspended_at: null,
  suspended_by: null,
  suspension_reason: null,
  created_at: "2026-06-07T00:00:00Z",
  updated_at: "2026-06-07T00:00:00Z",
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><AdminUsersPage /></QueryClientProvider>);
}

describe("AdminUsersPage", () => {
  beforeEach(() => {
    apiRequest.mockImplementation((path, options = {}) => {
      if (path.startsWith("/admin/users") && options.method === "PATCH") return Promise.resolve({ ...user, display_name: "New Name" });
      if (path.endsWith("/suspend")) return Promise.resolve({ ...user, suspended_at: "2026-06-07T00:00:00Z", suspension_reason: "Testing" });
      if (path.endsWith("/reactivate")) return Promise.resolve(user);
      return Promise.resolve([user]);
    });
  });

  it("renders users and sends search queries", async () => {
    renderPage();
    expect(await screen.findByText("Player One")).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("Search display name or user ID"), "Player");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining("search=Player"), expect.objectContaining({ token: "token" }));
  });

  it("edits display names", async () => {
    renderPage();
    expect(await screen.findByText("Player One")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    const input = screen.getByLabelText("Display name");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Display name updated.")).toBeInTheDocument();
  });

  it("suspends and reactivates users", async () => {
    renderPage();
    expect(await screen.findByText("Player One")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Suspend" }));
    await userEvent.type(screen.getByLabelText("Reason"), "Testing");
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Suspend" }));
    expect(await screen.findByText("User suspended from rated play.")).toBeInTheDocument();
  });
});
