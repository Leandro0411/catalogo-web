import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getCatalog } from '../../../api/public.api';
import { useCart } from '../useCart';
import { maxQtyFor, reconcileCart } from '../../../../shared/domain/cart';
import { buildOrderMessage, buildWhatsAppUrl } from '../../../../shared/domain/whatsapp';
import { formatMoney } from '../../../../shared/domain/money';
import { productImageUrl } from '../../catalog/lib/product-image';
import { QtyStepper } from '../components/QtyStepper';
import { Spinner } from '../../../shared/components/Spinner';
import { EmptyState } from '../../../shared/components/EmptyState';
import { TrashIcon, WhatsAppIcon } from '../../../shared/components/Icons';
import type { PublicCatalogResponse } from '../../../../shared/types/api.types';
import type { CartItem } from '../../../../shared/types/cart.types';
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-base font-semibold">No pudimos verificar precios y stock.</p>
        <button
          type="button"
          onClick={() => {
            setState({ slug, status: 'loading' });
            setReloadToken((token) => token + 1);
          }}
          className="mt-1 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <EmptyState message="Tu carrito está vacío">
        <Link
          to=".."
          className="rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
        >
          Ver catálogo
        </Link>
      </EmptyState>
    );
  }

  const { data: catalog } = freshCatalog;
  const summary = reconcileCart(cart.lines, catalog);

  if (orderSent) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-8 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-green-50 text-green-600">
          <WhatsAppIcon className="h-7 w-7" />
        </span>
        <p className="mt-1 text-base font-semibold">¿Ya enviaste el pedido?</p>
        <p className="text-sm text-gray-500">
          Te escribimos por WhatsApp para confirmarte la disponibilidad.
        </p>
        <button
          type="button"
          onClick={() => {
            cart.clear();
            setOrderSent(false);
          }}
          className="mt-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
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

  const totals = Object.entries(summary.totals) as Array<[Currency, number]>;

  return (
    <div className="mx-auto max-w-3xl pb-44">
      <h1 className="px-4 pt-5 text-[22px] font-bold tracking-tight text-gray-900">Tu pedido</h1>

      <ul className="mt-2 divide-y divide-gray-100 px-4">
        {summary.items.map((item) => (
          <CartRow
            key={`${item.line.productId}:${item.line.choice ?? ''}`}
            item={item}
            onQtyChange={(qty) => cart.updateQty(item.line.productId, item.line.choice, qty)}
            onRemove={() => cart.remove(item.line.productId, item.line.choice)}
          />
        ))}
      </ul>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-gray-200/80 bg-white/95 px-4 pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-gray-900">Total</span>
            <div className="flex flex-col items-end">
              {totals.length === 0 ? (
                <span className="text-lg font-bold text-gray-400">—</span>
              ) : (
                totals.map(([currency, cents]) => (
                  <span
                    key={currency}
                    className="text-lg leading-tight font-bold tracking-tight text-gray-900 tabular-nums"
                  >
                    {formatMoney(cents, currency)}
                  </span>
                ))
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={summary.validItems.length === 0}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Enviar pedido por WhatsApp
          </button>
          <p className="mt-2 text-center text-[11px] text-gray-500">
            Se abre WhatsApp con el pedido escrito. No se cobra nada acá.
          </p>
        </div>
      </div>
    </div>
  );
}

interface CartRowProps {
  item: CartItem;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
}

function CartRow({ item, onQtyChange, onRemove }: CartRowProps) {
  const unavailable = item.issue === 'UNAVAILABLE' || item.issue === 'CHOICE_UNAVAILABLE';
  const max = item.product ? maxQtyFor(item.product) : 1;

  return (
    <li className="flex gap-3 py-4">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {item.product ? (
          <img
            src={productImageUrl(item.product, 'thumb')}
            alt=""
            loading="lazy"
            className={`h-full w-full object-cover ${unavailable ? 'opacity-40 grayscale' : ''}`}
          />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm leading-snug font-medium text-gray-900">
              {item.product?.name ?? 'Producto'}
            </p>
            {item.line.choice ? (
              <p className="mt-0.5 text-[13px] text-gray-500">{item.line.choice}</p>
            ) : null}
            {item.product?.priceNote ? (
              <p className="mt-0.5 text-[13px] text-gray-500">{item.product.priceNote}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Quitar del pedido"
            className="-mt-1 -mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-gray-400 transition active:bg-gray-100"
          >
            <TrashIcon className="h-[18px] w-[18px]" />
          </button>
        </div>

        {item.issue === 'UNAVAILABLE' ? (
          <p className="mt-1.5 text-[13px] font-medium text-red-600">
            Este producto ya no está disponible
          </p>
        ) : item.issue === 'CHOICE_UNAVAILABLE' ? (
          <p className="mt-1.5 text-[13px] font-medium text-red-600">
            Esta opción ya no está disponible
          </p>
        ) : (
          <>
            {item.issue === 'QTY_ADJUSTED' ? (
              <p className="mt-1.5 text-[13px] font-medium text-amber-600">
                Ajustamos la cantidad al stock disponible
              </p>
            ) : null}
            <div className="mt-auto flex items-end justify-between gap-2 pt-2">
              {max > 1 ? (
                <QtyStepper value={item.line.qty} max={max} onChange={onQtyChange} />
              ) : (
                <span className="text-[13px] text-gray-500">1 unidad</span>
              )}
              <div className="flex flex-col items-end">
                {item.line.qty > 1 ? (
                  <span className="text-[11px] text-gray-500 tabular-nums">
                    {formatMoney(item.unitPriceCents, item.currency)} c/u
                  </span>
                ) : null}
                <span className="text-[15px] leading-tight font-bold text-gray-900 tabular-nums">
                  {formatMoney(item.subtotalCents, item.currency)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
