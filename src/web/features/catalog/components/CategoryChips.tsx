interface CategoryChipsProps {
  categories: Array<{ key: string; name: string }>;
  activeKey: string | null;
  onSelect: (key: string | null) => void;
}

function chipClass(active: boolean): string {
  return `shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
    active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
  }`;
}

export function CategoryChips({ categories, activeKey, onSelect }: CategoryChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-1">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={chipClass(activeKey === null)}
      >
        Todos
      </button>
      {categories.map((category) => (
        <button
          key={category.key}
          type="button"
          onClick={() => onSelect(category.key)}
          className={chipClass(activeKey === category.key)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
