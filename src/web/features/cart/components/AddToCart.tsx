import { useEffect, useState } from 'react';
import { maxQtyFor } from '../../../../shared/domain/cart';
import { formatMoney } from '../../../../shared/domain/money';
import type { AddLineResult } from '../../../../shared/types/cart.types';
import type { PublicCategory, PublicProduct } from '../../../../shared/types/api.types';
import { useCart } from '../useCart';
import { QtyStepper } from './QtyStepper';
import { CheckIcon } from '../../../shared/components/Icons';

const RESULT_MESSAGES: Record<AddLineResult, string> = {
  added: 'Agregado al carrito',
  clamped: 'Ajustamos la cantidad al máximo disponible',
  'cart-full': 'Tu carrito está lleno',
};

const FEEDBACK_MS = 2600;

interface Feedback {
  result: AddLineResult;
  id: number;
}

interface AddToCartProps {
  slug: string;
  product: PublicProduct;
  category: PublicCategory | undefined;
}

export function AddToCart({ slug, product, category }: AddToCartProps) {
  const { add } = useCart(slug);
  const [choice, setChoice] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const max = maxQtyFor(product);
  const requiresChoice = Boolean(category?.choiceLabel) && product.choices.length > 0;
  const canSubmit = !requiresChoice || choice !== null;

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timer = setTimeout(() => setFeedback(null), FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleAdd = () => {
    const result = add({ productId: product.id, choice, qty }, product);
    setFeedback({ result, id: Date.now() });
  };

  return (
    <>
      {requiresChoice ? (
        <fieldset className="mt-7">
          <legend className="text-sm font-semibold text-gray-900">{category?.choiceLabel}</legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {product.choices.map((value) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name={`choice-${product.id}`}
                  value={value}
                  checked={choice === value}
                  onChange={() => setChoice(value)}
                  className="peer sr-only"
                />
                <span className="peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand-ink peer-focus-visible:ring-brand block rounded-full border border-gray-200 px-3.5 py-2 text-sm text-gray-700 transition select-none peer-focus-visible:ring-2 active:scale-[0.97]">
                  {value}
                </span>
              </label>
            ))}
          </div>
          {canSubmit ? null : (
            <p className="mt-2.5 text-[13px] text-gray-500">Elegí una opción para continuar</p>
          )}
        </fieldset>
      ) : null}

      {max > 1 ? (
        <div className="mt-7 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Cantidad</span>
          <QtyStepper value={qty} max={max} onChange={setQty} />
        </div>
      ) : null}

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-gray-200/80 bg-white/95 px-4 pt-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex shrink-0 flex-col">
            <span className="text-[11px] leading-none text-gray-500">Total</span>
            <span className="mt-1.5 text-lg leading-none font-bold tracking-tight text-gray-900 tabular-nums">
              {formatMoney(product.priceCents * qty, product.currency)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canSubmit}
            className="bg-brand text-brand-contrast ml-auto min-w-0 flex-1 rounded-full px-5 py-3.5 text-[15px] font-semibold transition active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400"
          >
            Agregar al carrito
          </button>
        </div>
      </div>

      {feedback ? (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center px-4"
        >
          <p className="flex items-center gap-2 rounded-full bg-gray-900/95 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
            {feedback.result === 'added' ? <CheckIcon className="h-4 w-4 shrink-0" /> : null}
            {RESULT_MESSAGES[feedback.result]}
          </p>
        </div>
      ) : null}
    </>
  );
}
