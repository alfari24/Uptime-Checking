import { NextRequest } from 'next/server'

export const runtime = 'edge'

export default async function handler(req: NextRequest): Promise<Response> {
  try {
    // Get the API server URL from environment or use default
    const apiServer = process.env.STATUS_API_URL || 'http://localhost:3001'
    
    // Fetch status from the Node.js server
    const response = await fetch(`${apiServer}/api/status`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`API server responded with ${response.status}`)
    }

    const data = await response.json()
    
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
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
