import type { NextApiRequest, NextApiResponse } from 'next';
import { getOrInitMonitoringService } from '@/lib/monitoring-service';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Get the monitor ID from the path
    const monitorId = req.query.id as string;
    
    if (!monitorId) {
      res.status(400).json({ error: 'Missing monitor ID' });
      return;
    }
    
    // Get hours from query parameter, default to 12
    const hours = parseInt(req.query.hours as string || '12');
    
    // Get or initialize the monitoring service
    const service = getOrInitMonitoringService();
    
    // Get the monitor history
    const history = service.getMonitorHistory(monitorId, hours);
    console.log(`API: Returning ${history.latency.length} latency points for ${monitorId}`);
    
    // Ensure latency data is sorted by timestamp for the frontend
    if (history.latency && history.latency.length > 0) {
      history.latency.sort((a: any, b: any) => a.timestamp - b.timestamp);
    }
    
    res.status(200).json(history);
  } catch (error) {
    console.error('Error getting monitor history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
