import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterPanel } from './FilterPanel';
import type { CatalogFilters, FilterControl } from '../../../../shared/types/filters.types';

const controls: FilterControl[] = [
  { kind: 'multi', key: 'condicion', label: 'Estado', options: ['Sellado', 'Usado', 'AS IS'] },
  { kind: 'min', key: 'bateria', label: 'Batería', unit: '%', range: [80, 100] },
  { kind: 'price', currencies: ['ARS', 'USD'] },
];

function emptyFilters(): CatalogFilters {
  return { category: null, q: '', multi: {}, min: {}, priceMax: null };
}

function ControlledFilterPanel({ resultCount = 5 }: { resultCount?: number }) {
  const [filters, setFilters] = useState<CatalogFilters>(emptyFilters());

  return (
    <FilterPanel
      controls={controls}
      filters={filters}
      resultCount={resultCount}
      tenantCurrency="USD"
      onToggleMulti={(key, value) => {
        setFilters((prev) => {
          const current = prev.multi[key] ?? [];
          const next = current.includes(value)
            ? current.filter((item) => item !== value)
            : [...current, value];
          return { ...prev, multi: { ...prev.multi, [key]: next } };
        });
      }}
      onSetMin={(key, value) => {
        setFilters((prev) => {
          const min = { ...prev.min };
          if (value === null) {
            delete min[key];
          } else {
            min[key] = value;
          }
          return { ...prev, min };
        });
      }}
      onSetPriceMax={(value) => setFilters((prev) => ({ ...prev, priceMax: value }))}
      onClear={() => setFilters(emptyFilters())}
    />
  );
}

describe('FilterPanel', () => {
  it('abre el panel, muestra los controles y el contador de filtros activos', async () => {
    const user = userEvent.setup();
    render(<ControlledFilterPanel />);

    expect(screen.getByRole('button', { name: 'Filtros (0)' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Filtros (0)' }));
    expect(screen.getByRole('dialog', { name: 'Filtros' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Usado' }));
    expect(screen.getByRole('button', { name: 'Usado' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('"Limpiar filtros" resetea el contador a 0', async () => {
    const user = userEvent.setup();
    render(<ControlledFilterPanel />);

    await user.click(screen.getByRole('button', { name: 'Filtros (0)' }));
    await user.click(screen.getByRole('button', { name: 'Usado' }));
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    expect(screen.getByRole('button', { name: 'Filtros (0)' })).toBeInTheDocument();
  });

  it('"Ver N resultados" cierra el panel', async () => {
    const user = userEvent.setup();
    render(<ControlledFilterPanel resultCount={3} />);

    await user.click(screen.getByRole('button', { name: 'Filtros (0)' }));
    await user.click(screen.getByRole('button', { name: 'Ver 3 resultados' }));

    expect(screen.queryByRole('dialog', { name: 'Filtros' })).not.toBeInTheDocument();
  });

  it('cierra el panel con Escape', async () => {
    const user = userEvent.setup();
    render(<ControlledFilterPanel />);

    await user.click(screen.getByRole('button', { name: 'Filtros (0)' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Filtros' })).not.toBeInTheDocument();
  });
});
