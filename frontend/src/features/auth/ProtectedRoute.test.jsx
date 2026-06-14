import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";

vi.mock("./AuthProvider", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

describe("ProtectedRoute", () => {
  it("redirects logged-out users to login", () => {
    render(
      <MemoryRouter initialEntries={["/rated"]}>
        <Routes>
          <Route path="/rated" element={<ProtectedRoute><div>Rated</div></ProtectedRoute>} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});
