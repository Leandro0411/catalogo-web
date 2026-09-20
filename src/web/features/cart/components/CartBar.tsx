import { Link } from 'react-router';
import { reconcileCart } from '../../../../shared/domain/cart';
import { formatMoney } from '../../../../shared/domain/money';
import { useCart } from '../useCart';
import { ChevronRightIcon } from '../../../shared/components/Icons';
import type { PublicCatalogResponse } from '../../../../shared/types/api.types';
import type { Currency } from '../../../../shared/types/tenant.types';

interface CartBarProps {
  slug: string;
  catalog: PublicCatalogResponse;
}

/** Barra flotante con el pedido en curso, al estilo de las apps de delivery. */
export function CartBar({ slug, catalog }: CartBarProps) {
  const { lines, count } = useCart(slug);

  if (count === 0) {
    return null;
  }

  const summary = reconcileCart(lines, catalog);
  const totals = (Object.entries(summary.totals) as Array<[Currency, number]>)
    .map(([currency, cents]) => formatMoney(cents, currency))
    .join(' + ');

  return (
    <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4">
      <Link
        to="carrito"
        className="bg-brand text-brand-contrast pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-full py-3 pr-3 pl-3 shadow-lg shadow-black/25 transition active:scale-[0.98]"
      >
        <span className="bg-brand-contrast text-brand grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-sm font-bold tabular-nums">
          {count}
        </span>
        <span className="text-[15px] font-semibold">Ver mi pedido</span>
        <span className="ml-auto text-[15px] font-bold tabular-nums">{totals}</span>
        <ChevronRightIcon className="h-5 w-5 opacity-80" />
      </Link>
    </div>
  );
}
