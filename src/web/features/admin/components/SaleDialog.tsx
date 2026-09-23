import { useState } from 'react';
import type { FormEvent } from 'react';
import { HttpError } from '../../../api/http';

interface SaleDialogProps {
  productName: string;
  maxQty: number;
  onConfirm: (qty: number) => Promise<void>;
  onCancel: () => void;
}

export function SaleDialog({ productName, maxQty, onConfirm, onCancel }: SaleDialogProps) {
  const [qtyText, setQtyText] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const qty = Number(qtyText);

    if (!Number.isInteger(qty) || qty < 1 || qty > maxQty) {
      setError(`Ingresá una cantidad entre 1 y ${maxQty}`);
      return;
    }

    setError(null);
    setSubmitting(true);

    onConfirm(qty).catch((caught: unknown) => {
      setSubmitting(false);
      setError(caught instanceof HttpError ? caught.message : 'No pudimos registrar la venta.');
    });
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Registrar venta de ${productName}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded bg-white p-4 shadow-lg">
        <p className="font-semibold">{productName}</p>

        <label className="flex flex-col gap-1">
          Cantidad
          <input
            type="text"
            inputMode="numeric"
            value={qtyText}
            onChange={(event) => setQtyText(event.target.value)}
            className="rounded border px-3 py-2"
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-40"
          >
            Registrar
          </button>
          <button type="button" onClick={onCancel} className="rounded border px-4 py-2">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
