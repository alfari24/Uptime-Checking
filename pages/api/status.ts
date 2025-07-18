import type { NextApiRequest, NextApiResponse } from 'next';
import { getOrInitMonitoringService } from '@/lib/monitoring-service';
import { MonitoringService } from '@/server/src/monitoring';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  let service: MonitoringService;
  
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Get or initialize the monitoring service
    service = getOrInitMonitoringService();
      // Get the current status, or create a mock status if getStatus is not available
    let status;
    
    if (typeof service.getStatus === 'function') {
      status = service.getStatus();
    } else {
      console.log('getStatus method not found, using mock status');
      status = {
        up: 0,
        down: 0,
        updatedAt: Math.floor(Date.now() / 1000),
        monitors: {}
      };
    }
    
    if (!status || !status.monitors) {
      throw new Error('Monitor state is not defined');
    }
    
    // Return the status
    res.status(200).json(status);
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      updatedAt: new Date().toISOString(),
      monitors: {}
    });
  }
}
