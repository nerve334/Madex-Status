import { Router, Request, Response } from 'express';
import db from '../database';
import { hashPassword, verifyPassword, generateToken, authMiddleware, isSetupComplete } from '../auth';
import { startMonitor, stopMonitor, restartMonitor } from '../monitor-engine';
import { testWebhook } from '../discord';

const router = Router();

// ──────────────────────────────────── SETUP & AUTH ────────────────────────────────────

// Check if initial setup is needed
router.get('/setup/status', (_req: Request, res: Response) => {
  res.json({ setupComplete: isSetupComplete() });
});

// Initial admin setup (only works once)
router.post('/setup', (req: Request, res: Response) => {
  if (isSetupComplete()) {
    return res.status(403).json({ error: 'Setup already completed' });
  }

  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const hash = hashPassword(password);
  db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run(username, email, hash, 'admin');
  db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('true', 'setup_complete');

  const user = db.prepare('SELECT id, role FROM users WHERE email = ?').get(email) as any;
  const token = generateToken(user.id, user.role);

  res.json({ token, user: { id: user.id, username, email, role: 'admin' } });
});

// Login
router.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Credentials required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username) as any;
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user.id, user.role);
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
});

// Get current user
router.get('/auth/me', authMiddleware, (req: Request, res: Response) => {
  const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get((req as any).userId) as any;
  res.json(user);
});

// ──────────────────────────────────── MONITORS ────────────────────────────────────

// List all monitors
router.get('/monitors', authMiddleware, (_req: Request, res: Response) => {
  const monitors = db.prepare('SELECT * FROM monitors ORDER BY created_at DESC').all();
  res.json(monitors);
});

// Export monitors as JSON
router.get('/monitors/export', authMiddleware, (_req: Request, res: Response) => {
  const monitors = db.prepare(
    'SELECT name, url, method, interval_seconds, timeout_seconds, expected_status_codes, headers, body, auth_type, auth_value, keyword, keyword_type, max_retries, active FROM monitors'
  ).all() as any[];

  const exportData = monitors.map((m: any) => ({
    ...m,
    headers: typeof m.headers === 'string' ? JSON.parse(m.headers || '[]') : m.headers,
  }));

  res.json({ version: 1, exported_at: new Date().toISOString(), monitors: exportData });
});

