import { describe, expect, it } from 'vitest';
import {
  applyFilters,
  buildFilterControls,
  countActiveFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
  normalizeText,
  pruneFiltersForCategory,
} from './filters';
import type { PublicCategory, PublicProduct } from '../types/api.types';
import type { CatalogFilters } from '../types/filters.types';

const iphoneCategory: PublicCategory = {
  key: 'iphone',
  name: 'iPhones',
  sortOrder: 0,
  attributeSchema: [
    { key: 'modelo', label: 'Modelo', type: 'text', filter: 'multi' },
    {
      key: 'capacidad',
      label: 'Capacidad',
      type: 'enum',
      options: ['64GB', '128GB', '256GB', '512GB', '1TB'],
      filter: 'multi',
    },
    { key: 'color', label: 'Color', type: 'text' },
    {
      key: 'condicion',
      label: 'Estado',
      type: 'enum',
      options: ['Sellado', 'Usado', 'AS IS'],
      filter: 'multi',
    },
    { key: 'bateria', label: 'Batería', type: 'number', unit: '%', filter: 'min' },
  ],
  choiceLabel: null,
};

const accesoriosCategory: PublicCategory = {
  key: 'accesorios',
  name: 'Accesorios',
  sortOrder: 4,
  attributeSchema: [],
  choiceLabel: null,
};

const categories: PublicCategory[] = [iphoneCategory, accesoriosCategory];

function iphone(
  name: string,
  priceCents: number,
  overrides: Partial<PublicProduct['attributes']> = {},
): PublicProduct {
  return {
    id: name,
    categoryKey: 'iphone',
    name,
    description: null,
    image: null,
    priceCents,
    currency: 'USD',
    priceNote: null,
    stockMode: 'unit',
    stockQty: null,
    attributes: { modelo: name.split(' ').slice(0, 2).join(' '), ...overrides },
    choices: [],
  };
}

const iphone15pro87 = iphone('iPhone 15 Pro Max 256GB (Natural) 87%', 73500, {
  capacidad: '256GB',
  condicion: 'Usado',
  bateria: 87,
});
const iphone15pro100 = iphone('iPhone 15 Pro 128GB (Black) 100%', 66500, {
  capacidad: '128GB',
  condicion: 'Usado',
  bateria: 100,
});
const iphone14pro100AsIs = iphone('iPhone 14 Pro 128GB (Black) 100% AS IS', 57000, {
  capacidad: '128GB',
  condicion: 'AS IS',
  bateria: 100,
});
const iphone13blue84 = iphone('iPhone 13 128GB (Blue) 84%', 38000, {
  capacidad: '128GB',
  condicion: 'Usado',
  bateria: 84,
});
const iphone17sellado = iphone('iPhone 17 256GB (Sage)', 108000, {
  capacidad: '256GB',
  condicion: 'Sellado',
});
const iphone15white96 = iphone('iPhone 15 (White) 96%', 72000, {
  capacidad: '128GB',
  condicion: 'Usado',
  bateria: 96,
});

const cargador: PublicProduct = {
  id: 'cargador',
  categoryKey: 'accesorios',
  name: 'Cargador completo certificado',
  description: null,
  image: null,
  priceCents: 2200000,
  currency: 'ARS',
  priceNote: null,
  stockMode: 'quantity',
  stockQty: 5,
  attributes: {},
  choices: [],
};

const fundas: PublicProduct = {
  id: 'fundas',
  categoryKey: 'accesorios',
  name: 'Fundas Silicona case',
  description: null,
  image: null,
  priceCents: 1050000,
  currency: 'ARS',
  priceNote: '2x $16.000',
  stockMode: 'quantity',
  stockQty: 8,
  attributes: {},
  choices: ['Piña'],
};

const allProducts = [
  iphone15pro87,
  iphone15pro100,
  iphone14pro100AsIs,
  iphone13blue84,
  iphone17sellado,
  iphone15white96,
  cargador,
  fundas,
];

