import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AdminDashboard } from "../features/admin/AdminDashboard";
import { AdminProtectedRoute } from "../features/admin/AdminProtectedRoute";
import { AdminUsersPage } from "../features/admin/AdminUsersPage";
import { AuthProvider } from "../features/auth/AuthProvider";
import { LoginPage } from "../features/auth/LoginPage";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import { CasualPage } from "../features/casual/CasualPage";
import { GuidePage } from "../features/guide/GuidePage";
import { HomePage } from "../features/home/HomePage";
import { LeaderboardPage } from "../features/leaderboard/LeaderboardPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { RatedPage } from "../features/rated/RatedPage";
import { NotFoundPage } from "../features/static/NotFoundPage";
import { Layout } from "./Layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/play" element={<CasualPage />} />
              <Route path="/rated" element={<ProtectedRoute><RatedPage /></ProtectedRoute>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
              <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsersPage /></AdminProtectedRoute>} />
              <Route path="/guide" element={<GuidePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
