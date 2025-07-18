# Self-Hosted Status Monitor

A self-hosted status monitoring application built with Node.js and Next.js, converted from the original Cloudflare-based UptimeFlare.

## Features

- **Real-time monitoring**: HTTP/HTTPS endpoints and TCP ports
- **SQLite database**: Local file-based storage for monitor data
- **Beautiful UI**: Modern React-based status page
- **Notifications**: Support for Apprise notifications
- **Docker support**: Easy deployment with Docker and Docker Compose (Un Tested)
- **Configurable**: YAML-based configuration for monitors
- **Consolidated deployment**: Single application deployment option with unified server/frontend

## Deployment Options

This project can be deployed in two ways:
1. **Traditional mode**: Separate frontend and backend servers (original approach)
2. **Consolidated mode**: Single application combining frontend and backend (recommended)

For consolidated deployment instructions, see [CONSOLIDATED_README.md](./CONSOLIDATED_README.md).

## Preview
<img width="2618" height="2004" alt="image" src="https://github.com/user-attachments/assets/15e14891-4f1f-4bd2-b5cd-b96c0502e7f5" />
<img width="2636" height="1998" alt="image" src="https://github.com/user-attachments/assets/93488029-78a5-48d0-bb9c-c0f2003fbbae" />
<img width="2642" height="1996" alt="image" src="https://github.com/user-attachments/assets/0d5420f7-bcd5-459c-81c3-8341a727c94e" />


## Quick Start

### Option 1: Docker Compose (Un Tested)

1. Clone the repository:
```bash
git clone https://github.com/alfari24/status.git
cd status
```

2. Configure your monitors by editing `status-config.yaml`:
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

3. Start the application:
```bash
docker-compose up -d
```

4. Access your status page at `http://localhost:3000`

### Option 2: Manual Installation (Recommended)

1. **Prerequisites:**
   - Node.js 20 (Tested on v20.19.4) 
   - npm

2. **Install dependencies:**
```bash
npm install
cd server && npm install && cd ..
```

3. **Configure the application:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Build the application:**
```bash
npm run build
```

5. **Start the services:**
```bash
# Start the monitoring server
npm run start:server &

# Start the frontend
npm run start:frontend
```

6. Access your status page at `http://localhost:3000`

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server configuration
PORT=3001
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

# Frontend API URL
STATUS_API_URL=http://localhost:3001
```

### YAML Configuration

Edit a `server/status-config.yaml` file:

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

1. Start the monitoring server:
```bash
npm run dev:server
```

2. In another terminal, start the frontend:
```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

This will build both the server and frontend applications.

## Notifications

The application supports notifications via [Apprise](https://github.com/caronc/apprise). Configure your notification settings in the YAML file or environment variables.

Example notification URLs:
- Discord: `discord://webhook_id/webhook_token`
- Telegram: `tgram://bottoken/ChatID`
- Email: `mailto://user:pass@domain.com`

## Docker Deployment

### Using Docker Compose

```bash
docker-compose up -d
```

### Using Docker directly

```bash
docker build -t status-monitor .
docker run -d -p 3000:3000 -p 3001:3001 \
  -v $(pwd)/status-config.yaml:/app/status-config.yaml \
  -v $(pwd)/data:/app/data \
  status-monitor
```

## Upgrading from UptimeFlare

This self-hosted version is designed to be a drop-in replacement for UptimeFlare. The main differences:

1. **Configuration**: Moved from `uptime.config.ts` to `status-config.yaml`
2. **Storage**: Uses SQLite instead of Cloudflare KV
3. **Monitoring**: All checks run from the server location (no geo-distributed checking)
4. **Deployment**: Self-hosted instead of Cloudflare Workers

To migrate:

1. Export your monitor configurations from the original `uptime.config.ts`
2. Convert them to the new YAML format
3. Update any custom callbacks or notification settings
4. Deploy the new version

## Troubleshooting

### Common Issues

1. **Database connection errors**: Ensure the database path is writable
2. **Network timeouts**: Check firewall settings and DNS resolution
3. **Frontend not loading**: Verify the API server is running and accessible

### Logs

Check application logs:
```bash
docker-compose logs -f status-monitor
```

Or for manual installations:
```bash
# Server logs
npm run start:server

# Frontend logs  
npm run start:frontend
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project maintains the same license as the original UptimeFlare project.

## Support

For issues and questions:
1. Check the [GitHub issues](https://github.com/alfari24/status/issues)
2. Review the troubleshooting section
3. Create a new issue if needed

## Acknowledgments

Based on the original [UptimeFlare](https://github.com/lyc8503/UptimeFlare) project by lyc8503.
