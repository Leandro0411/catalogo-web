import { formatAttributeValue } from '../../../../shared/domain/attributes';
import type { AttributeDef } from '../../../../shared/types/catalog.types';

interface ProductAttributesProps {
  attributeSchema: AttributeDef[];
  attributes: Record<string, string | number>;
}

export function ProductAttributes({ attributeSchema, attributes }: ProductAttributesProps) {
  const entries = attributeSchema.filter((def) => attributes[def.key] !== undefined);

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="mt-7">
      <h2 className="text-sm font-semibold text-gray-900">Características</h2>
      <dl className="mt-2.5 divide-y divide-gray-200/70 overflow-hidden rounded-2xl bg-gray-50">
        {entries.map((def) => (
          <div key={def.key} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-gray-500">{def.label}</dt>
            <dd className="text-right text-sm font-semibold text-gray-900 tabular-nums">
              {formatAttributeValue(def, attributes[def.key])}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
