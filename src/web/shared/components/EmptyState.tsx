import type { ReactNode } from 'react';

interface EmptyStateProps {
  message: string;
  children?: ReactNode;
}

export function EmptyState({ message, children }: EmptyStateProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center text-gray-500">
      <p>{message}</p>
      {children}
    </div>
  );
}
