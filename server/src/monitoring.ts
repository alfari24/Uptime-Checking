import * as cron from 'node-cron';
import { MonitorChecker, MonitorResult } from './monitor';
import { StatusDatabase } from './database';
import { ConfigManager, MonitorConfig } from './config';
import { NotificationManager } from './notification';

export class MonitoringService {
  private monitorChecker: MonitorChecker;
  private database: StatusDatabase;
  private configManager: ConfigManager;
  private notificationManager: NotificationManager | null = null;
  private isRunning = false;
  private cronJob: cron.ScheduledTask | null = null;

  constructor(configManager: ConfigManager, database: StatusDatabase) {
    this.configManager = configManager;
    this.database = database;
    this.monitorChecker = new MonitorChecker();
    
    const notificationConfig = configManager.getNotificationConfig();
    if (notificationConfig) {
      this.notificationManager = new NotificationManager(notificationConfig);
    }
  }

  start(): void {
    if (this.isRunning) {
      console.log('Monitoring service is already running');
      return;
    }

    const checkInterval = this.configManager.getServerConfig().checkInterval;
    console.log(`Starting monitoring service with ${checkInterval} minute interval`);

    // Schedule monitoring checks
    this.cronJob = cron.schedule(`*/${checkInterval} * * * *`, () => {
      this.runMonitoringCycle().catch(error => {
        console.error('Error in monitoring cycle:', error);
      });
    });

    // Run initial check
    this.runMonitoringCycle().catch(error => {
      console.error('Error in initial monitoring cycle:', error);
    });

    this.isRunning = true;
  }

  stop(): void {
    if (!this.isRunning) {
      console.log('Monitoring service is not running');
      return;
    }

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    this.isRunning = false;
    console.log('Monitoring service stopped');
  }

  private async runMonitoringCycle(): Promise<void> {
    console.log('Starting monitoring cycle...');
    
    const currentTime = Math.floor(Date.now() / 1000);
    const monitors = this.configManager.getMonitors();
    const notificationConfig = this.configManager.getNotificationConfig();
    
    let overallUp = 0;
    let overallDown = 0;
    let statusChanged = false;

    // Check each monitor
    for (const monitor of monitors) {
      console.log(`Checking ${monitor.name}...`);
      
      const result = await this.monitorChecker.checkMonitor(monitor);
      const monitorStatusChanged = await this.updateMonitorStatus(monitor, result, currentTime);
      
      // Update counters
      if (result.up) {
        overallUp++;
      } else {
        overallDown++;
      }
      
      statusChanged = statusChanged || monitorStatusChanged;
    }

    // Update overall state
    const state = this.database.getMonitorState();
    const shouldUpdate = statusChanged || 
      (currentTime - state.lastUpdate >= (this.configManager.getServerConfig().checkInterval * 60 - 10));

    if (shouldUpdate) {
      console.log('Updating monitor state...');
      this.database.updateMonitorState({
        lastUpdate: currentTime,
        overallUp,
        overallDown,
      });
    } else {
      console.log('Skipping state update due to cooldown period');
    }

    // Cleanup old data periodically (every 24 hours)
    if (currentTime % (24 * 60 * 60) < (this.configManager.getServerConfig().checkInterval * 60)) {
      console.log('Cleaning up old data...');
      this.database.cleanupOldData(this.configManager.getDatabaseConfig().cleanupDays);
    }

    console.log(`Monitoring cycle completed. Overall: ${overallUp} up, ${overallDown} down`);
  }

