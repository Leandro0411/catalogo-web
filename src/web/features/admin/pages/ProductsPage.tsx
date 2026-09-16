import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAdminProducts } from '../hooks/useAdminProducts';
import { ProductListItem } from '../components/ProductListItem';
import { Spinner } from '../../../shared/components/Spinner';
import { EmptyState } from '../../../shared/components/EmptyState';

const DIACRITICS_PATTERN = /[̀-ͯ]/g;

function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(DIACRITICS_PATTERN, '').toLowerCase();
}

export function ProductsPage() {
  const { state, toggleStatus, remove } = useAdminProducts();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const successMessage = (location.state as { message?: string } | null)?.message;

  if (state.status === 'loading') {
    return <Spinner />;
  }

  if (state.status === 'error') {
    return <p className="p-4">No pudimos cargar los productos.</p>;
  }

  const { categories, products } = state;
  const normalizedSearch = normalizeSearch(search);
  const filtered = normalizedSearch
    ? products.filter((product) => normalizeSearch(product.name).includes(normalizedSearch))
    : products;

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
                  onEdit={(id) => navigate(`productos/${id}`)}
                  onDelete={remove}
                />
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
