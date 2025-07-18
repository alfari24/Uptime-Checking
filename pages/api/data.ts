import { NextRequest } from 'next/server'
import { getOrInitMonitoringService } from '@/lib/monitoring-service'

export const runtime = 'edge'

export default async function handler(req: NextRequest): Promise<Response> {
  try {
    // In the consolidated approach, we access the monitoring service directly
    // instead of making an HTTP request to another server
    const service = getOrInitMonitoringService()
    const data = service.getStatus()

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  } catch (error) {
    console.error('Error fetching status:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch status data' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}
