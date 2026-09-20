import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useParams } from 'react-router';
import { useCatalog } from '../catalog/hooks/useCatalog';
import { TenantContext } from './tenant-context';
import { brandStyle, setThemeColor } from '../../shared/theme';
import { CatalogSkeleton } from '../../shared/components/CatalogSkeleton';
import { ChevronLeftIcon } from '../../shared/components/Icons';
import { NotFoundPage } from './NotFoundPage';
import { AgeGate } from '../catalog/components/AgeGate';
import { CartButton } from '../cart/components/CartButton';
import { safeGet, safeSet } from '../../shared/storage';
import { ageOkKey } from '../../shared/storage-keys';

export function TenantLayout() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const catalog = useCatalog(slug ?? '');
  const [, forceRerender] = useState(0);

  const tenant = catalog.status === 'ready' ? catalog.data.tenant : null;

  useEffect(() => {
    if (tenant) {
      document.title = tenant.name;
      setThemeColor(tenant.primaryColor);
    }
  }, [tenant]);

  if (catalog.status === 'loading') {
    return <CatalogSkeleton />;
  }

  if (catalog.status === 'not-found') {
    return <NotFoundPage />;
  }

  if (catalog.status === 'error' || !tenant) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-base font-semibold">No pudimos cargar el catálogo</p>
        <p className="text-sm text-gray-500">Revisá tu conexión e intentá de nuevo.</p>
        <button
          type="button"
          onClick={catalog.reload}
          className="mt-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const ageAccepted = slug ? safeGet(ageOkKey(slug)) === '1' : false;

  if (tenant.ageGate && !ageAccepted) {
    return (
      <AgeGate
        primaryColor={tenant.primaryColor}
        tenantName={tenant.name}
        logoUrl={tenant.logoUrl}
        onAccept={() => {
          safeSet(ageOkKey(slug ?? ''), '1');
          forceRerender((tick) => tick + 1);
        }}
      />
    );
  }

  const catalogPath = `/${slug ?? ''}`;
  const isCatalogRoot = location.pathname.replace(/\/+$/, '') === catalogPath;

  return (
    <div style={brandStyle(tenant.primaryColor)} className="min-h-dvh bg-white">
      <header className="bg-brand text-brand-contrast pt-safe sticky top-0 z-40 shadow-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-3">
          {isCatalogRoot ? null : (
            <Link
              to={catalogPath}
              aria-label="Volver"
              className="-ml-1 grid h-11 w-11 shrink-0 place-items-center rounded-full transition active:scale-95 active:bg-black/10"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </Link>
          )}
          <Link to={catalogPath} className="flex min-w-0 items-center gap-2.5 px-1">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-white/25"
              />
            ) : null}
            <h1 className="truncate text-base font-semibold tracking-tight">{tenant.name}</h1>
          </Link>
          <div className="ml-auto shrink-0">
            <CartButton slug={slug ?? ''} />
          </div>
        </div>
      </header>
      <TenantContext.Provider value={{ catalog: catalog.data, reload: catalog.reload }}>
        <Outlet />
      </TenantContext.Provider>
    </div>
  );
}
