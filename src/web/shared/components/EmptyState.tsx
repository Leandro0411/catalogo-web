import type { ReactNode } from 'react';
import { BagIcon } from './Icons';

interface EmptyStateProps {
  message: string;
  children?: ReactNode;
}

export function EmptyState({ message, children }: EmptyStateProps) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-gray-100 text-gray-400">
        <BagIcon className="h-7 w-7" />
      </span>
      <p className="text-base font-semibold text-gray-900">{message}</p>
      {children}
    </div>
  );
}
