import type { RouteObject } from 'react-router';

export const adminRoutes: RouteObject[] = [
  {
    path: '/admin/login',
    lazy: async () => {
      const { LoginPage } = await import('./pages/LoginPage');
      return { Component: LoginPage };
    },
  },
  {
    path: '/admin',
    lazy: async () => {
      const { AdminLayout } = await import('./AdminLayout');
      return { Component: AdminLayout };
    },
    children: [
      {
        index: true,
        lazy: async () => {
          const { AdminHomePage } = await import('./pages/AdminHomePage');
          return { Component: AdminHomePage };
        },
      },
    ],
  },
];
