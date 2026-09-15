import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router';
import { useCatalog } from '../catalog/hooks/useCatalog';
import { TenantContext } from './tenant-context';
import { brandStyle } from '../../shared/theme';
import { Spinner } from '../../shared/components/Spinner';
import { NotFoundPage } from './NotFoundPage';

export function TenantLayout() {
  const { slug } = useParams<{ slug: string }>();
  const catalog = useCatalog(slug ?? '');

  useEffect(() => {
    if (catalog.status === 'ready') {
      document.title = catalog.data.tenant.name;
    }
  }, [catalog]);

  if (catalog.status === 'loading') {
    return <Spinner />;
  }

  if (catalog.status === 'not-found') {
    return <NotFoundPage />;
  }

  if (catalog.status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p>No pudimos cargar el catálogo</p>
        <button
          type="button"
          onClick={catalog.reload}
          className="rounded bg-gray-800 px-4 py-2 text-white"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={brandStyle(catalog.data.tenant.primaryColor)}>
      <header className="bg-brand text-brand-contrast p-4">
        <h1 className="text-lg font-bold">{catalog.data.tenant.name}</h1>
      </header>
      <TenantContext.Provider value={{ catalog: catalog.data, reload: catalog.reload }}>
        <Outlet />
      </TenantContext.Provider>
    </div>
  );
}
