import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

/**
 * FeatureGuard — тот же приём, что RoleGuard, но по org_feature_flags
 * (Karis, 13.08.2026): Main Admin не включил фичу партнёру → прямая ссылка
 * на /shop и т.п. тоже не должна открываться, не только пропасть из sidebar.
 * Используется как layout-route: <Route element={<FeatureGuard feature="shop" />}>...</Route>
 */
export default function FeatureGuard({ feature, redirectTo = '/' }) {
  const { user } = useAuth();

  if (!user?.orgFeatures?.[feature]) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
