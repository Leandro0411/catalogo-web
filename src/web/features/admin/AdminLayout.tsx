import { Navigate, Outlet, useNavigate } from 'react-router';
import { useSession } from './hooks/useSession';
import { AdminContext } from './admin-context';
import { brandStyle } from '../../shared/theme';
import { Spinner } from '../../shared/components/Spinner';
import { logout } from '../../api/admin.api';

export function AdminLayout() {
  const session = useSession();
  const navigate = useNavigate();

  if (session.status === 'loading') {
    return <Spinner />;
  }

  if (session.status === 'anonymous') {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = (): void => {
    logout()
      .catch(() => {})
      .finally(() => navigate('/admin/login'));
  };

  return (
    <div style={brandStyle(session.me.tenant.primaryColor)}>
      <header className="bg-brand text-brand-contrast flex items-center justify-between p-4">
        <h1 className="text-lg font-bold">{session.me.tenant.name}</h1>
        <button type="button" onClick={handleLogout} className="underline">
          Salir
        </button>
      </header>
      <AdminContext.Provider value={{ me: session.me, refresh: session.refresh }}>
        <Outlet />
      </AdminContext.Provider>
    </div>
  );
}
