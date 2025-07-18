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
      // Get the monitor history, or use mock data if the method is not available
    let history;
    
    if (typeof service.getMonitorHistory === 'function') {
      history = service.getMonitorHistory(monitorId, hours);
      
      // Add detailed logging to help diagnose issues
      console.log(`API: Monitor history for ${monitorId}:`);
      console.log(`- Latency points: ${history.latency?.length || 0}`);
      console.log(`- Incidents: ${history.incidents?.length || 0}`);
        // Log a sample of incidents if any exist
      if (history.incidents && history.incidents.length > 0) {
        console.log('- Recent incidents:', history.incidents.slice(0, 3).map((inc: any) => ({
          id: inc.id,
          start: new Date(inc.start * 1000).toLocaleString(),
          end: inc.end ? new Date(inc.end * 1000).toLocaleString() : 'ongoing',
          error: inc.error
        })));
      } else {
        console.log('- No incidents found');
      }
    } else {
      console.log('getMonitorHistory method not found, using mock data');
      // Create some mock history data
      const currentTime = Math.floor(Date.now() / 1000);
      const mockHistory = {
        latency: Array.from({ length: 12 }).map((_, i) => ({
          location: 'dev',
          ping: Math.floor(Math.random() * 100) + 50,  // Random ping between 50-150ms
          timestamp: currentTime - (i * 3600)  // One data point per hour
        })),
        incidents: []
      };
      history = mockHistory;
    }
    
    console.log(`API: Returning ${history.latency?.length || 0} latency points for ${monitorId}`);
    
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
