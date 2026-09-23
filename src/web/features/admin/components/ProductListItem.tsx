import { formatMoney } from '../../../../shared/domain/money';
import { Switch } from './Switch';
import type { AdminProduct } from '../../../../shared/types/api.types';
import type { HiddenReason } from '../../../../shared/types/catalog.types';

const HIDDEN_REASON_LABELS: Record<HiddenReason, string> = {
  PAUSED: 'Pausado',
  SOLD: 'Vendido',
  OUT_OF_STOCK: 'Sin stock',
  NO_CHOICES_AVAILABLE: 'Sin opciones disponibles',
};

interface ProductListItemProps {
  product: AdminProduct;
  onToggleStatus: (id: string) => void;
  onSell: (id: string) => void;
  onOpenSaleDialog: (product: AdminProduct) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProductListItem({
  product,
  onToggleStatus,
  onSell,
  onOpenSaleDialog,
  onEdit,
  onDelete,
}: ProductListItemProps) {
  const handleDelete = (): void => {
    if (window.confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`)) {
      onDelete(product.id);
    }
  };

  const handleSell = (): void => {
    if (
      window.confirm(
        `¿Marcar "${product.name}" como vendido? Dejará de verse en el catálogo.`,
      )
    ) {
      onSell(product.id);
    }
  };

  const isSoldUnit = product.stockMode === 'unit' && product.status === 'sold';

  return (
    <div className="flex items-center gap-3 border-b py-3">
      <img
        src={product.imageKey ? `/img/${product.imageKey}-480` : '/placeholder.svg'}
        alt=""
        className="h-12 w-12 rounded object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{product.name}</p>
        <p className="text-sm text-gray-600">{formatMoney(product.priceCents, product.currency)}</p>
        {product.stockMode === 'quantity' ? (
          <p className="text-xs text-gray-500">Stock: {product.stockQty}</p>
        ) : null}
        {product.hiddenReason ? (
          <span className="text-xs text-red-600">
            No visible · {HIDDEN_REASON_LABELS[product.hiddenReason]}
          </span>
        ) : null}
      </div>

      {!isSoldUnit ? (
        <Switch
          checked={product.status === 'active'}
          onChange={() => onToggleStatus(product.id)}
          label="Disponible"
        />
      ) : null}

      {product.stockMode === 'unit' && product.status === 'active' ? (
        <button type="button" onClick={handleSell} className="text-sm underline">
          Vendido
        </button>
      ) : null}

      {isSoldUnit ? (
        <button type="button" onClick={() => onToggleStatus(product.id)} className="text-sm underline">
          Reactivar
        </button>
      ) : null}

      {product.stockMode === 'quantity' ? (
        <button
          type="button"
          onClick={() => onOpenSaleDialog(product)}
          disabled={product.stockQty === 0}
          className="text-sm underline disabled:opacity-40"
        >
          Registrar venta
        </button>
      ) : null}

      <button type="button" onClick={() => onEdit(product.id)} className="text-sm underline">
        Editar
      </button>
      <button type="button" onClick={handleDelete} className="text-sm text-red-600 underline">
        Eliminar
      </button>
    </div>
  );
}
