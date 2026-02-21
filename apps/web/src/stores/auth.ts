import { defineStore } from 'pinia';
import { type AuthUser, RoleName } from '@cottonwood/shared';
import { api } from '../api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: (localStorage.getItem('authUser') ? JSON.parse(localStorage.getItem('authUser') as string) : null) as AuthUser | null
  }),
  getters: {
    isAuthed: (state) => Boolean(state.token),
    roles: (state) => state.user?.roles ?? [],
    canWrite: (state) => {
      const roles = state.user?.roles ?? [];
      return roles.includes(RoleName.Admin) || roles.includes(RoleName.Officer) || roles.includes(RoleName.Clerk);
    },
    canPost: (state) => {
      const roles = state.user?.roles ?? [];
      return roles.includes(RoleName.Admin) || roles.includes(RoleName.Officer);
    },
    isAdmin: (state) => (state.user?.roles ?? []).includes(RoleName.Admin)
  },
  actions: {
    setSession(token: string, user?: AuthUser) {
      this.token = token;
      localStorage.setItem('token', token);
      if (user) {
        this.user = user;
        localStorage.setItem('authUser', JSON.stringify(user));
      }
    },
    async hydrateUser() {
      if (!this.token) return;
      try {
        const { data } = await api.get<AuthUser>('/auth/me');
        this.user = data;
        localStorage.setItem('authUser', JSON.stringify(data));
      } catch {
        this.clear();
      }
    },
    clear() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('authUser');
    }
  }
});
