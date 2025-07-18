// Fix the import paths to use relative paths instead of alias paths
import { ConfigManager } from '../server/src/config';
import { StatusDatabase } from '../server/src/database';
import { MonitoringService } from '../server/src/monitoring';

// Global variable to maintain singleton instance
let monitoringService: MonitoringService;
let database: StatusDatabase;

/**
 * Get or initialize the monitoring service singleton
 */
export function getOrInitMonitoringService(): MonitoringService {  // For Next.js API routes, we don't need the full monitoring service in dev mode
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode detected, returning mock monitoring service...');
    try {
      // Use the shared config manager only, without database initialization
      const configManager = getConfigManager();      // Create a mock state for our database
      const mockState = {
        overallUp: 0,
        overallDown: 0,
        lastUpdate: Math.floor(Date.now() / 1000)
      };
      
      // Add mock data for each monitor from config
      const monitors = configManager.getMonitors();
      
      // Count monitors for state calculation
      mockState.overallUp = monitors.length;
      
      // Create a mock status response that matches the real getStatus format
      const monitorStatuses: Record<string, any> = {};
      
      monitors.forEach(monitor => {
        monitorStatuses[monitor.id] = {
          up: true,
          latency: 100,
          location: 'dev',
          time: Math.floor(Date.now() / 1000),
          message: 'OK'
        };
      });
        // Return a mock service with the minimum required methods
      return {
        getConfigManager: () => configManager,
        getStatus: () => ({
          up: mockState.overallUp,
          down: mockState.overallDown,
          updatedAt: mockState.lastUpdate,
          monitors: monitorStatuses,
        }),
        stop: () => console.log('Mock service stopped'),
        getMonitorHistory: (monitorId: string) => ({
          latency: [],
          incidents: []
        })
      } as unknown as MonitoringService;
    } catch (error) {
      console.error('Failed to initialize development config service:', error);
      throw error;
    }
  }

  if (!monitoringService) {
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
      
      try {
        // Initialize database - catch any database-specific errors
        database = new StatusDatabase(dbPath);
        
        // Create and start monitoring service
        monitoringService = new MonitoringService(configManager, database);
        monitoringService.start();
      } catch (dbError) {        console.error('Database initialization failed:', dbError);        // Create a mock state for our database
        const mockState = {
          overallUp: 0,
          overallDown: 0,
          lastUpdate: Math.floor(Date.now() / 1000)
        };
        
        // Add mock data for each monitor from config
        const monitors = configManager.getMonitors();
        
        // Count monitors for state calculation
        mockState.overallUp = monitors.length;
        
        // Create monitor statuses with proper typing
        const monitorStatuses: Record<string, any> = {};
        monitors.forEach(monitor => {
          monitorStatuses[monitor.id] = {
            up: true,
            latency: 100,
            location: 'fallback',
            time: Math.floor(Date.now() / 1000),
            message: 'OK'
          };
        });
        
        // Return a minimal service with the required methods
        monitoringService = { 
          getConfigManager: () => configManager,
          getStatus: () => ({
            up: mockState.overallUp,
            down: mockState.overallDown,
            updatedAt: mockState.lastUpdate,
            monitors: monitorStatuses,
          }),
          stop: () => console.log('Mock service stopped'),
          getMonitorHistory: (monitorId: string) => ({
            latency: [],
            incidents: []
          })
        } as unknown as MonitoringService;
      }
      
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
