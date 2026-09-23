import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAdminProducts } from '../hooks/useAdminProducts';
import { ProductListItem } from '../components/ProductListItem';
import { SaleDialog } from '../components/SaleDialog';
import { Switch } from '../components/Switch';
import { Spinner } from '../../../shared/components/Spinner';
import { EmptyState } from '../../../shared/components/EmptyState';
import type { AdminProduct } from '../../../../shared/types/api.types';

const DIACRITICS_PATTERN = /[̀-ͯ]/g;

function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(DIACRITICS_PATTERN, '').toLowerCase();
}

export function ProductsPage() {
  const { state, toggleStatus, registerSale, remove } = useAdminProducts();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [showSold, setShowSold] = useState(false);
  const [saleTarget, setSaleTarget] = useState<AdminProduct | null>(null);
  const successMessage = (location.state as { message?: string } | null)?.message;

  if (state.status === 'loading') {
    return <Spinner />;
  }

  if (state.status === 'error') {
    return <p className="p-4">No pudimos cargar los productos.</p>;
  }

  const { categories, products } = state;
  const normalizedSearch = normalizeSearch(search);
  const bySearch = normalizedSearch
    ? products.filter((product) => normalizeSearch(product.name).includes(normalizedSearch))
    : products;
  const filtered = showSold ? bySearch : bySearch.filter((product) => product.status !== 'sold');

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Productos</h1>
        <Link to="productos/nuevo" className="rounded bg-gray-900 px-4 py-2 text-white">
          Nuevo producto
        </Link>
      </div>

      {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por nombre"
        aria-label="Buscar por nombre"
        className="rounded border px-3 py-2"
      />

      <div className="flex items-center gap-2">
        <Switch checked={showSold} onChange={setShowSold} label="Mostrar vendidos" />
        <span>Mostrar vendidos</span>
      </div>

      {products.length === 0 ? (
        <EmptyState message="Todavía no cargaste productos" />
      ) : (
        categories.map((category) => {
          const categoryProducts = filtered.filter((product) => product.categoryId === category.id);

          if (categoryProducts.length === 0) {
            return null;
          }

          return (
            <section key={category.id}>
              <h2 className="font-semibold text-gray-700">
                {category.name} ({categoryProducts.length})
              </h2>
              {categoryProducts.map((product) => (
                <ProductListItem
                  key={product.id}
                  product={product}
                  onToggleStatus={toggleStatus}
                  onSell={(id) => registerSale(id, 1)}
                  onOpenSaleDialog={setSaleTarget}
                  onEdit={(id) => navigate(`productos/${id}`)}
                  onDuplicate={(id) => navigate(`productos/nuevo?from=${id}`)}
                  onDelete={remove}
                />
              ))}
            </section>
          );
        })
      )}

      {saleTarget ? (
        <SaleDialog
          productName={saleTarget.name}
          maxQty={saleTarget.stockQty ?? 0}
          onConfirm={async (qty) => {
            await registerSale(saleTarget.id, qty);
            setSaleTarget(null);
          }}
          onCancel={() => setSaleTarget(null)}
        />
      ) : null}
    </div>
  );
}
