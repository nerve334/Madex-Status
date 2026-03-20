import db from './database';

interface PublicSystem {
  id: number;
  name: string;
  status: string;
  auto_status: number;
  provider_url: string;
  provider_component: string;
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

  // Exact match first
  const exact = components.find(c => c.name.toLowerCase() === lower && !c.group);
  if (exact) return exact;

  // Contains match
  const contains = components.find(c => c.name.toLowerCase().includes(lower) && !c.group);
  if (contains) return contains;

  // Reverse contains (search term contains component name)
  const reverse = components.find(c => lower.includes(c.name.toLowerCase()) && !c.group);
  if (reverse) return reverse;

  return null;
}

async function syncSystem(system: PublicSystem): Promise<void> {
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

let syncTimer: NodeJS.Timeout | null = null;

function recordAllHeartbeats(): void {
  const allSystems = db.prepare('SELECT id, status FROM public_systems ORDER BY display_order ASC').all() as any[];
  const insertStmt = db.prepare('INSERT INTO public_system_heartbeats (system_id, status) VALUES (?, ?)');
  const pruneStmt = db.prepare(`DELETE FROM public_system_heartbeats WHERE system_id = ? AND id NOT IN (
    SELECT id FROM public_system_heartbeats WHERE system_id = ? ORDER BY timestamp DESC LIMIT 100
  )`);

  for (const s of allSystems) {
    insertStmt.run(s.id, s.status);
    pruneStmt.run(s.id, s.id);
  }
}

async function runSync(): Promise<void> {
  const systems = db.prepare(
    "SELECT * FROM public_systems WHERE auto_status = 1 AND provider_url != '' AND provider_component != ''"
  ).all() as PublicSystem[];

  if (systems.length > 0) {
    // Clear response cache before each full sync cycle
    responseCache.clear();

    for (const system of systems) {
      await syncSystem(system);
    }
  }

  // Always record heartbeats for ALL systems (even those without provider sync)
  recordAllHeartbeats();
}

export function startProviderSync(intervalMs = 120_000): void {
  // Run immediately on start
  runSync().catch(err => console.error('[Provider Status] Sync error:', err));

  // Then repeat every interval (default: 2 minutes)
  syncTimer = setInterval(() => {
    runSync().catch(err => console.error('[Provider Status] Sync error:', err));
  }, intervalMs);

  console.log(`[Provider Status] Syncing every ${intervalMs / 1000}s`);
}

export function stopProviderSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}
