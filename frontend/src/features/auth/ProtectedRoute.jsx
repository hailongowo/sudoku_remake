import { Navigate, useLocation } from "react-router-dom";
import { Loading } from "../../shared/ui/Loading";
import { useAuth } from "./AuthProvider";

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading label="Restoring session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
