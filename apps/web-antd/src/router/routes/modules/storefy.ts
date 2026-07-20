import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:shopping-cart',
      order: 10,
      title: 'Vendas',
    },
    name: 'StorefySales',
    path: '/sales',
    children: [
      {
        name: 'StorefyOrders',
        path: 'orders',
        component: () => import('#/views/storefy/orders/index.vue'),
        meta: {
          icon: 'lucide:clipboard-list',
          title: 'Pedidos',
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:package-search',
      order: 20,
      title: 'Catálogo',
    },
    name: 'StorefyCatalog',
    path: '/catalog',
    children: [
      {
        name: 'StorefyProducts',
        path: 'products',
        component: () => import('#/views/storefy/products/index.vue'),
        meta: {
          icon: 'lucide:package',
          title: 'Produtos',
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:warehouse',
      order: 30,
      title: 'Estoque',
    },
    name: 'StorefyInventory',
    path: '/inventory',
    children: [
      {
        name: 'StorefyInventoryBalances',
        path: 'balances',
        component: () => import('#/views/storefy/inventory/index.vue'),
        meta: {
          icon: 'lucide:boxes',
          title: 'Saldos',
        },
      },
    ],
  },
];

export default routes;
