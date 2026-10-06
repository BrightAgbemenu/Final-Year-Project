import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FullPageLoader } from '@/components/ui/Spinner';

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader label="Loading your account…" />;

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { session, loading } = useAuth();

  if (loading) return <FullPageLoader label="Loading…" />;

  if (session) return <Navigate to="/" replace />;

  return <Outlet />;
}
