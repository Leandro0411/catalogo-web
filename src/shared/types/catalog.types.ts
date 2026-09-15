export type StockMode = 'availability' | 'unit' | 'quantity';

export type ProductStatus = 'active' | 'paused' | 'sold';

export type AttributeType = 'text' | 'number' | 'enum';

export interface AttributeDef {
  key: string;
  label: string;
  type: AttributeType;
  unit?: string;
  options?: string[];
  required?: boolean;
  filter?: 'multi' | 'min' | 'max';
  showInCard?: boolean;
}

export interface Choice {
  value: string;
  available: boolean;
}
