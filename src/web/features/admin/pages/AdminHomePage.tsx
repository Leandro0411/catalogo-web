import { useAdmin } from '../admin-context';

export function AdminHomePage() {
  const { me } = useAdmin();

  return (
    <div className="p-4">
      <p>Hola, {me.username}</p>
    </div>
  );
}
