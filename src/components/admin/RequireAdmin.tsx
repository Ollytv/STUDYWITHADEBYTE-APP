// src/components/admin/RequireAdmin.tsx
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { ROUTES } from '../../routes';
import SplashScreen from '../../pages/SplashScreen';

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAdminAuth();

  if (loading) return <SplashScreen />;
  if (!isAdmin) return <Navigate to={ROUTES.adminLogin} replace />;

  return <>{children}</>;
}
