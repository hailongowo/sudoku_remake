import { useQuery } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { apiRequest } from "../../shared/api/client";
import { Alert } from "../../shared/ui/Alert";
import { Loading } from "../../shared/ui/Loading";
import { useAuth } from "../auth/AuthProvider";


export function AdminProtectedRoute({ children }) {
  const { user, token, loading } = useAuth();
  const location = useLocation();
  const admin = useQuery({
    queryKey: ["admin", "me"],
    queryFn: ({ signal }) => apiRequest("/admin/me", { token, signal }),
    enabled: Boolean(user && token),
    retry: false,
  });

  if (loading) return <Loading label="Restoring session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin.isLoading) return <Loading label="Checking admin access" />;
  if (admin.isError) {
    if (admin.error.status === 403) {
      return (
        <main className="page py-8">
          <Alert tone="error">Admin access required.</Alert>
        </main>
      );
    }
    return (
      <main className="page py-8">
        <Alert tone="error">{admin.error.message}</Alert>
      </main>
    );
  }

  return children;
}
