import { createBrowserRouter } from 'react-router';
import { HomePage } from './features/tenant/HomePage';
import { NotFoundPage } from './features/tenant/NotFoundPage';
import { TenantLayout } from './features/tenant/TenantLayout';

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  {
    path: '/:slug',
    element: <TenantLayout />,
    children: [{ index: true, element: <p>Catálogo en preparación</p> }],
  },
  { path: '*', element: <NotFoundPage /> },
]);
