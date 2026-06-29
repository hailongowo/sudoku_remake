import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest } from "../../shared/api/client";
import { AdminProtectedRoute } from "./AdminProtectedRoute";

let authState;

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => authState,
}));
vi.mock("../../shared/api/client", async () => {
  const actual = await vi.importActual("../../shared/api/client");
  return { ...actual, apiRequest: vi.fn() };
});

function renderRoute() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminProtectedRoute><div>Admin content</div></AdminProtectedRoute>} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AdminProtectedRoute", () => {
  beforeEach(() => {
    authState = { user: { id: "u" }, token: "token", loading: false };
  });

  it("redirects logged-out users", () => {
    authState = { user: null, token: null, loading: false };
    renderRoute();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("shows forbidden state for non-admins", async () => {
    apiRequest.mockRejectedValue(new ApiError("Admin access required", 403));
    renderRoute();
    expect(await screen.findByText("Admin access required.")).toBeInTheDocument();
  });

  it("renders admin content for admins", async () => {
    apiRequest.mockResolvedValue({ id: "u", display_name: "Admin" });
    renderRoute();
    expect(await screen.findByText("Admin content")).toBeInTheDocument();
  });
});
