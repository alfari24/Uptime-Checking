# Self-Hosted Status Monitor

A self-hosted status monitoring application built with Node.js and Next.js.

## Features

- **Real-time monitoring**: HTTP/HTTPS endpoints and TCP ports
- **SQLite database**: Local file-based storage for monitor data
- **Beautiful UI**: Modern React-based status page
- **Notifications**: Support for Apprise notifications
- **Configurable**: YAML-based configuration for all settings
- **Consolidated deployment**: Single application deployment with unified server/frontend

## Preview
Demo : [https://uptime.alfari.id/](https://uptime.alfari.id/)
<img width="2618" height="2004" alt="image" src="https://github.com/user-attachments/assets/15e14891-4f1f-4bd2-b5cd-b96c0502e7f5" />
<img width="2636" height="1998" alt="image" src="https://github.com/user-attachments/assets/93488029-78a5-48d0-bb9c-c0f2003fbbae" />
<img width="2642" height="1996" alt="image" src="https://github.com/user-attachments/assets/0d5420f7-bcd5-459c-81c3-8341a727c94e" />


## Quick Start

### Installation

1. **Prerequisites:**
   - Node.js 20 (Tested on v20.19.4) 
   - npm

2. **Clone the repository:**
```bash
git clone https://github.com/alfari24/status.git
cd status
```

3. **Install dependencies and build:**
```bash
npm install
npm run build:complete
```

4. **Configure your monitors by editing `server/status-config.yaml`:**
```yaml
title: "My Status Page"
monitors:
  - id: "my-website"
    name: "My Website"
    method: "GET"
    target: "https://example.com"
    expectedCodes: [200]
    timeout: 10000
```

5. **Start the application:**
```bash
npm run start
```

6. Access your status page at `http://localhost:17069`

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server configuration
PORT=17069
API_PORT=3001
HOST=0.0.0.0
CHECK_INTERVAL=1

# Database configuration
DB_PATH=./status.db
CLEANUP_DAYS=90

# Notification configuration (optional)
APPRISE_API_SERVER=https://apprise.example.com/notify
RECIPIENT_URL=tgram://bottoken/ChatID
TIME_ZONE=Asia/Shanghai
GRACE_PERIOD=5

# Application title
APP_TITLE=Status Monitor
```

### YAML Configuration

Edit the `server/status-config.yaml` file:

```yaml
title: "My Status Page"

server:
  port: 3001
  host: "0.0.0.0"
  checkInterval: 1 # minutes

database:
  path: "./status.db"
  cleanupDays: 90

notification:
  appriseApiServer: "https://apprise.example.com/notify"
  recipientUrl: "tgram://bottoken/ChatID"
  timeZone: "Asia/Shanghai"
  gracePeriod: 5 # minutes

# Frontend configuration
links:
  - link: "https://github.com/yourusername"
    label: "GitHub"
  - link: "https://example.com"
    label: "Website"
    highlight: true

# Monitor groups for frontend display
group:
  "🌐 Websites": ["website-id", "blog-id"]
  "🖥️ Servers": ["server-id", "database-id"]

# Maintenance information
maintenances:
  - monitors: ["website-id"]
    title: "Scheduled Maintenance"
    body: "System upgrade in progress"
    start: "2025-07-20T00:00:00Z"
    end: "2025-07-20T02:00:00Z"
    color: "blue"

monitors:
  - id: "example-website"
    name: "Example Website"
    method: "GET"
    target: "https://example.com"
    tooltip: "Main website"
    statusPageLink: "https://example.com"
    expectedCodes: [200]
    timeout: 10000
    
  - id: "example-api"
    name: "Example API"
    method: "GET"
    target: "https://api.example.com/health"
    headers:
      Authorization: "Bearer token"
    expectedCodes: [200]
    timeout: 5000
    
  - id: "example-tcp"
    name: "SSH Server"
    method: "TCP_PING"
    target: "example.com:22"
    timeout: 5000
```

### Monitor Configuration Options

- `id`: Unique identifier for the monitor
- `name`: Display name
- `method`: HTTP method (`GET`, `POST`, etc.) or `TCP_PING`
- `target`: URL or host:port to monitor
- `tooltip`: Optional tooltip text
- `statusPageLink`: Optional link when clicking the monitor
- `expectedCodes`: Array of expected HTTP status codes
- `timeout`: Request timeout in milliseconds
- `headers`: Optional HTTP headers
- `body`: Optional request body
- `responseKeyword`: Text that must be present in response
- `responseForbiddenKeyword`: Text that must NOT be present in response

## API Endpoints

The monitoring server exposes the following endpoints:

- `GET /api/status` - Current status of all monitors
- `GET /api/monitors/:id/history` - Historical data for a specific monitor
- `GET /api/config` - Public configuration data
- `GET /health` - Health check endpoint

## Development

### Running in Development Mode

Start the development server:

```bash
npm run dev
```



### Building for Production

```bash
npm run build:complete
```

This will build both the server and frontend applications.

## Notifications

The application supports notifications via [Apprise](https://github.com/caronc/apprise). Configure your notification settings in the YAML file or environment variables.

Example notification URLs:
- Discord: `discord://webhook_id/webhook_token`
- Telegram: `tgram://bottoken/ChatID`
- Email: `mailto://user:pass@domain.com`

For detailed configuration options, see [the configuration documentation](./docs/configuration.md).

## Troubleshooting

### Common Issues

1. **Database connection errors**: Ensure the database path is writable
2. **Network timeouts**: Check firewall settings and DNS resolution
3. **Frontend not loading**: Verify the API server is running and accessible

### Logs

Check application logs by running the server in the foreground:

```bash
npm run start
```

## License

This project maintains the same license as the original UptimeFlare project.

## Acknowledgments

Based on the original [UptimeFlare](https://github.com/lyc8503/UptimeFlare) project by lyc8503.