// Import monitors from JSON
router.post('/monitors/import', authMiddleware, (req: Request, res: Response) => {
  const { monitors: imported } = req.body;
  if (!Array.isArray(imported)) {
    return res.status(400).json({ error: 'Invalid format: expected { monitors: [...] }' });
  }

  const insert = db.prepare(`
    INSERT INTO monitors (name, url, method, interval_seconds, timeout_seconds, expected_status_codes, headers, body, auth_type, auth_value, keyword, keyword_type, max_retries, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const m of imported) {
    if (!m.name || !m.url) {
      skipped++;
      errors.push(`Skipped: missing name or url`);
      continue;
    }
    try {
      const result = insert.run(
        m.name, m.url,
        m.method || 'GET',
        Math.max(30, m.interval_seconds || 60),
        m.timeout_seconds || 30,
        m.expected_status_codes || '200-299',
        JSON.stringify(m.headers || []),
        m.body || '',
        m.auth_type || 'none',
        m.auth_value || '',
        m.keyword || '',
        m.keyword_type || 'present',
        m.max_retries ?? 3,
        m.active ?? 1
      );
      if (m.active !== 0) startMonitor(result.lastInsertRowid as number);
      created++;
    } catch (e: any) {
      skipped++;
      errors.push(`Failed "${m.name}": ${e.message}`);
    }
  }

  res.json({ created, skipped, errors });
});

// Get single monitor with recent heartbeats
router.get('/monitors/:id', authMiddleware, (req: Request, res: Response) => {
  const monitor = db.prepare('SELECT * FROM monitors WHERE id = ?').get(req.params.id);
  if (!monitor) return res.status(404).json({ error: 'Monitor not found' });

  const heartbeats = db.prepare(
    'SELECT * FROM heartbeats WHERE monitor_id = ? ORDER BY timestamp DESC LIMIT 100'
  ).all(req.params.id);

  res.json({ monitor, heartbeats });
});

// Create monitor
router.post('/monitors', authMiddleware, (req: Request, res: Response) => {
  const { name, url, method, interval_seconds, timeout_seconds, expected_status_codes, headers, body, auth_type, auth_value, keyword, keyword_type, max_retries, active } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: 'Name and URL are required' });
  }

  const result = db.prepare(`
    INSERT INTO monitors (name, url, method, interval_seconds, timeout_seconds, expected_status_codes, headers, body, auth_type, auth_value, keyword, keyword_type, max_retries, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, url,
    method || 'GET',
    Math.max(30, interval_seconds || 60),
    timeout_seconds || 30,
    expected_status_codes || '200-299',
    JSON.stringify(headers || []),
    body || '',
    auth_type || 'none',
    auth_value || '',
    keyword || '',
    keyword_type || 'present',
    max_retries ?? 3,
    active ?? 1
  );

  const monitor = db.prepare('SELECT * FROM monitors WHERE id = ?').get(result.lastInsertRowid);
  if (active !== 0) {
    startMonitor(result.lastInsertRowid as number);
  }

  res.status(201).json(monitor);
});

// Update monitor
router.put('/monitors/:id', authMiddleware, (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM monitors WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Monitor not found' });

  const { name, url, method, interval_seconds, timeout_seconds, expected_status_codes, headers, body, auth_type, auth_value, keyword, keyword_type, max_retries, active } = req.body;

  db.prepare(`
    UPDATE monitors SET name=?, url=?, method=?, interval_seconds=?, timeout_seconds=?, expected_status_codes=?, headers=?, body=?, auth_type=?, auth_value=?, keyword=?, keyword_type=?, max_retries=?, active=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    name ?? existing.name,
    url ?? existing.url,
    method ?? existing.method,
    Math.max(30, interval_seconds ?? existing.interval_seconds),
    timeout_seconds ?? existing.timeout_seconds,
    expected_status_codes ?? existing.expected_status_codes,
    headers ? JSON.stringify(headers) : existing.headers,
    body ?? existing.body,
    auth_type ?? existing.auth_type,
    auth_value ?? existing.auth_value,
    keyword ?? existing.keyword,
    keyword_type ?? existing.keyword_type,
    max_retries ?? existing.max_retries,
    active ?? existing.active,
    req.params.id
  );

  restartMonitor(Number(req.params.id));
  const monitor = db.prepare('SELECT * FROM monitors WHERE id = ?').get(req.params.id);
  res.json(monitor);
});

// Delete monitor
router.delete('/monitors/:id', authMiddleware, (req: Request, res: Response) => {
  const existing = db.prepare('SELECT id FROM monitors WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Monitor not found' });

  stopMonitor(Number(req.params.id));
  db.prepare('DELETE FROM monitors WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Get heartbeats for a monitor
router.get('/monitors/:id/heartbeats', authMiddleware, (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const heartbeats = db.prepare(
    'SELECT * FROM heartbeats WHERE monitor_id = ? ORDER BY timestamp DESC LIMIT ?'
  ).all(req.params.id, limit);
  res.json(heartbeats);
});

// Get uptime percentage
router.get('/monitors/:id/uptime', authMiddleware, (req: Request, res: Response) => {
  const hours = Number(req.query.hours) || 24;
  const since = new Date(Date.now() - hours * 3600000).toISOString();
  
  const total = db.prepare(
    'SELECT COUNT(*) as count FROM heartbeats WHERE monitor_id = ? AND timestamp >= ?'
  ).get(req.params.id, since) as any;
  
  const up = db.prepare(
    'SELECT COUNT(*) as count FROM heartbeats WHERE monitor_id = ? AND timestamp >= ? AND status = "up"'
  ).get(req.params.id, since) as any;

  const percentage = total.count > 0 ? ((up.count / total.count) * 100).toFixed(2) : '100.00';
  res.json({ hours, total: total.count, up: up.count, percentage: Number(percentage) });
});

// ──────────────────────────────────── PUBLIC SYSTEMS ────────────────────────────────────

router.get('/public-systems', (_req: Request, res: Response) => {
  const systems = db.prepare('SELECT * FROM public_systems ORDER BY display_order ASC').all();
  res.json(systems);
});

router.post('/public-systems', authMiddleware, (req: Request, res: Response) => {
  const { name, status, display_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  
  const result = db.prepare('INSERT INTO public_systems (name, status, display_order) VALUES (?, ?, ?)').run(name, status || 'operational', display_order || 0);
  const system = db.prepare('SELECT * FROM public_systems WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(system);
});

router.put('/public-systems/:id', authMiddleware, (req: Request, res: Response) => {
  const { name, status, display_order, auto_status, provider_url, provider_component } = req.body;
  db.prepare(`UPDATE public_systems SET 
    name=COALESCE(?,name), status=COALESCE(?,status), display_order=COALESCE(?,display_order),
    auto_status=COALESCE(?,auto_status), provider_url=COALESCE(?,provider_url), provider_component=COALESCE(?,provider_component)
    WHERE id=?`)
    .run(name, status, display_order, auto_status ?? null, provider_url ?? null, provider_component ?? null, req.params.id);
  const system = db.prepare('SELECT * FROM public_systems WHERE id = ?').get(req.params.id);
  if (!system) return res.status(404).json({ error: 'System not found' });
  res.json(system);
});

router.delete('/public-systems/:id', authMiddleware, (req: Request, res: Response) => {
  db.prepare('DELETE FROM public_systems WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ──────────────────────────────────── INCIDENTS ────────────────────────────────────

router.get('/incidents', (_req: Request, res: Response) => {
  const incidents = db.prepare(`
    SELECT i.*, ps.name as system_name 
    FROM incidents i 
    LEFT JOIN public_systems ps ON i.system_id = ps.id 
    ORDER BY i.created_at DESC
  `).all();
  res.json(incidents);
});

router.post('/incidents', authMiddleware, (req: Request, res: Response) => {
  const { title, description, system_id, impact_status } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const result = db.prepare('INSERT INTO incidents (title, description, system_id, impact_status) VALUES (?, ?, ?, ?)')
    .run(title, description || '', system_id || null, impact_status || 'major');
  
  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(result.lastInsertRowid);

  // Update public system status
  if (system_id) {
    db.prepare('UPDATE public_systems SET status = ? WHERE id = ?').run(impact_status || 'major', system_id);
  }

  res.status(201).json(incident);
});

router.put('/incidents/:id', authMiddleware, (req: Request, res: Response) => {
  const { title, description, status, impact_status } = req.body;
  
  if (status === 'resolved') {
    db.prepare('UPDATE incidents SET title=COALESCE(?,title), description=COALESCE(?,description), status=?, impact_status=COALESCE(?,impact_status), resolved_at=datetime("now") WHERE id=?')
      .run(title, description, status, impact_status, req.params.id);
    
    // Restore public system to operational
    const incident = db.prepare('SELECT system_id FROM incidents WHERE id = ?').get(req.params.id) as any;
    if (incident?.system_id) {
      const activeIncidents = db.prepare('SELECT COUNT(*) as count FROM incidents WHERE system_id = ? AND status = "active" AND id != ?').get(incident.system_id, req.params.id) as any;
      if (activeIncidents.count === 0) {
        db.prepare('UPDATE public_systems SET status = "operational" WHERE id = ?').run(incident.system_id);
      }
    }
  } else {
    db.prepare('UPDATE incidents SET title=COALESCE(?,title), description=COALESCE(?,description), status=COALESCE(?,status), impact_status=COALESCE(?,impact_status) WHERE id=?')
      .run(title, description, status, impact_status, req.params.id);
  }

  const updated = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Incident not found' });
  res.json(updated);
});

router.delete('/incidents/:id', authMiddleware, (req: Request, res: Response) => {
  db.prepare('DELETE FROM incidents WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ──────────────────────────────────── NOTIFICATION CHANNELS ────────────────────────────────────

router.get('/notifications', authMiddleware, (_req: Request, res: Response) => {
  const channels = db.prepare('SELECT * FROM notification_channels ORDER BY created_at DESC').all();
  res.json(channels);
});

router.post('/notifications', authMiddleware, (req: Request, res: Response) => {
  const { name, type, webhook_url, notify_up, notify_down } = req.body;
  if (!name || !webhook_url) return res.status(400).json({ error: 'Name and webhook URL are required' });

  const result = db.prepare('INSERT INTO notification_channels (name, type, webhook_url, notify_up, notify_down) VALUES (?, ?, ?, ?, ?)')
    .run(name, type || 'discord', webhook_url, notify_up ?? 1, notify_down ?? 1);
  const channel = db.prepare('SELECT * FROM notification_channels WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(channel);
});

router.put('/notifications/:id', authMiddleware, (req: Request, res: Response) => {
  const { name, webhook_url, active, notify_up, notify_down } = req.body;
  db.prepare('UPDATE notification_channels SET name=COALESCE(?,name), webhook_url=COALESCE(?,webhook_url), active=COALESCE(?,active), notify_up=COALESCE(?,notify_up), notify_down=COALESCE(?,notify_down) WHERE id=?')
    .run(name, webhook_url, active, notify_up, notify_down, req.params.id);
  const channel = db.prepare('SELECT * FROM notification_channels WHERE id = ?').get(req.params.id);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  res.json(channel);
});

router.delete('/notifications/:id', authMiddleware, (req: Request, res: Response) => {
  db.prepare('DELETE FROM notification_channels WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/notifications/test', authMiddleware, async (req: Request, res: Response) => {
  const { webhook_url } = req.body;
  if (!webhook_url) return res.status(400).json({ error: 'Webhook URL required' });
  const success = await testWebhook(webhook_url);
  res.json({ success });
});

// ──────────────────────────────────── USERS ────────────────────────────────────

router.get('/users', authMiddleware, (_req: Request, res: Response) => {
  const users = db.prepare('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

router.post('/users', authMiddleware, (req: Request, res: Response) => {
  if ((req as any).userRole !== 'admin') return res.status(403).json({ error: 'Admin role required' });

  const { username, email, password, role } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) return res.status(409).json({ error: 'User already exists' });

  const hash = hashPassword(password);
  const result = db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run(username, email, hash, role || 'manager');
  const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(user);
});

router.delete('/users/:id', authMiddleware, (req: Request, res: Response) => {
  if ((req as any).userRole !== 'admin') return res.status(403).json({ error: 'Admin role required' });
  if (Number(req.params.id) === (req as any).userId) return res.status(400).json({ error: 'Cannot delete yourself' });

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.put('/users/:id/password', authMiddleware, (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  // Only admins or the user themselves can change password
  if ((req as any).userRole !== 'admin' && Number(req.params.id) !== (req as any).userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const hash = hashPassword(password);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ success: true });
});

// ──────────────────────────────────── SETTINGS ────────────────────────────────────

router.get('/settings', authMiddleware, (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

router.put('/settings', authMiddleware, (req: Request, res: Response) => {
  const updates = req.body;
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(updates)) {
    stmt.run(key, String(value));
  }
  res.json({ success: true });
});

// ──────────────────────────────────── PUBLIC API (no auth) ────────────────────────────────────

router.get('/public/status', (_req: Request, res: Response) => {
  const systems = db.prepare('SELECT * FROM public_systems ORDER BY display_order ASC').all();
  const incidents = db.prepare(`
    SELECT i.*, ps.name as system_name 
    FROM incidents i 
    LEFT JOIN public_systems ps ON i.system_id = ps.id 
    ORDER BY i.created_at DESC 
    LIMIT 50
  `).all();

  const monitors = db.prepare('SELECT id, name, url, status FROM monitors WHERE active = 1').all() as any[];
  
  const monitorPublicData = monitors.map((m: any) => {
    const heartbeats = db.prepare(
      'SELECT status, response_time, timestamp FROM heartbeats WHERE monitor_id = ? ORDER BY timestamp DESC LIMIT 50'
    ).all(m.id) as any[];

    const total = heartbeats.length;
    const up = heartbeats.filter((h: any) => h.status === 'up').length;
    const uptime = total > 0 ? ((up / total) * 100).toFixed(1) : '100.0';
    const latestRT = heartbeats[0]?.response_time || 0;

    return {
      id: m.id,
      name: m.name,
      url: m.url,
      status: m.status,
      uptime: Number(uptime),
      responseTime: latestRT,
      heartbeats: heartbeats.slice(0, 30).reverse(),
    };
  });

  const settings = db.prepare('SELECT * FROM settings').all() as { key: string; value: string }[];
  const settingsMap: Record<string, string> = {};
  for (const s of settings) settingsMap[s.key] = s.value;

  res.json({
    systems: systemsWithHeartbeats,
    incidents,
    monitors: monitorPublicData,
    settings: {
      brand_name: settingsMap.brand_name || 'Madex Status',
      logo: settingsMap.logo || '',
      icon: settingsMap.icon || '',
      favicon: settingsMap.favicon || '',
    },
  });
});

// ──────────────────────────────────── DASHBOARD STATS ────────────────────────────────────

router.get('/dashboard/stats', authMiddleware, (_req: Request, res: Response) => {
  const monitors = db.prepare('SELECT * FROM monitors').all() as any[];
  const totalMonitors = monitors.length;
  const upMonitors = monitors.filter((m: any) => m.status === 'up').length;
  const downMonitors = monitors.filter((m: any) => m.status === 'down').length;
  const pendingMonitors = monitors.filter((m: any) => m.status === 'pending').length;

  const activeIncidents = db.prepare('SELECT COUNT(*) as count FROM incidents WHERE status = "active"').get() as any;

  // Average response time across all monitors (last hour)
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const avgRT = db.prepare('SELECT AVG(response_time) as avg FROM heartbeats WHERE status = "up" AND timestamp >= ?').get(hourAgo) as any;

  // Get recent heartbeats for chart
  const recentHeartbeats = db.prepare(`
    SELECT m.name as monitor_name, h.response_time, h.status, h.timestamp
    FROM heartbeats h
    JOIN monitors m ON h.monitor_id = m.id
    WHERE h.timestamp >= ?
    ORDER BY h.timestamp DESC
    LIMIT 200
  `).all(hourAgo);

  res.json({
    totalMonitors,
    upMonitors,
    downMonitors,
    pendingMonitors,
    activeIncidents: activeIncidents.count,
    avgResponseTime: Math.round(avgRT.avg || 0),
    recentHeartbeats,
  });
});

export default router;
