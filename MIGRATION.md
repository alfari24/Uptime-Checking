# Migration from Original UptimeFlare

This document provides guidance for migrating from the original Cloudflare-based UptimeFlare to the self-hosted version.

## Key Differences

### Architecture Changes
- **Runtime**: Cloudflare Workers → Node.js with Hono
- **Database**: Cloudflare KV → SQLite
- **Configuration**: `uptime.config.ts` → `status-config.yaml`
- **Deployment**: Wrangler → Docker/Manual
- **Monitoring**: Geo-distributed → Single location

### Removed Features
- **Cloudflare Durable Objects**: No longer needed
- **checkProxy**: Removed geo-specific checking
- **Cloudflare-specific APIs**: Replaced with standard Node.js APIs
- **Wrangler deployment**: Replaced with Docker

## Migration Steps

### 1. Export Current Configuration

From your existing `uptime.config.ts`, extract the monitor configurations:

```typescript
// Old format (uptime.config.ts)
const workerConfig: WorkerConfig = {
  monitors: [
    {
      id: 'example-site',
      name: 'Example Site',
      method: 'GET',
      target: 'https://example.com',
      expectedCodes: [200],
      timeout: 10000,
    }
  ]
}
```

### 2. Convert to New YAML Format

Create a new `status-config.yaml` file:

```yaml
# New format (status-config.yaml)
title: "My Status Page"
monitors:
  - id: "example-site"
    name: "Example Site"
    method: "GET"
    target: "https://example.com"
    expectedCodes: [200]
    timeout: 10000
```

### 3. Update Frontend Configuration

Create a new `frontend.config.ts` file:

```typescript
// Extract only page configuration
const pageConfig: PageConfig = {
  title: "My Status Page",
  links: [
    { link: 'https://github.com/user', label: 'GitHub' },
  ],
  group: {
    'Web Services': ['example-site'],
  },
}

const maintenances: MaintenanceConfig[] = []

export { pageConfig, maintenances }
```

### 4. Migrate Notifications

Update notification configuration:

```yaml
# Old: workerConfig.notification in uptime.config.ts
notification:
  appriseApiServer: "https://apprise.example.com/notify"
  recipientUrl: "tgram://bottoken/ChatID"
  timeZone: "Asia/Shanghai"
  gracePeriod: 5
```

### 5. Update Custom Callbacks

If you had custom callbacks in your `uptime.config.ts`, you'll need to modify them:

**Old (Cloudflare Worker):**
```typescript
callbacks: {
  onStatusChange: async (env, monitor, isUp, timeIncidentStart, timeNow, reason) => {
    // Cloudflare-specific code
  }
}
```

**New (Self-hosted):**
For custom callbacks, you'll need to modify the server code directly or use the notification system.

### 6. Environment Variables

Set up environment variables:

```env
# Server configuration
PORT=3001
HOST=0.0.0.0
CHECK_INTERVAL=1

# Database
DB_PATH=./status.db

# Frontend
STATUS_API_URL=http://localhost:3001
```

### 7. Deploy

Choose your deployment method:

**Docker Compose (Recommended):**
```bash
docker-compose up -d
```

**Manual:**
```bash
npm install
npm run build
npm run start
```

## Feature Parity

### Available in Both Versions
- ✅ HTTP/HTTPS monitoring
- ✅ TCP port monitoring
- ✅ Custom headers and body
- ✅ Response keyword checking
- ✅ Expected status codes
- ✅ Notification support
- ✅ Status page UI
- ✅ Historical data

### Only in Original UptimeFlare
- ❌ Geo-distributed checking
- ❌ Cloudflare edge locations
- ❌ Durable Objects
- ❌ Wrangler deployment
- ❌ Cloudflare KV

### Only in Self-Hosted Version
- ✅ Full control over infrastructure
- ✅ Local data storage
- ✅ Docker deployment
- ✅ YAML configuration
- ✅ Local database access

## Common Issues

### 1. Missing Monitors
Make sure all monitor IDs are correctly migrated from the old config.

### 2. Notification Not Working
Verify your Apprise configuration and test the notification URL.

### 3. Database Issues
Ensure the database path is writable and the directory exists.

### 4. Network Connectivity
Since monitoring runs from a single location, ensure your server can reach all monitored endpoints.

## Rollback Plan

If you need to rollback to the original UptimeFlare:

1. Keep your original `uptime.config.ts` file
2. Redeploy using Wrangler
3. Update DNS if needed
4. Export data from SQLite if you need to preserve history

## Support

For migration assistance:
1. Check the [self-hosted setup guide](README_SELFHOSTED.md)
2. Review the [troubleshooting section](README_SELFHOSTED.md#troubleshooting)
3. Create an issue if you encounter problems