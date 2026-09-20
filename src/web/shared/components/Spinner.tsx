export function Spinner() {
  return (
    <div role="status" aria-label="Cargando" className="flex items-center justify-center p-10">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-gray-700" />
    </div>
  );
}
