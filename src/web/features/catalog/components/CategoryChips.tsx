import { useSearchParams } from 'react-router';

interface CategoryChipsProps {
  categories: Array<{ key: string; name: string }>;
}

function chipClass(active: boolean): string {
  return `shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
    active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
  }`;
}

export function CategoryChips({ categories }: CategoryChipsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = searchParams.get('cat');

  const handleSelect = (key: string | null): void => {
    const next = new URLSearchParams(searchParams);

    if (key === null) {
      next.delete('cat');
    } else {
      next.set('cat', key);
    }

    setSearchParams(next);
  };

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-1">
      <button type="button" onClick={() => handleSelect(null)} className={chipClass(active === null)}>
        Todos
      </button>
      {categories.map((category) => (
        <button
          key={category.key}
          type="button"
          onClick={() => handleSelect(category.key)}
          className={chipClass(active === category.key)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
