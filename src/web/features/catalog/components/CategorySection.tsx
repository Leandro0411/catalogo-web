import type { ReactNode } from 'react';

interface CategorySectionProps {
  title: string;
  children: ReactNode;
}

export function CategorySection({ title, children }: CategorySectionProps) {
  return (
    <section className="mt-5">
      <h2 className="px-4 text-lg font-bold tracking-tight text-gray-900">{title}</h2>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-7 px-4 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
        {children}
      </div>
    </section>
  );
}
