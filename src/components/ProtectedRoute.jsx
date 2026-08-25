import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  if (loading) return <div className="p-8 text-gray-400">Cargando…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="p-8 text-gray-400">Cargando…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
