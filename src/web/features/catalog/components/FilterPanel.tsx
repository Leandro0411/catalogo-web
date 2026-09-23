import { useState } from 'react';
import { countActiveFilters } from '../../../../shared/domain/filters';
import { BottomSheet } from '../../../shared/components/BottomSheet';
import { MultiChipFilter } from './MultiChipFilter';
import { MinValueFilter } from './MinValueFilter';
import { PriceFilter } from './PriceFilter';
import type { CatalogFilters, FilterControl } from '../../../../shared/types/filters.types';
import type { Currency } from '../../../../shared/types/tenant.types';

interface FilterPanelProps {
  controls: FilterControl[];
  filters: CatalogFilters;
  resultCount: number;
  tenantCurrency: Currency;
  onToggleMulti: (key: string, value: string) => void;
  onSetMin: (key: string, value: number | null) => void;
  onSetPriceMax: (value: { currency: Currency; amountCents: number } | null) => void;
  onClear: () => void;
}

export function FilterPanel({
  controls,
  filters,
  resultCount,
  tenantCurrency,
  onToggleMulti,
  onSetMin,
  onSetPriceMax,
  onClear,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilters(filters);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700"
      >
        Filtros ({activeCount})
      </button>

      {open ? (
        <BottomSheet title="Filtros" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-4">
            {controls.map((control) => {
              if (control.kind === 'multi') {
                return (
                  <MultiChipFilter
                    key={control.key}
                    label={control.label}
                    options={control.options}
                    selected={filters.multi[control.key] ?? []}
                    onToggle={(value) => onToggleMulti(control.key, value)}
                  />
                );
              }

              if (control.kind === 'min') {
                return (
                  <MinValueFilter
                    key={control.key}
                    label={control.label}
                    unit={control.unit}
                    range={control.range}
                    value={filters.min[control.key] ?? null}
                    onChange={(value) => onSetMin(control.key, value)}
                  />
                );
              }

              return (
                <PriceFilter
                  key="price"
                  currencies={control.currencies}
                  defaultCurrency={tenantCurrency}
                  value={filters.priceMax}
                  onChange={onSetPriceMax}
                />
              );
            })}
          </div>

          <div className="mt-5 flex gap-2">
            <button type="button" onClick={onClear} className="flex-1 rounded-full border px-4 py-3 text-sm font-semibold">
              Limpiar filtros
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-full bg-gray-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Ver {resultCount} resultados
            </button>
          </div>
        </BottomSheet>
      ) : null}
    </>
  );
}