function emptyFilters(overrides: Partial<CatalogFilters> = {}): CatalogFilters {
  return { category: null, q: '', multi: {}, min: {}, priceMax: null, ...overrides };
}

describe('normalizeText', () => {
  it('quita acentos, pasa a minúsculas y colapsa espacios', () => {
    expect(normalizeText('  Piña   Fría  ')).toBe('pina fria');
  });
});

describe('buildFilterControls', () => {
  it('genera controles multi y min a partir de attributeSchema[].filter', () => {
    const controls = buildFilterControls({ categories, products: allProducts }, 'iphone');

    const condicionControl = controls.find((c) => c.kind === 'multi' && c.key === 'condicion');
    expect(condicionControl).toEqual({
      kind: 'multi',
      key: 'condicion',
      label: 'Estado',
      options: ['Sellado', 'Usado', 'AS IS'],
    });

    const bateriaControl = controls.find((c) => c.kind === 'min' && c.key === 'bateria');
    expect(bateriaControl).toMatchObject({ kind: 'min', key: 'bateria', unit: '%' });
  });

  it('con el catálogo en una sola moneda, no genera control de precio', () => {
    const onlyIphones = allProducts.filter((product) => product.categoryKey === 'iphone');
    const controls = buildFilterControls({ categories: [iphoneCategory], products: onlyIphones }, 'iphone');
    expect(controls.some((c) => c.kind === 'price')).toBe(false);
  });

  it('con el catálogo en moneda mixta, genera el control de precio con las monedas de la categoría elegida', () => {
    const controls = buildFilterControls({ categories, products: allProducts }, 'iphone');
    const priceControl = controls.find((c) => c.kind === 'price');
    expect(priceControl).toEqual({ kind: 'price', currencies: ['USD'] });
  });

  it('sin categoría elegida, el control de precio ofrece todas las monedas presentes', () => {
    const controls = buildFilterControls({ categories, products: allProducts }, null);
    const priceControl = controls.find((c) => c.kind === 'price');
    expect(priceControl).toEqual({ kind: 'price', currencies: ['ARS', 'USD'] });
  });
});

describe('applyFilters — Apple AC03', () => {
  it('categoría iphone + batería mín. 95 + precio máx. USD 700 deja solo dos productos', () => {
    const filters = emptyFilters({
      category: 'iphone',
      min: { bateria: 95 },
      priceMax: { currency: 'USD', amountCents: 70000 },
    });

    const result = applyFilters(allProducts, categories, filters);

    expect(result.map((p) => p.name).sort()).toEqual(
      ['iPhone 14 Pro 128GB (Black) 100% AS IS', 'iPhone 15 Pro 128GB (Black) 100%'].sort(),
    );
  });

  it('la variante equivalente con multi.condicion da el mismo resultado', () => {
    const filters = emptyFilters({
      category: 'iphone',
      multi: { condicion: ['Usado', 'AS IS'] },
      min: { bateria: 95 },
      priceMax: { currency: 'USD', amountCents: 70000 },
    });

    const result = applyFilters(allProducts, categories, filters);

    expect(result.map((p) => p.name).sort()).toEqual(
      ['iPhone 14 Pro 128GB (Black) 100% AS IS', 'iPhone 15 Pro 128GB (Black) 100%'].sort(),
    );
  });
});

