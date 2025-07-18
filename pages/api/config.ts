import type { NextApiRequest, NextApiResponse } from 'next';
import { getOrInitMonitoringService, getConfigManager } from '@/lib/monitoring-service';

export default function handler(req: NextApiRequest, res: NextApiResponse) {  try {
    // Get or initialize the monitoring service (this ensures monitoring is running)
    getOrInitMonitoringService();
    const configManager = getConfigManager();
    
    const config = configManager.getConfig();
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');    // Return public config only (exclude sensitive data)
    res.status(200).json({
      title: config.title,
      monitors: config.monitors.map(monitor => ({
        id: monitor.id,
        name: monitor.name,
        target: monitor.target,
        tooltip: monitor.tooltip,
        statusPageLink: monitor.statusPageLink,
        hideLatencyChart: monitor.hideLatencyChart,
      })),
      // Include frontend configuration
      links: config.links || [],
      group: config.group || {},
      maintenances: config.maintenances || [],
      
      // Set a timestamp for cache busting
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
