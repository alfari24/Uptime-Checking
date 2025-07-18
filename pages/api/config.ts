import type { NextApiRequest, NextApiResponse } from 'next';
import { getOrInitMonitoringService, getConfigManager } from '@/lib/monitoring-service';

export default function handler(req: NextApiRequest, res: NextApiResponse) {  
  try {
    // Get configuration manager directly, bypassing the monitoring service in development
    const configManager = getConfigManager();
    
    // Still try to initialize monitoring service, but it will handle errors internally
    try {
      getOrInitMonitoringService();
    } catch (initError) {
      console.warn('Monitoring service initialization failed, continuing with config only');
    }
    
    const config = configManager.getConfig();
    // Log config values for debugging
    console.log('API: Retrieved config title:', config.title);
    console.log('API: Retrieved config links:', JSON.stringify(config.links, null, 2));

    // Process the group data to ensure it's in the correct format
    if (config.group && typeof config.group === 'object') {
      // Iterate through each group entry to ensure correct structure
      Object.entries(config.group).forEach(([key, value]) => {
        console.log(`API: Processing group ${key}, value type: ${typeof value}, isArray: ${Array.isArray(value)}`);
      });
    } else {
      console.log('API: Group is undefined or null');
    }
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');    
    
    // Create response object
    const responseObj = {
      title: config.title,
      monitors: config.monitors.map(monitor => ({
        id: monitor.id,
        name: monitor.name,
        target: monitor.target,
        tooltip: monitor.tooltip,
        statusPageLink: monitor.statusPageLink,
        hideLatencyChart: monitor.hideLatencyChart,
      })),
      // Include frontend configuration with proper fallbacks
      links: config.links || [],
      group: config.group || {},
      maintenances: config.maintenances || [],
      
      // Set a timestamp for cache busting
      timestamp: new Date().toISOString()
    };
    
    // Log the final response object
    console.log('API: Sending response with group:', responseObj.group);
    
    res.status(200).json(responseObj);
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
