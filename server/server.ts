import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './database';
import apiRouter from './routes/api';
import { startAllMonitors } from './monitor-engine';
import { startProviderSync } from './provider-status';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3001;
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Initialize database
initDatabase();
console.log('[Database] SQLite initialized');

// API routes
app.use('/api', apiRouter);

// Serve static frontend in production
const distPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('{*path}', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Madex Status running on http://0.0.0.0:${PORT}`);
  // Start all active monitors
  startAllMonitors();
  // Start provider status sync (every 2 minutes)
  startProviderSync();
});
