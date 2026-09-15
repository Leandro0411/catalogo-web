export function Spinner() {
  return (
    <div role="status" aria-label="Cargando" className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600" />
    </div>
  );
}
