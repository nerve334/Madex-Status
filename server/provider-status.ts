import db from './database';

interface PublicSystem {
  id: number;
  name: string;
  status: string;
  auto_status: number;
  provider_url: string;
  provider_component: string;
  check_url: string;
  check_interval: number;
}

interface StatuspageComponent {
  id: string;
  name: string;
  status: string;
  description: string | null;
  group: boolean;
  group_id: string | null;
}

// Cache fetched statuspage responses to avoid hammering the same URL
const responseCache = new Map<string, { data: StatuspageComponent[]; expires: number }>();

// Track individual system check timers
const systemTimers = new Map<number, NodeJS.Timeout>();

// Map Atlassian Statuspage component statuses to our status values
function mapProviderStatus(providerStatus: string): string {
  switch (providerStatus) {
    case 'operational':
      return 'operational';
    case 'degraded_performance':
      return 'degraded';
    case 'partial_outage':
      return 'partial';
    case 'major_outage':
      return 'major';
    case 'under_maintenance':
      return 'maintenance';
    default:
      return 'operational';
  }
}

async function fetchComponents(url: string): Promise<StatuspageComponent[]> {
  // Check cache (valid for 60 seconds)
  const cached = responseCache.get(url);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json', 'User-Agent': 'MadexStatus/1.0' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[Provider Status] Failed to fetch ${url}: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json() as { components?: StatuspageComponent[] };
    const components = data.components || [];

    responseCache.set(url, { data: components, expires: Date.now() + 60_000 });
    return components;
  } catch (err: any) {
    console.error(`[Provider Status] Error fetching ${url}: ${err.message}`);
    return [];
  }
}

function findBestMatch(components: StatuspageComponent[], searchTerm: string): StatuspageComponent | null {
  if (!searchTerm || components.length === 0) return null;

  const lower = searchTerm.toLowerCase();

  const exact = components.find(c => c.name.toLowerCase() === lower && !c.group);
  if (exact) return exact;

  const contains = components.find(c => c.name.toLowerCase().includes(lower) && !c.group);
  if (contains) return contains;

  const reverse = components.find(c => lower.includes(c.name.toLowerCase()) && !c.group);
  if (reverse) return reverse;

  return null;
}

async function syncProviderStatus(system: PublicSystem): Promise<void> {
  if (!system.provider_url || !system.provider_component) return;

  const components = await fetchComponents(system.provider_url);
  if (components.length === 0) return;

  const match = findBestMatch(components, system.provider_component);
  if (!match) {
    console.warn(`[Provider Status] No match for "${system.provider_component}" in ${system.provider_url}`);
    return;
  }

  const newStatus = mapProviderStatus(match.status);
  if (newStatus !== system.status) {
    db.prepare('UPDATE public_systems SET status = ? WHERE id = ?').run(newStatus, system.id);
    console.log(`[Provider Status] ${system.name}: ${system.status} → ${newStatus} (from ${match.name})`);
  }
}

// ──── Real HTTP Health Checks ────

async function performHealthCheck(system: PublicSystem): Promise<{ status: string; responseTime: number; message: string }> {
  if (!system.check_url) {
    // No check URL configured — use current system status as a passive heartbeat
    return {
      status: system.status === 'operational' || system.status === 'degraded' ? 'up' : 'down',
      responseTime: 0,
      message: 'No check URL configured',
    };
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(system.check_url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'MadexStatus/1.0' },
    });
    clearTimeout(timeout);

    const responseTime = Date.now() - start;

    if (res.ok) {
      return { status: 'up', responseTime, message: `HTTP ${res.status} - ${responseTime}ms` };
    }
    return { status: 'down', responseTime, message: `HTTP ${res.status}` };
  } catch (err: any) {
    const responseTime = Date.now() - start;
    if (err.name === 'AbortError') {
      return { status: 'down', responseTime, message: 'Timeout after 30s' };
    }
    return { status: 'down', responseTime, message: err.message || 'Connection failed' };
  }
}

