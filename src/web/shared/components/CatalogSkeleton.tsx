const SKELETON_CARDS = [0, 1, 2, 3, 4, 5];

export function CatalogSkeleton() {
  return (
    <div role="status" aria-label="Cargando" className="min-h-dvh animate-pulse">
      <div className="h-14 w-full bg-gray-200" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 px-4 pt-5 md:grid-cols-3 lg:grid-cols-4">
        {SKELETON_CARDS.map((index) => (
          <div key={index} className="flex flex-col gap-2.5">
            <div className="aspect-square w-full rounded-2xl bg-gray-200" />
            <div className="h-3.5 w-4/5 rounded-full bg-gray-200" />
            <div className="h-3.5 w-2/5 rounded-full bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
