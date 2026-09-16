import { useState } from 'react';
import { maxQtyFor } from '../../../../shared/domain/cart';
import type { AddLineResult } from '../../../../shared/types/cart.types';
import type { PublicCategory, PublicProduct } from '../../../../shared/types/api.types';
import { useCart } from '../useCart';
import { QtyStepper } from './QtyStepper';

const RESULT_MESSAGES: Record<AddLineResult, string> = {
  added: 'Agregado al carrito',
  clamped: 'Ajustamos la cantidad al máximo disponible',
  'cart-full': 'Tu carrito está lleno',
};

interface AddToCartProps {
  slug: string;
  product: PublicProduct;
  category: PublicCategory | undefined;
}

export function AddToCart({ slug, product, category }: AddToCartProps) {
  const { add } = useCart(slug);
  const [choice, setChoice] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  const max = maxQtyFor(product);
  const requiresChoice = Boolean(category?.choiceLabel) && product.choices.length > 0;
  const canSubmit = !requiresChoice || choice !== null;

  const handleAdd = () => {
    const result = add({ productId: product.id, choice, qty }, product);
    setFeedback(RESULT_MESSAGES[result]);
  };

  return (
    <div className="flex flex-col gap-3">
      {requiresChoice ? (
        <fieldset>
          <legend className="font-semibold">{category?.choiceLabel}</legend>
          <div className="flex flex-col gap-1">
            {product.choices.map((value) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`choice-${product.id}`}
                  value={value}
                  checked={choice === value}
                  onChange={() => setChoice(value)}
                />
                {value}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <QtyStepper value={qty} max={max} onChange={setQty} />

      <button
        type="button"
        onClick={handleAdd}
        disabled={!canSubmit}
        className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-40"
      >
        Agregar al carrito
      </button>

      {!canSubmit && category?.choiceLabel ? (
        <p className="text-sm text-gray-500">Elegí un/a {category.choiceLabel.toLowerCase()}</p>
      ) : null}

      {feedback ? <p className="text-sm">{feedback}</p> : null}
    </div>
  );
}