function recordHeartbeat(systemId: number, status: string, responseTime: number, message: string): void {
  db.prepare('INSERT INTO public_system_heartbeats (system_id, status, response_time, message) VALUES (?, ?, ?, ?)')
    .run(systemId, status, responseTime, message);

  // Prune old heartbeats (keep last 200 per system)
  db.prepare(`DELETE FROM public_system_heartbeats WHERE system_id = ? AND id NOT IN (
    SELECT id FROM public_system_heartbeats WHERE system_id = ? ORDER BY timestamp DESC LIMIT 200
  )`).run(systemId, systemId);
}

async function checkSystem(system: PublicSystem): Promise<void> {
  const result = await performHealthCheck(system);
  recordHeartbeat(system.id, result.status, result.responseTime, result.message);

  // Update system status based on real check (only if check_url is set)
  if (system.check_url) {
    const newStatus = result.status === 'up' ? 'operational' : 'major';
    if (newStatus !== system.status) {
      db.prepare('UPDATE public_systems SET status = ? WHERE id = ?').run(newStatus, system.id);
      console.log(`[Health Check] ${system.name}: ${system.status} → ${newStatus} (${result.message})`);
    }
  }
}

function startSystemCheck(system: PublicSystem): void {
  stopSystemCheck(system.id);

  // Run first check immediately
  checkSystem(system).catch(err => console.error(`[Health Check] Error checking ${system.name}:`, err));

  const interval = Math.max(30, system.check_interval || 60) * 1000;
  const timer = setInterval(() => {
    // Re-read system from DB to get latest config
    const current = db.prepare('SELECT * FROM public_systems WHERE id = ?').get(system.id) as PublicSystem | undefined;
    if (!current) {
      stopSystemCheck(system.id);
      return;
    }
    checkSystem(current).catch(err => console.error(`[Health Check] Error checking ${current.name}:`, err));
  }, interval);

  systemTimers.set(system.id, timer);
}

function stopSystemCheck(systemId: number): void {
  const timer = systemTimers.get(systemId);
  if (timer) {
    clearInterval(timer);
    systemTimers.delete(systemId);
  }
}

// ──── Provider Sync (runs every 2min for Atlassian Statuspage syncing) ────

let providerSyncTimer: NodeJS.Timeout | null = null;

async function runProviderSync(): Promise<void> {
  const systems = db.prepare(
    "SELECT * FROM public_systems WHERE auto_status = 1 AND provider_url != '' AND provider_component != ''"
  ).all() as PublicSystem[];

  if (systems.length > 0) {
    responseCache.clear();
    for (const system of systems) {
      await syncProviderStatus(system);
    }
  }
}

// ──── Start Everything ────

export function startProviderSync(intervalMs = 60_000): void {
  // Start real health checks for ALL public systems
  const allSystems = db.prepare('SELECT * FROM public_systems ORDER BY display_order ASC').all() as PublicSystem[];
  for (const system of allSystems) {
    startSystemCheck(system);
  }
  console.log(`[Health Check] Started checks for ${allSystems.length} systems`);

  // Start provider sync (every 2 minutes)
  runProviderSync().catch(err => console.error('[Provider Status] Sync error:', err));
  providerSyncTimer = setInterval(() => {
    runProviderSync().catch(err => console.error('[Provider Status] Sync error:', err));
  }, 120_000);

  console.log(`[Provider Status] Syncing every 120s`);
}

export function stopProviderSync(): void {
  if (providerSyncTimer) {
    clearInterval(providerSyncTimer);
    providerSyncTimer = null;
  }
  for (const [id] of systemTimers) {
    stopSystemCheck(id);
  }
}

// Restart checks for a specific system (call after updating check_url/check_interval)
export function restartSystemCheck(systemId: number): void {
  const system = db.prepare('SELECT * FROM public_systems WHERE id = ?').get(systemId) as PublicSystem | undefined;
  if (system) {
    startSystemCheck(system);
  }
}
