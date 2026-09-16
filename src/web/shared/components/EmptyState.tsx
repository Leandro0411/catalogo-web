interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8 text-center text-gray-500">
      <p>{message}</p>
    </div>
  );
}
