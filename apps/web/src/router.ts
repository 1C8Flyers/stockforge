import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from './pages/LoginPage.vue';
import DashboardPage from './pages/DashboardPage.vue';
import ShareholdersPage from './pages/ShareholdersPage.vue';
import LotsPage from './pages/LotsPage.vue';
import TransfersPage from './pages/TransfersPage.vue';
import MeetingsPage from './pages/MeetingsPage.vue';
import ReportsPage from './pages/ReportsPage.vue';
import AuditLogPage from './pages/AuditLogPage.vue';
import AdminPage from './pages/AdminPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginPage },
    { path: '/', component: DashboardPage },
    { path: '/shareholders', component: ShareholdersPage },
    { path: '/lots', component: LotsPage },
    { path: '/transfers', component: TransfersPage },
    { path: '/meetings', component: MeetingsPage },
    { path: '/reports', component: ReportsPage },
    { path: '/audit-log', component: AuditLogPage },
    { path: '/admin', component: AdminPage }
  ]
});

router.beforeEach((to) => {
  const token = localStorage.getItem('token');
  if (to.path === '/login' && token) return '/';
  if (to.path !== '/login' && !token) return '/login';
});
