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
    <dl className="grid grid-cols-2 gap-2">
      {entries.map((def) => (
        <div key={def.key}>
          <dt className="text-sm text-gray-500">{def.label}</dt>
          <dd className="font-medium">{formatAttributeValue(def, attributes[def.key])}</dd>
        </div>
      ))}
    </dl>
  );
}
