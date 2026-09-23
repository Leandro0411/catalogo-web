import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StockFields } from './StockFields';
import type { ProductStatus, StockMode } from '../../../../shared/types/catalog.types';

function ControlledStockFields({ initialMode }: { initialMode: StockMode }) {
  const [stockMode, setStockMode] = useState<StockMode>(initialMode);
  const [stockQty, setStockQty] = useState('');
  const [status, setStatus] = useState<ProductStatus>('active');

  return (
    <StockFields
      stockMode={stockMode}
      stockQty={stockQty}
      status={status}
      onStockModeChange={setStockMode}
      onStockQtyChange={setStockQty}
      onStatusChange={setStatus}
    />
  );
}

describe('StockFields', () => {
  it('el campo de cantidad aparece solo en "Por cantidad"', async () => {
    const user = userEvent.setup();
    render(<ControlledStockFields initialMode="availability" />);

    expect(screen.queryByLabelText('Cantidad disponible')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Stock'), 'quantity');
    expect(screen.getByLabelText('Cantidad disponible')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Stock'), 'unit');
    expect(screen.queryByLabelText('Cantidad disponible')).not.toBeInTheDocument();
  });

  it('en modo unidad muestra el selector Disponible/Pausado/Vendido en lugar del switch', () => {
    render(<ControlledStockFields initialMode="unit" />);

    expect(screen.getByLabelText('Estado')).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Disponible' })).not.toBeInTheDocument();
  });

  it('en modo disponibilidad muestra el switch Disponible', () => {
    render(<ControlledStockFields initialMode="availability" />);

    expect(screen.getByRole('switch', { name: 'Disponible' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Estado')).not.toBeInTheDocument();
  });
});
