import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

/**
 * RoleGuard — проверяет, что у текущего пользователя роль из списка `allow`.
 * Используется как layout-route: <Route element={<RoleGuard allow={['ceo']} />}>...</Route>
 */
export default function RoleGuard({ allow = [], redirectTo = '/' }) {
  const { user } = useAuth();
  const role = user?.role;

  if (!role || !allow.includes(role)) {
    // Если роль не в списке — редирект на дашборд (там DashboardRedirect разберётся)
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
