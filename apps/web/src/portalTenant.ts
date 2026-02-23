import type { RouteLocationNormalizedLoaded } from 'vue-router';

function inferTenantSlugFromHostname(hostname: string) {
  const host = hostname.toLowerCase();
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return '';

  const configuredBaseDomain = (import.meta.env.VITE_TENANT_BASE_DOMAIN || '').trim().toLowerCase();
  if (configuredBaseDomain) {
    if (!host.endsWith(`.${configuredBaseDomain}`)) return '';
    return host.slice(0, -(configuredBaseDomain.length + 1)).split('.')[0] || '';
  }

  const labels = host.split('.').filter(Boolean);
  if (labels.length < 3) return '';
  if (labels[0] === 'www') return '';
  return labels[0] || '';
}

export function getTenantSlug(route: RouteLocationNormalizedLoaded) {
  const fromParam = String(route.params.tenantSlug || '').trim();
  if (fromParam) return fromParam;
  if (typeof window !== 'undefined') {
    const fromHost = inferTenantSlugFromHostname(window.location.hostname);
    if (fromHost) return fromHost;
  }
  return 'default';
}

export function getPortalBasePath(route: RouteLocationNormalizedLoaded) {
  return route.path.toLowerCase().startsWith('/t/') ? `/t/${getTenantSlug(route)}/portal` : '/portal';
}

export function getPortalLoginPath(route: RouteLocationNormalizedLoaded) {
  return route.path.toLowerCase().startsWith('/t/') ? `/t/${getTenantSlug(route)}/portal/login` : '/portal/login';
}

export function buildTenantSubdomainUrl(tenantSlug: string, path: string) {
  const configuredBaseDomain = (import.meta.env.VITE_TENANT_BASE_DOMAIN || '').trim().toLowerCase();
  if (!configuredBaseDomain || typeof window === 'undefined') return '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.protocol}//${tenantSlug}.${configuredBaseDomain}${normalizedPath}`;
}