  private async updateMonitorStatus(
    monitor: MonitorConfig,
    result: MonitorResult,
    currentTime: number
  ): Promise<boolean> {
    let statusChanged = false;
    
    // Add latency record
    this.database.addLatency({
      monitorId: monitor.id,
      location: 'local', // Since we're self-hosted, all checks are local
      ping: result.ping,
      timestamp: currentTime,
    });

    // Get or create latest incident
    let latestIncident = this.database.getLatestIncident(monitor.id);
    
    // Create dummy incident if none exists (for initial setup)
    if (!latestIncident) {
      this.database.createIncident({
        monitorId: monitor.id,
        start: currentTime,
        end: currentTime,
        error: 'dummy',
      });
      latestIncident = this.database.getLatestIncident(monitor.id);
    }

    if (!latestIncident) {
      console.error(`Failed to create or retrieve incident for monitor ${monitor.id}`);
      return false;
    }

    if (result.up) {
      // Monitor is up - close any open incident
      if (latestIncident.end === null) {
        this.database.updateIncident(latestIncident.id, { end: currentTime });
        statusChanged = true;
        
        // Send recovery notification
        await this.sendNotificationIfNeeded(
          monitor,
          true,
          latestIncident.start,
          currentTime,
          'OK'
        );
      }
    } else {
      // Monitor is down - open new incident or update existing
      if (latestIncident.end !== null) {
        // Create new incident
        this.database.createIncident({
          monitorId: monitor.id,
          start: currentTime,
          end: null,
          error: result.error,
        });
        statusChanged = true;
        
        // Send down notification
        await this.sendNotificationIfNeeded(
          monitor,
          false,
          currentTime,
          currentTime,
          result.error
        );
      } else if (latestIncident.error !== result.error) {
        // Update existing incident with new error
        this.database.updateIncident(latestIncident.id, { error: result.error });
        statusChanged = true;
      }
    }

    return statusChanged;
  }

  private async sendNotificationIfNeeded(
    monitor: MonitorConfig,
    isUp: boolean,
    timeIncidentStart: number,
    timeNow: number,
    reason: string
  ): Promise<void> {
    if (!this.notificationManager) {
      return;
    }

    const notificationConfig = this.configManager.getNotificationConfig();
    if (!notificationConfig) {
      return;
    }

    const gracePeriod = notificationConfig.gracePeriod || 0;
    const downDuration = timeNow - timeIncidentStart;

    // For up notifications, only send if we previously sent a down notification
    if (isUp && gracePeriod > 0 && downDuration < (gracePeriod + 1) * 60 - 30) {
      console.log(`Grace period (${gracePeriod}m) not met, skipping UP notification for ${monitor.name}`);
      return;
    }

    // For down notifications, respect grace period
    if (!isUp && gracePeriod > 0 && downDuration < gracePeriod * 60 - 30) {
      console.log(`Grace period (${gracePeriod}m) not met, skipping DOWN notification for ${monitor.name}`);
      return;
    }

    await this.notificationManager.sendStatusChangeNotification(
      monitor,
      isUp,
      timeIncidentStart,
      timeNow,
      reason
    );
  }

  // API method to get current status
  getStatus(): any {
    const state = this.database.getMonitorState();
    const monitors = this.configManager.getMonitors();
    const monitorStatuses: any = {};

    for (const monitor of monitors) {
      const latestIncident = this.database.getLatestIncident(monitor.id);
      const latestLatency = this.database.getLatestLatency(monitor.id);
      
      const isUp = latestIncident ? latestIncident.end !== null : true;
      
      monitorStatuses[monitor.id] = {
        up: isUp,
        latency: latestLatency ? latestLatency.ping : 0,
        location: latestLatency ? latestLatency.location : 'local',
        message: isUp ? 'OK' : (latestIncident ? latestIncident.error : 'Unknown'),
      };
    }

    return {
      up: state.overallUp,
      down: state.overallDown,
      updatedAt: state.lastUpdate,
      monitors: monitorStatuses,
    };
  }

  // Get historical data for a monitor
  getMonitorHistory(monitorId: string, hours: number = 12): any {
    const latencyData = this.database.getLatency(monitorId, hours);
    const incidents = this.database.getIncidents(monitorId);
    
    console.log(`Retrieved ${latencyData.length} latency records for ${monitorId}`);
    
    // Log a few sample points for debugging
    if (latencyData.length > 0) {
      console.log(`Sample data points for ${monitorId}:`, 
        latencyData.slice(0, 3).map(p => ({
          timestamp: p.timestamp,
          time: new Date(p.timestamp * 1000).toISOString(),
          ping: p.ping,
          location: p.location
        }))
      );
    }
    
    return {
      latency: latencyData,
      incidents: incidents.slice(0, 50), // Limit to last 50 incidents
    };
  }
}

export default MonitoringService;