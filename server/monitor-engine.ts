import db from './database';
import { sendDiscordNotification } from './discord';

interface MonitorRow {
  id: number;
  name: string;
  url: string;
  method: string;
  interval_seconds: number;
  timeout_seconds: number;
  status: string;
  expected_status_codes: string;
  headers: string;
  body: string;
  auth_type: string;
  auth_value: string;
  keyword: string;
  keyword_type: string;
  active: number;
  retry_count: number;
  max_retries: number;
  notify_on_down: number;
}

interface NotificationChannel {
  id: number;
  webhook_url: string;
  active: number;
  notify_up: number;
  notify_down: number;
}

const monitorTimers = new Map<number, NodeJS.Timeout>();
const downSince = new Map<number, Date>();

function parseStatusRange(range: string): number[] {
  const codes: number[] = [];
  const parts = range.split(',').map(s => s.trim());
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) codes.push(i);
    } else {
      codes.push(Number(part));
    }
  }
  return codes;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

async function checkMonitor(monitor: MonitorRow): Promise<void> {
  const startTime = Date.now();
  let status: 'up' | 'down' = 'down';
  let responseTime = 0;
  let statusCode = 0;
  let message = '';

  try {
    const headers: Record<string, string> = {};
    try {
      const parsed = JSON.parse(monitor.headers);
      if (Array.isArray(parsed)) {
        for (const h of parsed) {
          if (h.key && h.value) headers[h.key] = h.value;
        }
      }
    } catch {}

    // Auth headers
    if (monitor.auth_type === 'basic' && monitor.auth_value) {
      headers['Authorization'] = `Basic ${Buffer.from(monitor.auth_value).toString('base64')}`;
    } else if (monitor.auth_type === 'bearer' && monitor.auth_value) {
      headers['Authorization'] = `Bearer ${monitor.auth_value}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), monitor.timeout_seconds * 1000);

    const fetchOptions: RequestInit = {
      method: monitor.method,
      headers,
      signal: controller.signal,
      redirect: 'follow',
    };

    if (['POST', 'PUT', 'PATCH'].includes(monitor.method) && monitor.body) {
      fetchOptions.body = monitor.body;
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    const response = await fetch(monitor.url, fetchOptions);
    clearTimeout(timeoutId);

    responseTime = Date.now() - startTime;
    statusCode = response.status;

    const acceptedCodes = parseStatusRange(monitor.expected_status_codes);
    const statusCodeOk = acceptedCodes.includes(statusCode);

    // Keyword check
    let keywordOk = true;
    if (monitor.keyword) {
      const text = await response.text();
      const found = text.includes(monitor.keyword);
      keywordOk = monitor.keyword_type === 'present' ? found : !found;
    }

    if (statusCodeOk && keywordOk) {
      status = 'up';
      message = `HTTP ${statusCode} - ${responseTime}ms`;
    } else if (!statusCodeOk) {
      message = `Unexpected status code: ${statusCode}`;
    } else {
      message = `Keyword "${monitor.keyword}" ${monitor.keyword_type === 'present' ? 'not found' : 'found (should be absent)'}`;
    }
  } catch (error: any) {
    responseTime = Date.now() - startTime;
    if (error.name === 'AbortError') {
      message = `Timeout after ${monitor.timeout_seconds}s`;
    } else {
      message = error.message || 'Connection failed';
    }
  }

  // Record heartbeat
  db.prepare(
    'INSERT INTO heartbeats (monitor_id, status, response_time, status_code, message) VALUES (?, ?, ?, ?, ?)'
  ).run(monitor.id, status, responseTime, statusCode, message);

  // Cleanup old heartbeats (keep last 1000 per monitor)
  db.prepare(`
    DELETE FROM heartbeats WHERE monitor_id = ? AND id NOT IN (
      SELECT id FROM heartbeats WHERE monitor_id = ? ORDER BY timestamp DESC LIMIT 1000
    )
  `).run(monitor.id, monitor.id);

  // Update monitor status
  const previousStatus = monitor.status;
  const newStatus = status;

  // Handle retry logic
  if (newStatus === 'down' && previousStatus !== 'down') {
    const currentRetry = monitor.retry_count + 1;
    if (currentRetry < monitor.max_retries) {
      db.prepare('UPDATE monitors SET retry_count = ?, updated_at = datetime("now") WHERE id = ?')
        .run(currentRetry, monitor.id);
      return; // Don't change status yet, retry
    }
  }

  // Reset retry count on success
  if (newStatus === 'up') {
    db.prepare('UPDATE monitors SET retry_count = 0 WHERE id = ?').run(monitor.id);
  }

  db.prepare('UPDATE monitors SET status = ?, updated_at = datetime("now"), retry_count = 0 WHERE id = ?')
    .run(newStatus, monitor.id);

  // Send notifications on status change
  if (previousStatus !== newStatus) {
    console.log(`[Monitor] ${monitor.name}: status changed ${previousStatus} → ${newStatus}`);

    if (previousStatus === 'pending') {
      // First check after creation — still track downSince but skip notifications
      if (newStatus === 'down') {
        downSince.set(monitor.id, new Date());
      }
    } else {
      const channels = db.prepare(
        'SELECT * FROM notification_channels WHERE active = 1'
      ).all() as NotificationChannel[];

      console.log(`[Monitor] Found ${channels.length} active notification channel(s)`);

      let duration: string | undefined;
      if (newStatus === 'up' && downSince.has(monitor.id)) {
        duration = formatDuration(Date.now() - downSince.get(monitor.id)!.getTime());
        downSince.delete(monitor.id);
      } else if (newStatus === 'down') {
        downSince.set(monitor.id, new Date());
      }

      for (const channel of channels) {
        if (newStatus === 'down' && channel.notify_down) {
          console.log(`[Monitor] Sending DOWN notification to channel ${channel.id}`);
          await sendDiscordNotification(channel.webhook_url, {
            monitorName: monitor.name,
            url: monitor.url,
            status: 'down',
            statusCode,
            message,
          });
        }
        if (newStatus === 'up' && channel.notify_up) {
          console.log(`[Monitor] Sending UP notification to channel ${channel.id}`);
          await sendDiscordNotification(channel.webhook_url, {
            monitorName: monitor.name,
            url: monitor.url,
            status: 'up',
            responseTime,
            statusCode,
            duration,
          });
        }
      }
    }
  }
}

export function startMonitor(monitorId: number) {
  stopMonitor(monitorId);

  const monitor = db.prepare('SELECT * FROM monitors WHERE id = ? AND active = 1').get(monitorId) as MonitorRow | undefined;
  if (!monitor) return;

  // Do first check immediately
  checkMonitor(monitor).catch(console.error);

  const timer = setInterval(() => {
    const current = db.prepare('SELECT * FROM monitors WHERE id = ? AND active = 1').get(monitorId) as MonitorRow | undefined;
    if (!current) {
      stopMonitor(monitorId);
      return;
    }
    checkMonitor(current).catch(console.error);
  }, monitor.interval_seconds * 1000);

  monitorTimers.set(monitorId, timer);
}

export function stopMonitor(monitorId: number) {
  const timer = monitorTimers.get(monitorId);
  if (timer) {
    clearInterval(timer);
    monitorTimers.delete(monitorId);
  }
}

export function startAllMonitors() {
  const monitors = db.prepare('SELECT id FROM monitors WHERE active = 1').all() as { id: number }[];
  for (const m of monitors) {
    startMonitor(m.id);
  }
  console.log(`[Monitor Engine] Started ${monitors.length} monitors`);
}

export function restartMonitor(monitorId: number) {
  stopMonitor(monitorId);
  startMonitor(monitorId);
}

export function stopAllMonitors() {
  for (const [id] of monitorTimers) {
    stopMonitor(id);
  }
}
