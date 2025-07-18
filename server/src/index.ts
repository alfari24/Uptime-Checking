import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { ConfigManager } from './config';
import { StatusDatabase } from './database';
import { MonitoringService } from './monitoring';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*', // Allow requests from any origin
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Requested-With'],
  maxAge: 86400, // Cache preflight requests for 1 day (in seconds)
}));

// Initialize services
const configManager = new ConfigManager();
const database = new StatusDatabase(configManager.getDatabaseConfig().path);
const monitoringService = new MonitoringService(configManager, database);

// API Routes
app.get('/api/status', (c) => {
  try {
    const status = monitoringService.getStatus();
    return c.json(status);
  } catch (error) {
    console.error('Error getting status:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/monitors/:id/history', (c) => {
  try {
    const monitorId = c.req.param('id');
    const hours = parseInt(c.req.query('hours') || '12');
    
    const history = monitoringService.getMonitorHistory(monitorId, hours);
    console.log(`API: Returning ${history.latency.length} latency points for ${monitorId}`);
    
    // Ensure latency data is sorted by timestamp for the frontend
    if (history.latency && history.latency.length > 0) {
      history.latency.sort((a: any, b: any) => a.timestamp - b.timestamp);
    }
    
    return c.json(history);
  } catch (error) {
    console.error('Error getting monitor history:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/config', (c) => {
  try {
    const config = configManager.getConfig();
    
    // Return public config only (exclude sensitive data)
    return c.json({
      title: config.title,
      monitors: config.monitors.map(monitor => ({
        id: monitor.id,
        name: monitor.name,
        target: monitor.target,
        tooltip: monitor.tooltip,
        statusPageLink: monitor.statusPageLink,
        hideLatencyChart: monitor.hideLatencyChart,
      })),
    });
  } catch (error) {
    console.error('Error getting config:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  monitoringService.stop();
  database.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  monitoringService.stop();
  database.close();
  process.exit(0);
});

// Start server
const startServer = () => {
  const serverConfig = configManager.getServerConfig();
  
  console.log(`Starting Status Monitor Server v1.0.0`);
  console.log(`Config: ${JSON.stringify(serverConfig, null, 2)}`);
  console.log(`Monitors: ${configManager.getMonitors().length} configured`);
  
  // Start monitoring service
  monitoringService.start();
  
  // Start HTTP server
  const port = serverConfig.port;
  const host = serverConfig.host;
  
  console.log(`Server running on http://${host}:${port}`);
  
  serve({
    fetch: app.fetch,
    port,
    hostname: host,
  });
};

export { app, startServer };
export default app;