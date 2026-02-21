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
import UserManualPage from './pages/UserManualPage.vue';
import CertificateVerifyPage from './pages/CertificateVerifyPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginPage, meta: { title: 'Login' } },
    { path: '/', component: DashboardPage, meta: { title: 'Dashboard' } },
    { path: '/shareholders', component: ShareholdersPage, meta: { title: 'Shareholders' } },
    { path: '/lots', component: LotsPage, meta: { title: 'Lots' } },
    { path: '/transfers', component: TransfersPage, meta: { title: 'Transfers' } },
    { path: '/meetings', component: MeetingsPage, meta: { title: 'Meetings' } },
    { path: '/reports', component: ReportsPage, meta: { title: 'Reports' } },
    { path: '/audit-log', component: AuditLogPage, meta: { title: 'Audit Log' } },
    { path: '/user-manual', component: UserManualPage, meta: { title: 'User Manual' } },
    { path: '/admin', component: AdminPage, meta: { title: 'Admin' } },
    {
      path: '/verify/certificate/:verificationId',
      alias: ['/verify/:verificationId', '/verify/stock/:verificationId'],
      component: CertificateVerifyPage,
      meta: { title: 'Certificate Verification' }
    }
  ]
});

router.beforeEach((to) => {
  const pathLower = to.path.toLowerCase();
  const certSegment = to.path
    .split('/')
    .find((segment) => segment.toUpperCase().startsWith('CERT-'));

  if (certSegment) {
    const canonicalPath = `/verify/certificate/${encodeURIComponent(certSegment)}`;
    if (to.path !== canonicalPath) {
      return { path: canonicalPath, query: to.query, hash: to.hash };
    }
    return;
  }

  if (pathLower.startsWith('/verify/')) return;
  const token = localStorage.getItem('token');
  if (to.path === '/login' && token) return '/';
  if (to.path !== '/login' && !token) return '/login';
});
