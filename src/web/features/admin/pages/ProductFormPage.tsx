import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
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
  const [searchParams] = useSearchParams();
  const duplicateFromId = searchParams.get('from');
  const isDuplicate = !id && duplicateFromId !== null;
  const navigate = useNavigate();
  const { me } = useAdmin();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const productIdToLoad = id ?? duplicateFromId ?? undefined;

    Promise.all([
      adminApi.listCategories(),
      productIdToLoad ? adminApi.getProduct(productIdToLoad) : Promise.resolve(undefined),
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
  }, [id, duplicateFromId]);

  if (state.status === 'loading') {
    return <Spinner />;
  }

  if (state.status === 'error') {
    return <p className="p-4">No pudimos cargar el formulario.</p>;
  }

  const handleSubmit = async (input: ProductInput): Promise<void> => {
    if (id) {
      await adminApi.updateProduct(id, input);
    } else {
      await adminApi.createProduct(input);
    }

    navigate('/admin', { state: { message: 'Producto guardado' } });
  };

  return (
    <>
      {isDuplicate && state.product ? (
        <p className="px-4 pt-4 text-sm text-blue-700">
          Duplicando «{state.product.name}». Cambiá lo que corresponda y guardá.
        </p>
      ) : null}
      <ProductForm
        categories={state.categories}
        tenantCurrency={me.tenant.currency}
        product={state.product}
        duplicate={isDuplicate}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/admin')}
      />
    </>
  );
}
