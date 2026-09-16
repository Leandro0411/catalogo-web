import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getCatalog } from '../../../api/public.api';
import { useCart } from '../useCart';
import { maxQtyFor, reconcileCart } from '../../../../shared/domain/cart';
import { buildOrderMessage, buildWhatsAppUrl } from '../../../../shared/domain/whatsapp';
import { formatMoney } from '../../../../shared/domain/money';
import { QtyStepper } from '../components/QtyStepper';
import { Spinner } from '../../../shared/components/Spinner';
import { EmptyState } from '../../../shared/components/EmptyState';
import type { PublicCatalogResponse } from '../../../../shared/types/api.types';
import type { Currency } from '../../../../shared/types/tenant.types';

type FreshCatalogState =
  | { slug: string; status: 'loading' }
  | { slug: string; status: 'ready'; data: PublicCatalogResponse }
  | { slug: string; status: 'error' };

export function CartPage() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const slug = slugParam ?? '';
  const cart = useCart(slug);
  const [state, setState] = useState<FreshCatalogState>({ slug, status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);
  const [orderSent, setOrderSent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getCatalog(slug)
      .then((data) => {
        if (!cancelled) {
          setState({ slug, status: 'ready', data });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ slug, status: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, reloadToken]);

  const freshCatalog: FreshCatalogState = state.slug === slug ? state : { slug, status: 'loading' };

  if (freshCatalog.status === 'loading') {
    return <Spinner />;
  }

  if (freshCatalog.status === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <p>No pudimos verificar precios y stock.</p>
        <button
          type="button"
          onClick={() => {
            setState({ slug, status: 'loading' });
            setReloadToken((token) => token + 1);
          }}
          className="rounded bg-gray-800 px-4 py-2 text-white"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <EmptyState message="Tu carrito está vacío">
        <Link to=".." className="underline">
          Ver catálogo
        </Link>
      </EmptyState>
    );
  }

  const { data: catalog } = freshCatalog;
  const summary = reconcileCart(cart.lines, catalog);

  if (orderSent) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <p>¿Ya enviaste el pedido?</p>
        <button
          type="button"
          onClick={() => {
            cart.clear();
            setOrderSent(false);
          }}
          className="rounded bg-gray-800 px-4 py-2 text-white"
        >
          Vaciar carrito
        </button>
      </div>
    );
  }

  const handleSend = () => {
    for (const item of summary.validItems) {
      if (item.issue === 'QTY_ADJUSTED') {
        cart.updateQty(item.line.productId, item.line.choice, item.line.qty);
      }
    }

    const message = buildOrderMessage(catalog.tenant.name, summary);
    window.location.assign(buildWhatsAppUrl(catalog.tenant.whatsapp, message));
    setOrderSent(true);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {summary.items.map((item) => (
        <div
          key={`${item.line.productId}:${item.line.choice ?? ''}`}
          className="flex flex-col gap-1 border-b pb-3"
        >
          <span className="font-semibold">{item.product?.name ?? 'Producto'}</span>
          {item.line.choice ? (
            <span className="text-sm text-gray-600">{item.line.choice}</span>
          ) : null}

          {item.issue === 'UNAVAILABLE' ? (
            <>
              <p className="text-sm text-red-600">Este producto ya no está disponible</p>
              <button
                type="button"
                onClick={() => cart.remove(item.line.productId, item.line.choice)}
                className="w-fit text-sm underline"
              >
                Quitar
              </button>
            </>
          ) : item.issue === 'CHOICE_UNAVAILABLE' ? (
            <>
              <p className="text-sm text-red-600">Esta opción ya no está disponible</p>
              <button
                type="button"
                onClick={() => cart.remove(item.line.productId, item.line.choice)}
                className="w-fit text-sm underline"
              >
                Quitar
              </button>
            </>
          ) : (
            <>
              {item.issue === 'QTY_ADJUSTED' ? (
                <p className="text-sm text-amber-600">Ajustamos la cantidad al stock disponible</p>
              ) : null}
              {item.product && maxQtyFor(item.product) > 1 ? (
                <QtyStepper
                  value={item.line.qty}
                  max={maxQtyFor(item.product)}
                  onChange={(qty) => cart.updateQty(item.line.productId, item.line.choice, qty)}
                />
              ) : null}
              <span className="text-sm text-gray-600">
                {formatMoney(item.unitPriceCents, item.currency)} c/u
              </span>
              <span className="font-semibold">
                {formatMoney(item.subtotalCents, item.currency)}
              </span>
            </>
          )}
        </div>
      ))}

      <div className="flex flex-col gap-1">
        {(Object.entries(summary.totals) as Array<[Currency, number]>).map(([currency, cents]) => (
          <span key={currency} className="font-bold">
            {formatMoney(cents, currency)}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSend}
        disabled={summary.validItems.length === 0}
        className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-40"
      >
        Enviar pedido por WhatsApp
      </button>
    </div>
  );
}
