import { Link } from 'react-router';
import { useCart } from '../useCart';
import { BagIcon } from '../../../shared/components/Icons';

interface CartButtonProps {
  slug: string;
}

export function CartButton({ slug }: CartButtonProps) {
  const { count } = useCart(slug);

  return (
    <Link
      to="carrito"
      aria-label="Ver carrito"
      className="relative grid h-11 w-11 place-items-center rounded-full transition active:scale-95 active:bg-black/10"
    >
      <BagIcon className="h-6 w-6" />
      {count > 0 ? (
        <span className="bg-brand-contrast text-brand ring-brand absolute top-0.5 right-0 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] leading-none font-bold tabular-nums ring-2">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
