import { useState } from 'react';
import type { FormEvent } from 'react';
import { emptyFormState, formStateFromProduct, toProductInput } from '../lib/product-form';
import type { ProductFormErrors, ProductFormState } from '../lib/product-form';
import { AttributeField } from './AttributeField';
import { ChoicesEditor } from './ChoicesEditor';
import { Switch } from './Switch';
import { HttpError } from '../../../api/http';
import { CURRENCIES } from '../../../../shared/constants';
import type { AdminCategory, AdminProduct, ProductInput } from '../../../../shared/types/api.types';
import type { Currency } from '../../../../shared/types/tenant.types';

interface ApiValidationDetails {
  attributes?: Record<string, string>;
  choices?: string;
}

interface ProductFormProps {
  categories: AdminCategory[];
  tenantCurrency: Currency;
  product?: AdminProduct;
  onSubmit: (input: ProductInput) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({
  categories,
  tenantCurrency,
  product,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const initialCategory =
    categories.find((item) => item.id === product?.categoryId) ?? categories[0];

  const [state, setState] = useState<ProductFormState>(() =>
    product ? formStateFromProduct(product) : emptyFormState(initialCategory, tenantCurrency),
  );
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const category = categories.find((item) => item.id === state.categoryId) ?? initialCategory;

  const handleCategoryChange = (categoryId: string): void => {
    const nextCategory = categories.find((item) => item.id === categoryId);

    if (!nextCategory) {
      return;
    }

    setState((prev) => ({
      ...emptyFormState(nextCategory, tenantCurrency),
      name: prev.name,
      priceText: prev.priceText,
      priceNote: prev.priceNote,
      description: prev.description,
      status: prev.status,
    }));
    setErrors({});
  };

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const result = toProductInput(state, category);

    if ('errors' in result) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    onSubmit(result.input).catch((caught: unknown) => {
      setSubmitting(false);

      if (caught instanceof HttpError && caught.details) {
        const details = caught.details as ApiValidationDetails;
        setErrors({
          attributes: details.attributes,
          choices: details.choices,
          general: details.attributes || details.choices ? undefined : caught.message,
        });
        return;
      }

      setErrors({ general: 'No pudimos guardar. Probá de nuevo.' });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <label className="flex flex-col gap-1">
        Categoría
        <select
          value={state.categoryId}
          onChange={(event) => handleCategoryChange(event.target.value)}
          className="rounded border px-3 py-2"
        >
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        Nombre
        <input
          type="text"
          value={state.name}
          onChange={(event) => setState((prev) => ({ ...prev, name: event.target.value }))}
          required
          className="rounded border px-3 py-2"
        />
      </label>

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          Precio
          <input
            type="text"
            inputMode="decimal"
            value={state.priceText}
            onChange={(event) => setState((prev) => ({ ...prev, priceText: event.target.value }))}
            className="rounded border px-3 py-2"
          />
          {errors.price ? <span className="text-sm text-red-600">{errors.price}</span> : null}
        </label>
        <label className="flex flex-col gap-1">
          Moneda
          <select
            value={state.currency}
            onChange={(event) =>
              setState((prev) => ({ ...prev, currency: event.target.value as Currency }))
            }
            className="rounded border px-3 py-2"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        Nota de precio
        <input
          type="text"
          value={state.priceNote}
          onChange={(event) => setState((prev) => ({ ...prev, priceNote: event.target.value }))}
          className="rounded border px-3 py-2"
        />
      </label>

      {category.attributeSchema.map((def) => (
        <AttributeField
          key={def.key}
          def={def}
          value={state.attributes[def.key] ?? ''}
          onChange={(value) =>
            setState((prev) => ({ ...prev, attributes: { ...prev.attributes, [def.key]: value } }))
          }
          error={errors.attributes?.[def.key]}
        />
      ))}

      {category.choiceLabel ? (
        <ChoicesEditor
          choiceLabel={category.choiceLabel}
          choices={state.choices}
          onChange={(choices) => setState((prev) => ({ ...prev, choices }))}
        />
      ) : null}
      {errors.choices ? <span className="text-sm text-red-600">{errors.choices}</span> : null}

      <label className="flex flex-col gap-1">
        Descripción
        <textarea
          value={state.description}
          onChange={(event) => setState((prev) => ({ ...prev, description: event.target.value }))}
          className="rounded border px-3 py-2"
        />
      </label>

      <div className="flex items-center gap-2">
        <Switch
          checked={state.status === 'active'}
          onChange={(checked) =>
            setState((prev) => ({ ...prev, status: checked ? 'active' : 'paused' }))
          }
          label="Disponible"
        />
        <span>Disponible</span>
      </div>

      <p className="text-sm text-gray-500">Foto: disponible próximamente</p>

      {errors.general ? <p className="text-sm text-red-600">{errors.general}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-40"
        >
          Guardar
        </button>
        <button type="button" onClick={onCancel} className="rounded border px-4 py-2">
          Cancelar
        </button>
      </div>
    </form>
  );
}
