const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

let authToken: string | null = localStorage.getItem('madex_token');

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('madex_token', token);
  } else {
    localStorage.removeItem('madex_token');
  }
}

export function getToken(): string | null {
  return authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    setToken(null);
    window.location.href = '/madexadm';
    throw new Error('Session expired');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

// ── Setup ──
export const checkSetupStatus = () => request<{ setupComplete: boolean }>('/setup/status');
export const performSetup = (data: { username: string; email: string; password: string }) =>
  request<{ token: string; user: any }>('/setup', { method: 'POST', body: JSON.stringify(data) });

// ── Auth ──
export const login = (username: string, password: string) =>
  request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
export const getMe = () => request<any>('/auth/me');

// ── Monitors ──
export const getMonitors = () => request<any[]>('/monitors');
export const getMonitor = (id: number) => request<{ monitor: any; heartbeats: any[] }>(`/monitors/${id}`);
export const createMonitor = (data: any) => request<any>('/monitors', { method: 'POST', body: JSON.stringify(data) });
export const updateMonitor = (id: number, data: any) => request<any>(`/monitors/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMonitor = (id: number) => request<any>(`/monitors/${id}`, { method: 'DELETE' });
export const getHeartbeats = (id: number, limit = 50) => request<any[]>(`/monitors/${id}/heartbeats?limit=${limit}`);
export const getUptime = (id: number, hours = 24) => request<any>(`/monitors/${id}/uptime?hours=${hours}`);

// ── Public Systems ──
export const getPublicSystems = () => request<any[]>('/public-systems');
export const createPublicSystem = (data: any) => request<any>('/public-systems', { method: 'POST', body: JSON.stringify(data) });
export const updatePublicSystem = (id: number, data: any) => request<any>(`/public-systems/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePublicSystem = (id: number) => request<any>(`/public-systems/${id}`, { method: 'DELETE' });

// ── Incidents ──
export const getIncidents = () => request<any[]>('/incidents');
export const createIncident = (data: any) => request<any>('/incidents', { method: 'POST', body: JSON.stringify(data) });
export const updateIncident = (id: number, data: any) => request<any>(`/incidents/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteIncident = (id: number) => request<any>(`/incidents/${id}`, { method: 'DELETE' });

// ── Notifications ──
export const getNotificationChannels = () => request<any[]>('/notifications');
export const createNotificationChannel = (data: any) => request<any>('/notifications', { method: 'POST', body: JSON.stringify(data) });
export const updateNotificationChannel = (id: number, data: any) => request<any>(`/notifications/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteNotificationChannel = (id: number) => request<any>(`/notifications/${id}`, { method: 'DELETE' });
export const testNotificationWebhook = (webhook_url: string) => request<{ success: boolean }>('/notifications/test', { method: 'POST', body: JSON.stringify({ webhook_url }) });

// ── Users ──
export const getUsers = () => request<any[]>('/users');
export const createUser = (data: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(data) });
export const deleteUser = (id: number) => request<any>(`/users/${id}`, { method: 'DELETE' });
export const changePassword = (id: number, password: string) => request<any>(`/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) });

// ── Settings ──
export const getSettings = () => request<Record<string, string>>('/settings');
export const updateSettings = (data: Record<string, string>) => request<any>('/settings', { method: 'PUT', body: JSON.stringify(data) });

// ── Dashboard ──
export const getDashboardStats = () => request<any>('/dashboard/stats');

// ── Export / Import ──
export const exportMonitors = () => request<any>('/monitors/export');
export const importMonitors = (monitors: any[]) => request<any>('/monitors/import', { method: 'POST', body: JSON.stringify({ monitors }) });

// ── Public (no auth) ──
export const getPublicStatus = () => request<any>('/public/status');
