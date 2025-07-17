import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import { config } from 'dotenv';

// Load environment variables
config();

export interface MonitorConfig {
  id: string;
  name: string;
  method: string;
  target: string;
  tooltip?: string;
  statusPageLink?: string;
  hideLatencyChart?: boolean;
  expectedCodes?: number[];
  timeout?: number;
  headers?: { [key: string]: string | number };
  body?: string;
  responseKeyword?: string;
  responseForbiddenKeyword?: string;
}

export interface NotificationConfig {
  appriseApiServer?: string;
  recipientUrl?: string;
  timeZone?: string;
  gracePeriod?: number;
  skipNotificationIds?: string[];
}

export interface AppConfig {
  title: string;
  monitors: MonitorConfig[];
  notification?: NotificationConfig;
  server: {
    port: number;
    host: string;
    checkInterval: number; // in minutes
  };
  database: {
    path: string;
    cleanupDays: number;
  };
}

export class ConfigManager {
  private config: AppConfig;

  constructor(configPath?: string) {
    this.config = this.loadConfig(configPath);
  }

  private loadConfig(configPath?: string): AppConfig {
    // Try to load from YAML file first
    if (configPath || process.env.CONFIG_FILE) {
      const path = configPath || process.env.CONFIG_FILE!;
      try {
        const yamlContent = readFileSync(path, 'utf8');
        const yamlConfig = parseYaml(yamlContent) as Partial<AppConfig>;
        return this.mergeWithDefaults(yamlConfig);
      } catch (error) {
        console.warn(`Failed to load config from ${path}: ${error}`);
      }
    }

    // Fall back to environment variables
    return this.loadFromEnv();
  }

  private loadFromEnv(): AppConfig {
    const defaultConfig: AppConfig = {
      title: process.env.APP_TITLE || 'Status Monitor',
      monitors: [],
      server: {
        port: parseInt(process.env.PORT || '3001'),
        host: process.env.HOST || '0.0.0.0',
        checkInterval: parseInt(process.env.CHECK_INTERVAL || '1'),
      },
      database: {
        path: process.env.DB_PATH || join(process.cwd(), 'status.db'),
        cleanupDays: parseInt(process.env.CLEANUP_DAYS || '90'),
      },
    };

    // Load monitors from environment (this would be a fallback)
    // In practice, monitors should be defined in the YAML config
    try {
      const monitorsEnv = process.env.MONITORS;
      if (monitorsEnv) {
        defaultConfig.monitors = JSON.parse(monitorsEnv);
      }
    } catch (error) {
      console.warn('Failed to parse MONITORS from environment:', error);
    }

    // Load notification config
    if (process.env.APPRISE_API_SERVER || process.env.RECIPIENT_URL) {
      defaultConfig.notification = {
        appriseApiServer: process.env.APPRISE_API_SERVER,
        recipientUrl: process.env.RECIPIENT_URL,
        timeZone: process.env.TIME_ZONE || 'Etc/GMT',
        gracePeriod: parseInt(process.env.GRACE_PERIOD || '0'),
        skipNotificationIds: process.env.SKIP_NOTIFICATION_IDS ? 
          process.env.SKIP_NOTIFICATION_IDS.split(',') : [],
      };
    }

    return defaultConfig;
  }

  private mergeWithDefaults(yamlConfig: Partial<AppConfig>): AppConfig {
    const defaults = this.loadFromEnv();
    
    return {
      title: yamlConfig.title || defaults.title,
      monitors: yamlConfig.monitors || defaults.monitors,
      notification: yamlConfig.notification || defaults.notification,
      server: {
        ...defaults.server,
        ...yamlConfig.server,
      },
      database: {
        ...defaults.database,
        ...yamlConfig.database,
      },
    };
  }

  getConfig(): AppConfig {
    return this.config;
  }

  getMonitors(): MonitorConfig[] {
    return this.config.monitors;
  }

  getNotificationConfig(): NotificationConfig | undefined {
    return this.config.notification;
  }

  getServerConfig() {
    return this.config.server;
  }

  getDatabaseConfig() {
    return this.config.database;
  }
}

export default ConfigManager;