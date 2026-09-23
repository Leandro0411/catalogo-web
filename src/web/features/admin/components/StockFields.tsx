import { Switch } from './Switch';
import type { ProductStatus, StockMode } from '../../../../shared/types/catalog.types';

const STOCK_MODE_LABELS: Record<StockMode, string> = {
  availability: 'Disponible sí/no',
  unit: 'Unidad única',
  quantity: 'Por cantidad',
};

const UNIT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'Disponible',
  paused: 'Pausado',
  sold: 'Vendido',
};

interface StockFieldsProps {
  stockMode: StockMode;
  stockQty: string;
  status: ProductStatus;
  onStockModeChange: (mode: StockMode) => void;
  onStockQtyChange: (qty: string) => void;
  onStatusChange: (status: ProductStatus) => void;
  error?: string;
}

export function StockFields({
  stockMode,
  stockQty,
  status,
  onStockModeChange,
  onStockQtyChange,
  onStatusChange,
  error,
}: StockFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        Stock
        <select
          value={stockMode}
          onChange={(event) => onStockModeChange(event.target.value as StockMode)}
          className="rounded border px-3 py-2"
        >
          {Object.entries(STOCK_MODE_LABELS).map(([mode, label]) => (
            <option key={mode} value={mode}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {stockMode === 'quantity' ? (
        <label className="flex flex-col gap-1">
          Cantidad disponible
          <input
            type="text"
            inputMode="numeric"
            value={stockQty}
            onChange={(event) => onStockQtyChange(event.target.value)}
            className="rounded border px-3 py-2"
          />
          {error ? <span className="text-sm text-red-600">{error}</span> : null}
        </label>
      ) : null}

      {stockMode === 'unit' ? (
        <label className="flex flex-col gap-1">
          Estado
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as ProductStatus)}
            className="rounded border px-3 py-2"
          >
            {Object.entries(UNIT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="flex items-center gap-2">
          <Switch
            checked={status === 'active'}
            onChange={(checked) => onStatusChange(checked ? 'active' : 'paused')}
            label="Disponible"
          />
          <span>Disponible</span>
        </div>
      )}
    </div>
  );
}
