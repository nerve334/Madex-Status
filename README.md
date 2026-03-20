# Madex Status

A self-hosted uptime monitoring and status page system built with React, Express, and SQLite.

## Features

- **Uptime Monitoring** — HTTP(S) monitoring with configurable intervals, timeouts, retries, and keyword checks
- **Dashboard** — Real-time overview of all monitors with uptime percentages, response times, and heartbeat charts
- **Public Status Page** — Shareable status page showing system health, active incidents, and monitored services
- **Incident Management** — Create, update, and resolve incidents with timeline updates
- **Discord Notifications** — Webhook alerts for monitor up/down events and incident updates
- **Provider Status Sync** — Auto-sync system statuses from GoDaddy and Hostinger status pages
- **Export/Import** — Backup and restore monitors as JSON
- **Multi-User** — User management with role-based access
- **Dark Theme** — Clean dark UI with the Madex brand

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, React Router, Recharts, Tailwind CSS
- **Backend:** Express 5, better-sqlite3, bcryptjs, JWT
- **Database:** SQLite (file-based, zero config)

## Setup

**Prerequisites:** Node.js 18+

```bash
git clone https://github.com/nerve334/Madex-Status.git
cd Madex-Status
npm install
```

### Development

```bash
# Start backend (port 3001)
npm run server

# Start frontend dev server (port 3000) in another terminal
npm run dev
```

### Production

```bash
# Build frontend
npm run build

# Start server (serves API + built frontend)
npm run server
```

The app will guide you through initial setup (create admin account) on first launch.

## License

[MIT](LICENSE)
