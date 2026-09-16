import { createBrowserRouter } from 'react-router';
import { HomePage } from './features/tenant/HomePage';
import { NotFoundPage } from './features/tenant/NotFoundPage';
import { TenantLayout } from './features/tenant/TenantLayout';
import { CatalogPage } from './features/catalog/pages/CatalogPage';
import { ProductPage } from './features/catalog/pages/ProductPage';
import { CartPage } from './features/cart/pages/CartPage';

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  {
    path: '/:slug',
    element: <TenantLayout />,
    children: [
      { index: true, element: <CatalogPage /> },
      { path: 'p/:productId', element: <ProductPage /> },
      { path: 'carrito', element: <CartPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
