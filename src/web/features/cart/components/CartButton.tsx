import { Link } from 'react-router';
import { useCart } from '../useCart';

interface CartButtonProps {
  slug: string;
}

export function CartButton({ slug }: CartButtonProps) {
  const { count } = useCart(slug);

  return (
    <Link to="carrito" className="relative inline-flex items-center gap-1" aria-label="Ver carrito">
      <span aria-hidden="true">🛒</span>
      {count > 0 ? (
        <span className="rounded-full bg-white px-1.5 text-xs font-bold text-gray-900">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
