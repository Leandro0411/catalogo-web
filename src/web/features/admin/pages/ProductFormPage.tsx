import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ProductForm } from '../components/ProductForm';
import { useAdmin } from '../admin-context';
import { Spinner } from '../../../shared/components/Spinner';
import * as adminApi from '../../../api/admin.api';
import type { AdminCategory, AdminProduct, ProductInput } from '../../../../shared/types/api.types';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; categories: AdminCategory[]; product?: AdminProduct }
  | { status: 'error' };

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { me } = useAdmin();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      adminApi.listCategories(),
      id ? adminApi.getProduct(id) : Promise.resolve(undefined),
    ])
      .then(([categories, product]) => {
        if (!cancelled) {
          setState({ status: 'ready', categories, product });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === 'loading') {
    return <Spinner />;
  }

  if (state.status === 'error') {
    return <p className="p-4">No pudimos cargar el formulario.</p>;
  }

  const handleSubmit = async (input: ProductInput): Promise<void> => {
    if (state.product) {
      await adminApi.updateProduct(state.product.id, input);
    } else {
      await adminApi.createProduct(input);
    }

    navigate('/admin', { state: { message: 'Producto guardado' } });
  };

  return (
    <ProductForm
      categories={state.categories}
      tenantCurrency={me.tenant.currency}
      product={state.product}
      onSubmit={handleSubmit}
      onCancel={() => navigate('/admin')}
    />
  );
}
