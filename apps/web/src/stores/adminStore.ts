import { defineStore } from 'pinia';
import type { EmailSettingsDto, EmailSettingsTestDto, EmailSettingsUpdateDto } from '@cottonwood/shared';
import { api } from '../api';

export type AdminTab = 'users' | 'branding' | 'voting' | 'email' | 'system';

type LoadingFlags = Record<AdminTab, boolean>;
type SavingFlags = Record<'users' | 'branding' | 'voting' | 'email', boolean>;
type MessageMap = Record<AdminTab, string>;

function boolFromConfig(value: unknown, fallback = false) {
  if (typeof value !== 'string') return fallback;
  return value === 'true';
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const useAdminStore = defineStore('admin', {
  state: () => ({
    users: [] as any[],
    shareholders: [] as any[],
    emailLogs: [] as any[],
    config: {
      loaded: false,
      excludeDisputedFromVoting: false,
      appDisplayName: 'StockForge',
      appLogoUrl: '',
      appIncorporationState: '',
      appPublicBaseUrl: '',
      certificateSecretaryName: '',
      certificatePresidentName: '',
      emailPasswordResetsEnabled: false,
      emailMeetingReportsEnabled: true,
      emailProxyReceiptEnabled: false,
      emailCertificateNoticesEnabled: false
    },
    email: {
      loaded: false,
      enabled: false,
      smtpHost: '',
      smtpPort: '',
      smtpSecure: false,
      smtpUser: '',
      smtpPassword: '',
      hasSmtpPassword: false,
      fromName: '',
      fromEmail: '',
      replyTo: '',
      testToEmail: ''
    },
    system: {
      loaded: false,
      now: '',
      dbOk: false,
      migrationCount: 0
    },
    loading: {
      users: false,
      branding: false,
      voting: false,
      email: false,
      system: false
    } as LoadingFlags,
    saving: {
      users: false,
      branding: false,
      voting: false,
      email: false
    } as SavingFlags,
    loadedTabs: {
      users: false,
      branding: false,
      voting: false,
      email: false,
      system: false
    } as Record<AdminTab, boolean>,
    messages: {
      users: '',
      branding: '',
      voting: '',
      email: '',
      system: ''
    } as MessageMap,
    errors: {
      users: '',
      branding: '',
      voting: '',
      email: '',
      system: ''
    } as MessageMap,
    lastSavedAt: {
      users: '',
      branding: '',
      voting: '',
      email: '',
      system: ''
    } as MessageMap
  }),
  getters: {
    userCount: (state) => state.users.length,
    emailStatus: (state): 'disabled' | 'invalid' | 'valid' => {
      if (!state.email.enabled) return 'disabled';
      const hasRequired =
        Boolean(state.email.smtpHost.trim()) &&
        Boolean(state.email.smtpPort.trim()) &&
        Boolean(state.email.fromName.trim()) &&
        Boolean(state.email.fromEmail.trim()) &&
        Boolean(state.email.hasSmtpPassword || state.email.smtpPassword.trim());
      return hasRequired ? 'valid' : 'invalid';
    },
    systemStatus: (state): 'ok' | 'warning' | 'error' => {
      if (state.system.loaded && !state.system.dbOk) return 'error';
      if (state.system.loaded && state.system.migrationCount === 0) return 'warning';
      return 'ok';
    },
    votingStatus: (state): 'ok' | 'warning' => {
      return state.config.loaded ? 'ok' : 'warning';
    }
  },
  actions: {
    setMessage(section: AdminTab, message: string) {
      this.messages[section] = message;
      if (message) this.errors[section] = '';
    },
    setError(section: AdminTab, message: string) {
      this.errors[section] = message;
      if (message) this.messages[section] = '';
    },
    markSaved(section: AdminTab, message = 'Saved ✓') {
      this.setMessage(section, message);
      this.lastSavedAt[section] = nowTime();
    },
    isValidEmail(value: string) {
      return /^\S+@\S+\.\S+$/.test(value);
    },
    async loadUsers() {
      this.loading.users = true;
      this.setError('users', '');
      try {
        const [users, shareholders] = await Promise.all([api.get('/admin/users'), api.get('/shareholders')]);
        this.users = users.data;
        this.shareholders = shareholders.data;
      } catch (error: any) {
        this.setError('users', error?.response?.data?.message || 'Unable to load users.');
      } finally {
        this.loading.users = false;
      }
    },
    async createUser(payload: { email: string; password: string; roles: string[] }) {
      this.saving.users = true;
      this.setError('users', '');
      try {
        await api.post('/admin/users', payload);
        await this.loadUsers();
        this.markSaved('users', 'User created ✓');
      } catch (error: any) {
        this.setError('users', error?.response?.data?.message || 'Unable to create user.');
      } finally {
        this.saving.users = false;
      }
    },
    async updateUserRole(userId: string, roles: string[]) {
      this.saving.users = true;
      this.setError('users', '');
      try {
        await api.put(`/admin/users/${userId}/roles`, { roles });
        await this.loadUsers();
        this.markSaved('users', 'Roles updated ✓');
      } catch (error: any) {
        this.setError('users', error?.response?.data?.message || 'Unable to update roles.');
      } finally {
        this.saving.users = false;
      }
    },
    async resetUserPassword(userId: string, password: string) {
      this.saving.users = true;
      this.setError('users', '');
      try {
        await api.put(`/admin/users/${userId}/password`, { password });
        this.markSaved('users', 'Password reset ✓');
      } catch (error: any) {
        this.setError('users', error?.response?.data?.message || 'Unable to reset password.');
      } finally {
        this.saving.users = false;
      }
    },
    async setUserShareholderLink(userId: string, shareholderId: string | null) {
      this.saving.users = true;
      this.setError('users', '');
      try {
        await api.put(`/admin/users/${userId}/shareholder-link`, { shareholderId });
        await this.loadUsers();
        this.markSaved('users', shareholderId ? 'Shareholder link updated ✓' : 'Shareholder link cleared ✓');
      } catch (error: any) {
        this.setError('users', error?.response?.data?.message || 'Unable to update shareholder link.');
      } finally {
        this.saving.users = false;
      }
    },
    async loadConfig() {
      this.loading.branding = true;
      this.loading.voting = true;
      this.loading.email = true;
      try {
        const cfg = (await api.get('/config')).data;
        this.config.excludeDisputedFromVoting = boolFromConfig(cfg.excludeDisputedFromVoting, false);
        this.config.appDisplayName = cfg.appDisplayName || 'StockForge';
        this.config.appLogoUrl = cfg.appLogoUrl || '';
        this.config.appIncorporationState = cfg.appIncorporationState || '';
        this.config.appPublicBaseUrl = cfg.appPublicBaseUrl || '';
        this.config.certificateSecretaryName = cfg.certificateSecretaryName || '';
        this.config.certificatePresidentName = cfg.certificatePresidentName || '';
        this.config.emailPasswordResetsEnabled = boolFromConfig(cfg['email.passwordResetsEnabled'], false);
        this.config.emailMeetingReportsEnabled =
          cfg['email.meetingReportsEnabled'] === undefined ? true : boolFromConfig(cfg['email.meetingReportsEnabled']);
        this.config.emailProxyReceiptEnabled = boolFromConfig(cfg['email.proxyReceiptEnabled'], false);
        this.config.emailCertificateNoticesEnabled = boolFromConfig(cfg['email.certificateNoticesEnabled'], false);
        this.config.loaded = true;
      } catch (error: any) {
        const safe = error?.response?.data?.message || 'Unable to load config.';
        this.setError('branding', safe);
        this.setError('voting', safe);
        this.setError('email', safe);
      } finally {
        this.loading.branding = false;
        this.loading.voting = false;
        this.loading.email = false;
      }
    },
    async saveBranding() {
      this.saving.branding = true;
      this.setError('branding', '');
      try {
        const data = (await api.put('/config', {
          appDisplayName: this.config.appDisplayName.trim() || 'StockForge',
          appLogoUrl: this.config.appLogoUrl.trim(),
          appIncorporationState: this.config.appIncorporationState.trim(),
          appPublicBaseUrl: this.config.appPublicBaseUrl.trim(),
          certificateSecretaryName: this.config.certificateSecretaryName.trim(),
          certificatePresidentName: this.config.certificatePresidentName.trim()
        })).data as Record<string, string>;

        this.config.appDisplayName = data.appDisplayName || 'StockForge';
        this.config.appLogoUrl = data.appLogoUrl || '';
        this.config.appIncorporationState = data.appIncorporationState || '';
        this.config.appPublicBaseUrl = data.appPublicBaseUrl || '';
        this.config.certificateSecretaryName = data.certificateSecretaryName || '';
        this.config.certificatePresidentName = data.certificatePresidentName || '';

        window.dispatchEvent(
          new CustomEvent('app-branding-updated', {
            detail: { appDisplayName: this.config.appDisplayName, appLogoUrl: this.config.appLogoUrl }
          })
        );

        this.markSaved('branding');
      } catch (error: any) {
        this.setError('branding', error?.response?.data?.message || 'Unable to save branding.');
      } finally {
        this.saving.branding = false;
      }
    },
    async saveVoting() {
      this.saving.voting = true;
      this.setError('voting', '');
      try {
        await api.put('/config', {
          excludeDisputedFromVoting: this.config.excludeDisputedFromVoting
        });
        this.markSaved('voting');
      } catch (error: any) {
        this.setError('voting', error?.response?.data?.message || 'Unable to save voting configuration.');
      } finally {
        this.saving.voting = false;
      }
    },
    async loadEmail() {
      this.loading.email = true;
      this.setError('email', '');
      try {
        const data = (await api.get('/admin/email-settings')).data as EmailSettingsDto;
        this.email.enabled = data.enabled;
        this.email.smtpHost = data.smtpHost || '';
        this.email.smtpPort = data.smtpPort ? String(data.smtpPort) : '';
        this.email.smtpSecure = data.smtpSecure;
        this.email.smtpUser = data.smtpUser || '';
        this.email.smtpPassword = '';
        this.email.hasSmtpPassword = data.hasPassword;
        this.email.fromName = data.fromName || '';
        this.email.fromEmail = data.fromEmail || '';
        this.email.replyTo = data.replyTo || '';
        this.email.loaded = true;
      } catch (error: any) {
        this.setError('email', error?.response?.data?.message || 'Unable to load email settings.');
      } finally {
        this.loading.email = false;
      }
    },
    async loadEmailLogs() {
      try {
        this.emailLogs = (await api.get('/admin/email-logs')).data;
      } catch {
        this.emailLogs = [];
      }
    },
    async saveEmail() {
      this.saving.email = true;
      this.setError('email', '');
      try {
        await api.put('/config', {
          emailPasswordResetsEnabled: this.config.emailPasswordResetsEnabled,
          emailMeetingReportsEnabled: this.config.emailMeetingReportsEnabled,
          emailProxyReceiptEnabled: this.config.emailProxyReceiptEnabled,
          emailCertificateNoticesEnabled: this.config.emailCertificateNoticesEnabled
        });

        const portText = this.email.smtpPort.trim();
        const parsedPort = portText ? Number(portText) : null;
        if (portText && (!Number.isInteger(parsedPort) || Number(parsedPort) < 1 || Number(parsedPort) > 65535)) {
          this.setError('email', 'SMTP port must be an integer between 1 and 65535.');
          return;
        }

        if (this.email.fromEmail.trim() && !this.isValidEmail(this.email.fromEmail.trim())) {
          this.setError('email', 'From email is invalid.');
          return;
        }

        if (this.email.replyTo.trim() && !this.isValidEmail(this.email.replyTo.trim())) {
          this.setError('email', 'Reply-to email is invalid.');
          return;
        }

        if (this.email.enabled) {
          if (!this.email.smtpHost.trim() || !this.email.smtpPort.trim() || !this.email.fromName.trim() || !this.email.fromEmail.trim()) {
            this.setError('email', 'SMTP host, port, from name, and from email are required when email is enabled.');
            return;
          }
          if (!this.email.hasSmtpPassword && !this.email.smtpPassword.trim()) {
            this.setError('email', 'SMTP password is required when enabling email.');
            return;
          }
        }

        const payload: EmailSettingsUpdateDto = {
          enabled: this.email.enabled,
          smtpHost: this.email.smtpHost.trim() || null,
          smtpPort: parsedPort,
          smtpSecure: this.email.smtpSecure,
          smtpUser: this.email.smtpUser.trim() || null,
          smtpPassword: this.email.smtpPassword.trim() || null,
          fromName: this.email.fromName.trim() || null,
          fromEmail: this.email.fromEmail.trim() || null,
          replyTo: this.email.replyTo.trim() || null
        };

        const data = (await api.put('/admin/email-settings', payload)).data as EmailSettingsDto;
        this.email.hasSmtpPassword = data.hasPassword;
        this.email.smtpPassword = '';
        this.markSaved('email');
      } catch (error: any) {
        this.setError('email', error?.response?.data?.message || 'Unable to save email settings.');
      } finally {
        this.saving.email = false;
      }
    },
    async sendTestEmail() {
      this.setError('email', '');
      if (!this.email.testToEmail.trim() || !this.isValidEmail(this.email.testToEmail.trim())) {
        this.setError('email', 'Enter a valid test email address.');
        return;
      }

      this.loading.email = true;
      try {
        const payload: EmailSettingsTestDto = { toEmail: this.email.testToEmail.trim() };
        const result = (await api.post('/admin/email-settings/test', payload)).data as { ok: boolean; error?: string };
        if (result.ok) {
          this.setMessage('email', 'Test email sent.');
        } else {
          this.setError('email', result.error || 'Unable to send test email.');
        }
      } catch (error: any) {
        this.setError('email', error?.response?.data?.message || 'Unable to send test email.');
      } finally {
        this.loading.email = false;
      }
    },
    async loadSystem() {
      this.loading.system = true;
      this.setError('system', '');
      try {
        this.system = {
          ...(await api.get('/admin/health')).data,
          loaded: true
        };
      } catch (error: any) {
        this.setError('system', error?.response?.data?.message || 'Unable to load system health.');
      } finally {
        this.loading.system = false;
      }
    },
    async ensureTabLoaded(tab: AdminTab) {
      if (this.loadedTabs[tab]) return;
      if (tab === 'users') {
        await this.loadUsers();
      } else if (tab === 'branding' || tab === 'voting') {
        await this.loadConfig();
      } else if (tab === 'email') {
        await Promise.all([this.loadConfig(), this.loadEmail(), this.loadEmailLogs()]);
      } else if (tab === 'system') {
        await this.loadSystem();
      }
      this.loadedTabs[tab] = true;
    }
  }
});
