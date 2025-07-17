import Head from 'next/head'
import { MonitorState, MonitorTarget } from '@/types/config'
import { maintenances, pageConfig } from '@/frontend.config'
import OverallStatus from '@/components/OverallStatus'
import MonitorList from '@/components/MonitorList'
import { Center, Text } from '@mantine/core'
import MonitorDetail from '@/components/MonitorDetail'
import Footer from '@/components/Footer'
import IncidentHistory from '@/components/IncidentHistory'
import { useEffect, useState } from 'react'

export const runtime = 'experimental-edge'

// Use fallback font if Google Fonts is not available
let inter = { className: 'font-sans' }
try {
  const { Inter } = require('next/font/google')
  inter = Inter({ subsets: ['latin'] })
} catch (e) {
  console.warn('Google Fonts not available, using fallback font')
}

export default function Home({
  state: stateStr,
  monitors,
}: {
  state: string
  monitors: MonitorTarget[]
  tooltip?: string
  statusPageLink?: string
}) {
  const [monitorId, setMonitorId] = useState<string>('');
  
  // Parse state
  let state;
  if (stateStr !== undefined) {
    state = JSON.parse(stateStr) as MonitorState;
  }
  
  // Get hash from URL on client side only
  useEffect(() => {
    setMonitorId(window.location.hash.substring(1));
    
    // Update when hash changes
    const handleHashChange = () => {
      setMonitorId(window.location.hash.substring(1));
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  // Show monitor detail view if a specific monitor is selected
  if (monitorId) {
    const monitor = monitors.find((m) => m.id === monitorId);
    
    if (!monitor || !state) {
      return (
        <Center>
          <Text fw={700}>Monitor with id {monitorId} not found!</Text>
        </Center>
      );
    }
    
    return (
      <div style={{ maxWidth: '1150px', width: '100%', margin: '0 auto' }}>
        <MonitorDetail monitor={monitor} state={state} />
        <Footer />
      </div>
    );
  }

  // Main view
  return (
    <>
      <Head>
        <title>{pageConfig.title}</title>
        <link rel="icon" href="https://weissowl.b-cdn.net/Images/Asset/logos.png" />
      </Head>
      <main className={inter.className}>
        {state === undefined ? (
          <Center>
            <Text fw={700}>
              Monitor State is not defined now, please check your worker&apos;s status and KV
              binding!
            </Text>
          </Center>
        ) : (
          <div>
            <OverallStatus state={state} monitors={monitors} maintenances={maintenances} />
            <MonitorList monitors={monitors} state={state} />
            <div style={{ maxWidth: '1150px', margin: '0 auto' }}>
              <IncidentHistory monitors={monitors} state={state} />
            </div>
          </div>
        )}
        <Footer />
      </main>
    </>
  )
}

export async function getServerSideProps() {
  try {
    // Get the API server URL from environment or use default
    const apiServer = process.env.STATUS_API_URL || 'http://localhost:3001'
    
    // Fetch status and configuration from the Node.js server
    const [statusResponse, configResponse] = await Promise.all([
      fetch(`${apiServer}/api/status`),
      fetch(`${apiServer}/api/config`)
    ])

    if (!statusResponse.ok || !configResponse.ok) {
      throw new Error('Failed to fetch data from API server')
    }

    const statusData = await statusResponse.json() as any
    const configData = await configResponse.json() as any

    // Transform the data to match the expected format
    // Initialize the state
    const state = {
      lastUpdate: statusData.updatedAt,
      // We'll calculate these values after processing all monitors
      overallUp: 0,
      overallDown: 0,
      incident: {} as any,
      latency: {} as any,
    }

    // Build incident and latency data for each monitor
    for (const monitor of configData.monitors) {
      const monitorStatus = statusData.monitors[monitor.id]
      if (monitorStatus) {
        try {
          // Fetch history data for this monitor
          const historyResponse = await fetch(`${apiServer}/api/monitors/${monitor.id}/history`);
          let historyData = null;
          
          if (historyResponse.ok) {
            historyData = await historyResponse.json();
            console.log(`Got history for ${monitor.id}: ${historyData.latency?.length} data points`);
          } else {
            console.log(`Failed to get history for ${monitor.id}: ${historyResponse.status}`);
          }
          
          // Create incident data structure from history
          const incidents = historyData?.incidents || [];
          state.incident[monitor.id] = incidents.length > 0 
            ? incidents.map((inc: any) => ({
                start: [inc.start],
                end: inc.end,
                error: [inc.error],
              }))
            : [{
                start: [statusData.updatedAt],
                end: monitorStatus.up ? statusData.updatedAt : undefined,
                error: [monitorStatus.message],
              }];
          
          // Create latency data structure with historical data if available
          const historyLatencyData = historyData?.latency || [];
          
          // Sort history data chronologically to ensure proper display
          const sortedHistoryData = [...historyLatencyData].sort((a, b) => a.timestamp - b.timestamp);
          
          console.log(`Processing sorted history for ${monitor.id}: ${sortedHistoryData.length} points`);
          
          // Make sure we have data to display
          state.latency[monitor.id] = {
            recent: sortedHistoryData.length > 0
              ? sortedHistoryData.map((item: any) => ({
                  loc: item.location,
                  ping: item.ping,
                  time: item.timestamp,
                }))
              : [{
                  loc: monitorStatus.location,
                  ping: monitorStatus.latency,
                  time: statusData.updatedAt,
                }],
            all: [], // We don't need this for now
          };
        } catch (error) {
          console.error(`Error getting history for ${monitor.id}:`, error);
          // Fallback to basic data
          state.incident[monitor.id] = [{
            start: [statusData.updatedAt],
            end: monitorStatus.up ? statusData.updatedAt : undefined,
            error: [monitorStatus.message],
          }];
          
          state.latency[monitor.id] = {
            recent: [{
              loc: monitorStatus.location,
              ping: monitorStatus.latency,
              time: statusData.updatedAt,
            }],
            all: [],
          };
        }
      }
    }

    // Recalculate the overall up/down counts based on actual monitor states
    const overallUp = configData.monitors.filter((monitor: any) => {
      if (!state.incident[monitor.id]) return true;  // No incident data = up
      const latestIncident = state.incident[monitor.id].slice(-1)[0];
      return latestIncident.end !== undefined;  // Has end time = up
    }).length;
    
    const overallDown = configData.monitors.length - overallUp;
    
    // Update the state with correct counts
    state.overallUp = overallUp;
    state.overallDown = overallDown;
    
    console.log(`Recalculated overall status: ${overallUp} up, ${overallDown} down`);

    return { 
      props: { 
        state: JSON.stringify(state),
        monitors: configData.monitors 
      } 
    }
  } catch (error) {
    console.error('Error fetching data:', error)
    return { 
      props: { 
        state: undefined, 
        monitors: [] 
      } 
    }
  }
}
