import { ConfigManager } from '@/server/src/config';
import { StatusDatabase } from '@/server/src/database';
import { MonitoringService } from '@/server/src/monitoring';

// Global variable to maintain singleton instance
let monitoringService: MonitoringService;
let database: StatusDatabase;

/**
 * Get or initialize the monitoring service singleton
 */
export function getOrInitMonitoringService(): MonitoringService {  if (!monitoringService) {
    console.log('Initializing monitoring service...');
    try {
      // Use the shared config manager
      const configManager = getConfigManager();
      
      // Check if the database file exists, create directory if needed
      const dbConfig = configManager.getDatabaseConfig();
      const dbPath = dbConfig.path;
      const dbDir = require('path').dirname(dbPath);
      
      if (!require('fs').existsSync(dbDir)) {
        console.log(`Creating database directory: ${dbDir}`);
        require('fs').mkdirSync(dbDir, { recursive: true });
      }
      
      // Initialize database
      database = new StatusDatabase(dbPath);
      
      // Create and start monitoring service
      monitoringService = new MonitoringService(configManager, database);
      monitoringService.start();
      
      // Handle cleanup when the process exits
      process.on('SIGTERM', () => {
        console.log('Received SIGTERM, shutting down gracefully...');
        if (monitoringService) monitoringService.stop();
        if (database) database.close();
        process.exit(0);
      });
      
      process.on('SIGINT', () => {
        console.log('Received SIGINT, shutting down gracefully...');
        if (monitoringService) monitoringService.stop();
        if (database) database.close();
        process.exit(0);
      });
      
      console.log(`Started monitoring service with ${configManager.getServerConfig().checkInterval} minute interval`);
    } catch (error) {
      console.error('Failed to initialize monitoring service:', error);
      throw error;
    }
  }
  return monitoringService;
}

// Singleton untuk ConfigManager
let configManager: ConfigManager;

// Export a shared ConfigManager instance
export function getConfigManager(): ConfigManager {
  if (!configManager) {
    configManager = new ConfigManager();
  }
  return configManager;
}
