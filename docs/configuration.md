# Status Monitor Configuration Guide

This guide explains how to configure your Status Monitor application using the centralized YAML configuration file.

## Configuration Overview

All configuration for the Status Monitor application is now centralized in a single YAML file:
`server/status-config.yaml`

This includes:
- Application title
- Server settings
- Database settings
- Monitor definitions
- Notification settings
- Frontend configuration (links, groups, maintenance)

## Configuration Structure

### Basic Configuration

```yaml
title: "Your Status Page Title"

server:
  port: 3001
  host: "0.0.0.0"
  checkInterval: 1  # minutes

database:
  path: "./status.db"
  cleanupDays: 90
```

### Monitors Configuration

Monitors are defined as a list under the `monitors` key:

```yaml
monitors:
  - id: "website"
    name: "Company Website"
    method: "GET"
    target: "https://example.com"
    tooltip: "Our primary website"
    statusPageLink: "https://status.example.com"
    hideLatencyChart: false
    
  - id: "api"
    name: "REST API"
    method: "GET"
    target: "https://api.example.com/health"
    expectedCodes: [200, 204]
    timeout: 5000  # milliseconds
```

### Notification Configuration

```yaml
notification:
  appriseApiServer: "https://apprise.example.com/notify"
  recipientUrl: "tgram://bottoken/ChatID"
  timeZone: "UTC"
  gracePeriod: 5  # minutes
  skipNotificationIds: ["test-monitor"]
```

### Frontend Configuration

#### Navigation Links

Add links to be displayed in the header of your status page:

```yaml
links:
  - link: "https://github.com/yourusername"
    label: "GitHub"
  - link: "https://example.com"
    label: "Website"
  - link: "mailto:support@example.com"
    label: "Contact Support"
    highlight: true
```

#### Monitor Groups

Group your monitors for better organization on the frontend:

```yaml
group:
  "🌐 Websites": ["website", "blog", "docs"]
  "🔧 APIs": ["api", "auth-service", "payment-api"]
  "🖥️ Infrastructure": ["database", "cache", "queue"]
```

#### Maintenance Information

Configure scheduled maintenance periods:

```yaml
maintenances:
  - monitors: ["api", "website"]
    title: "System Upgrade"
    body: "Scheduled maintenance for server upgrades"
    start: "2023-12-01T00:00:00Z"
    end: "2023-12-01T02:00:00Z"
    color: "blue"
```

## Environment Variables

Environment variables are still supported but are only used as fallbacks if the YAML configuration is missing or incomplete:

- `CONFIG_FILE`: Path to your YAML config file
- `APP_TITLE`: Application title
- `PORT`: Server port
- `HOST`: Server host
- `CHECK_INTERVAL`: Check interval in minutes
- `DB_PATH`: Path to the database file
- `CLEANUP_DAYS`: Number of days to keep historical data

## Best Practices

1. **Version Control**: Keep your configuration file in version control for tracking changes.
2. **Environment-Specific Configs**: Create multiple YAML files for different environments.
3. **Comments**: Use YAML comments to document your configuration options.
4. **Regular Backups**: Back up your configuration file regularly.

## Examples

### Simple Configuration
```yaml
title: "Simple Status Monitor"
monitors:
  - id: "website"
    name: "Website"
    method: "GET"
    target: "https://example.com"
```

### Complete Configuration
For a complete example, refer to the default `server/status-config.yaml` file in your application.