describe('applyFilters — E17/E18 y semántica', () => {
  it('sin resultados devuelve un array vacío', () => {
    const filters = emptyFilters({ category: 'iphone', min: { bateria: 200 } });
    expect(applyFilters(allProducts, categories, filters)).toEqual([]);
  });

  it('el filtro de precio en una moneda excluye la otra (E18)', () => {
    const filters = emptyFilters({ priceMax: { currency: 'USD', amountCents: 70000 } });
    const result = applyFilters(allProducts, categories, filters);
    expect(result.some((p) => p.name === 'Cargador completo certificado')).toBe(false);
  });

  it('OR dentro de un mismo filtro multi y AND entre filtros distintos', () => {
    const filters = emptyFilters({
      category: 'iphone',
      multi: { condicion: ['Sellado', 'AS IS'], capacidad: ['128GB'] },
    });

    const result = applyFilters(allProducts, categories, filters);
    expect(result.map((p) => p.name)).toEqual(['iPhone 14 Pro 128GB (Black) 100% AS IS']);
  });

  it('un producto sin el atributo queda excluido cuando el filtro min está activo', () => {
    const filters = emptyFilters({ category: 'iphone', min: { bateria: 0 } });
    const result = applyFilters(allProducts, categories, filters);
    expect(result.some((p) => p.name === 'iPhone 17 256GB (Sage)')).toBe(false);
  });

  it('la búsqueda "15 pro" encuentra el 15 Pro y el 15 Pro Max', () => {
    const filters = emptyFilters({ q: '15 pro' });
    const result = applyFilters(allProducts, categories, filters);
    expect(result.map((p) => p.name).sort()).toEqual(
      ['iPhone 15 Pro 128GB (Black) 100%', 'iPhone 15 Pro Max 256GB (Natural) 87%'].sort(),
    );
  });

  it('la búsqueda "PINA" encuentra el valor "Piña" y "fundas" encuentra el producto', () => {
    const byChoice = applyFilters(allProducts, categories, emptyFilters({ q: 'PINA' }));
    expect(byChoice.map((p) => p.name)).toEqual(['Fundas Silicona case']);

    const byName = applyFilters(allProducts, categories, emptyFilters({ q: 'fundas' }));
    expect(byName.map((p) => p.name)).toEqual(['Fundas Silicona case']);
  });
});

describe('filtersToSearchParams ↔ filtersFromSearchParams', () => {
  it('hace la ida y vuelta sin pérdida', () => {
    const filters = emptyFilters({
      category: 'iphone',
      q: 'pro max',
      multi: { condicion: ['Usado', 'AS IS'] },
      min: { bateria: 90 },
      priceMax: { currency: 'USD', amountCents: 70000 },
    });

    const params = filtersToSearchParams(filters);
    const roundTripped = filtersFromSearchParams(params);

    expect(roundTripped).toEqual(filters);
  });

  it('ignora parámetros mal formados', () => {
    const params = new URLSearchParams('min_bateria=no-es-numero&pmax=abc&pcur=EUR');
    const filters = filtersFromSearchParams(params);

    expect(filters.min).toEqual({});
    expect(filters.priceMax).toBeNull();
  });
});

describe('countActiveFilters', () => {
  it('cuenta multi, min y precio como filtros activos, sin contar categoría ni búsqueda', () => {
    const filters = emptyFilters({
      category: 'iphone',
      q: 'algo',
      multi: { condicion: ['Usado'] },
      min: { bateria: 90 },
      priceMax: { currency: 'USD', amountCents: 70000 },
    });

    expect(countActiveFilters(filters)).toBe(3);
  });
});

describe('pruneFiltersForCategory', () => {
  it('descarta bateria al pasar a accesorios', () => {
    const filters = emptyFilters({ multi: { condicion: ['Usado'] }, min: { bateria: 90 } });
    const pruned = pruneFiltersForCategory(filters, 'accesorios', categories);

    expect(pruned.category).toBe('accesorios');
    expect(pruned.multi).toEqual({});
    expect(pruned.min).toEqual({});
  });

  it('conserva los filtros al volver a "Todos"', () => {
    const filters = emptyFilters({ category: 'iphone', min: { bateria: 90 } });
    const pruned = pruneFiltersForCategory(filters, null, categories);

    expect(pruned.category).toBeNull();
    expect(pruned.min).toEqual({ bateria: 90 });
  });
});
