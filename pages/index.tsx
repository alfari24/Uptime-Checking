import Head from 'next/head'
import { MaintenanceConfig, MonitorState, MonitorTarget, PageConfig } from '@/types/config'
import { maintenances as fallbackMaintenances, pageConfig as fallbackPageConfig } from '@/frontend.config'
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
  maintenances = fallbackMaintenances,
  pageConfig = fallbackPageConfig,
}: {
  state: string
  monitors: MonitorTarget[]
  maintenances?: MaintenanceConfig[]
  pageConfig?: PageConfig
  tooltip?: string
  statusPageLink?: string
}) {
  console.log('Home component received pageConfig:', pageConfig);
  console.log('Group data in Home:', pageConfig?.group);
  const [monitorId, setMonitorId] = useState<string>('');
    // Parse state
  let state;
  if (stateStr !== undefined && stateStr !== null && stateStr !== 'null') {
    try {
      state = JSON.parse(stateStr) as MonitorState;
      // Ensure state has the required properties
      if (!state.overallUp && state.overallUp !== 0) state.overallUp = 0;
      if (!state.overallDown && state.overallDown !== 0) state.overallDown = 0;
      if (!state.lastUpdate) state.lastUpdate = Date.now();
      if (!state.incident) state.incident = {};
      if (!state.latency) state.latency = {};
    } catch (e) {
      console.error('Error parsing state:', e);
      // Provide default state object
      state = {
        overallUp: 0,
        overallDown: 0,
        lastUpdate: Date.now(),
        incident: {},
        latency: {}
      };
    }
  } else {
    // Provide default state object when stateStr is undefined, null, or 'null'
    state = {
      overallUp: 0,
      overallDown: 0,
      lastUpdate: Date.now(),
      incident: {},
      latency: {}
    };
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
        <Footer pageConfig={pageConfig} />
      </div>
    );
  }

  // Main view
  return (
    <>      <Head>
        <title>{pageConfig?.title || 'Status Monitor'}</title>
        <link rel="icon" href="https://weissowl.b-cdn.net/Images/Asset/logos.png" />
      </Head>      <main className={inter.className}>
        <div>
          <OverallStatus state={state} monitors={monitors} maintenances={maintenances} pageConfig={pageConfig} />
          <MonitorList monitors={monitors} state={state} pageConfig={pageConfig} />
          <div style={{ maxWidth: '1150px', margin: '0 auto' }}>
            <IncidentHistory monitors={monitors} state={state} />
          </div>
        </div>
        <Footer pageConfig={pageConfig} />      </main>
    </>
  )
}

// Add a debug function to print data formats
function debugObjectFormat(obj: any): string {
  try {
    return `Type: ${typeof obj}, IsArray: ${Array.isArray(obj)}, Keys: ${obj && typeof obj === 'object' ? Object.keys(obj).join(', ') : 'N/A'}`;
  } catch (e) {
    return `Error debugging object: ${e}`;
  }
}

export async function getServerSideProps() {
  try {
    // We need to use a different port for the API server since both frontend and backend 
    // can't share the same port
    const apiPort = process.env.API_PORT || 3001;
    
    // Determine if we're running in production or development
    const isDev = process.env.NODE_ENV !== 'production';
    console.log(`Running in ${isDev ? 'development' : 'production'} mode`);
    
    // Attempt multiple API endpoints to find working one
    let statusResponse, configResponse;
    let success = false;
    const errors = [];
    
    // Endpoints to try in order
    const endpoints = [
      // Try local API routes first (will only work when consolidated)
      { base: '', note: 'Local API routes' },
      // Try direct server API as fallback
      { base: `http://localhost:${apiPort}`, note: 'Direct server API' },
      // Try the frontend port as last resort
      { base: `http://localhost:${process.env.PORT || 17069}`, note: 'Frontend port API' }
    ];
    
    // Try each endpoint until one works
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying ${endpoint.note} at ${endpoint.base}/api/status`);
        [statusResponse, configResponse] = await Promise.all([
          fetch(`${endpoint.base}/api/status`),
          fetch(`${endpoint.base}/api/config`)
        ]);
        
        if (statusResponse.ok && configResponse.ok) {
          console.log(`Successfully connected to ${endpoint.note}`);
          success = true;
          break;
        } else {
          throw new Error(`API responded with ${statusResponse.status}/${configResponse.status}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${endpoint.note}: ${message}`);
        console.log(`Failed to connect to ${endpoint.note}:`, message);
        continue;
      }
    }
    
    if (!success || !statusResponse || !configResponse) {
      throw new Error(`All API endpoints failed: ${errors.join('; ')}`);
    }

    // At this point, we know statusResponse and configResponse are defined
    if (!statusResponse.ok || !configResponse.ok) {
      throw new Error(`Failed to fetch data from API server: ${statusResponse.status}/${configResponse.status}`)
    }    const statusData = await statusResponse.json() as any
    const configData = await configResponse.json() as any
    
    console.log('Raw config data from API:', configData);
    console.log('Raw group data from API:', typeof configData.group, configData.group);
        // Process the API response
    console.log('Raw config from API:', configData);
    console.log('Raw links from API:', configData.links);
    console.log('Raw group from API:', configData.group);
    
    // Properly handle the links
    const links = Array.isArray(configData.links) ? configData.links : [];
    
    // Process the group object to ensure proper format
    let groupData = {};
    if (configData.group && typeof configData.group === 'object') {
      groupData = configData.group;
      console.log('Group data from API is an object');
    }
    
    // Extract frontend configuration from the API response
    const serverPageConfig: PageConfig = {
      title: configData.title || 'Status Monitor',
      links: links,
      group: groupData
    };
    
    // Log the processed data
    console.log('Processed links:', serverPageConfig.links);
    console.log('Processed group:', serverPageConfig.group);
    
    // Extract maintenances from the API response
    const serverMaintenances = configData.maintenances || [];

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
      if (monitorStatus) {        try {
          // Fetch history data for this monitor using the same endpoint that worked for status and config
          // Use the same endpoint base that was successful earlier
          let historyEndpoint = '';
          for (const endpoint of endpoints) {
            try {
              const testUrl = `${endpoint.base}/api/monitors/${monitor.id}/history`;
              console.log(`Trying to fetch history for ${monitor.id} from ${testUrl}`);
              const historyResponse = await fetch(testUrl);
              
              if (historyResponse.ok) {
                historyEndpoint = endpoint.base;
                break;
              }
            } catch (error) {
              console.log(`Failed to fetch history from ${endpoint.note}:`, error);
              continue;
            }
          }
          
          // Use the working endpoint or fall back to direct API
          const historyUrl = `${historyEndpoint || `http://localhost:${apiPort}`}/api/monitors/${monitor.id}/history`;
          console.log(`Fetching history from: ${historyUrl}`);
          const historyResponse = await fetch(historyUrl);
          let historyData = null;
          
          if (historyResponse.ok) {
            historyData = await historyResponse.json();
            console.log(`Got history for ${monitor.id}: ${historyData.latency?.length} data points`);
          } else {
            console.log(`Failed to get history for ${monitor.id}: ${historyResponse.status}`);
          }
            // Create incident data structure from history
          const incidents = historyData?.incidents || [];
          console.log(`Processing incidents for ${monitor.id}: ${incidents.length} found`, incidents);
          
          if (incidents.length > 0) {
            // Sort incidents by start time (newest first) for proper processing
            const sortedIncidents = [...incidents].sort((a, b) => b.start - a.start);
            
            // Map them to the expected format
            state.incident[monitor.id] = sortedIncidents.map((inc: any) => ({
              start: [inc.start],
              end: inc.end,
              error: [inc.error || monitorStatus.message || 'Unknown error'],
            }));
            
            console.log(`Processed ${sortedIncidents.length} incidents for ${monitor.id}`);
          } else {
            // If no historical incidents exist, create a fallback based on current status
            const hasDowntime = !monitorStatus.up;
            state.incident[monitor.id] = [{
              start: [statusData.updatedAt - (hasDowntime ? 300 : 0)], // 5 minutes ago if currently down
              end: monitorStatus.up ? statusData.updatedAt : undefined,
              error: [monitorStatus.message || 'Connection issue detected'],
            }];
            console.log(`Created fallback incident for ${monitor.id}: ${monitorStatus.up ? 'UP' : 'DOWN'}`);
          }
          
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
      console.log(`Recalculated overall status: ${overallUp} up, ${overallDown} down`);    // Ensure all data is serializable for Next.js
    const safeState = JSON.parse(JSON.stringify(state || null));
    const safeMonitors = JSON.parse(JSON.stringify(configData.monitors || []));
    const safeMaintenances = JSON.parse(JSON.stringify(serverMaintenances || []));
    
    // Ensure the pageConfig object is properly structured and serializable
    const safePageConfig = {
      title: serverPageConfig.title || "Status Monitor",
      links: Array.isArray(serverPageConfig.links) ? serverPageConfig.links : [],
      group: serverPageConfig.group || {}
    };
    
    // Verify the group structure to ensure it's serializable
    if (safePageConfig.group) {
      Object.entries(safePageConfig.group).forEach(([key, value]) => {
        if (!Array.isArray(value)) {
          safePageConfig.group[key] = [];
        }
      });
    }
    
    console.log('Final pageConfig being sent to client:', JSON.stringify(safePageConfig, null, 2));
    
    return { 
      props: { 
        state: JSON.stringify(safeState),
        monitors: safeMonitors,
        maintenances: safeMaintenances,
        pageConfig: safePageConfig
      } 
    }  
  } catch (error) {
    console.error('Error fetching data:', error)
    // Provide safe fallback values that are guaranteed to be serializable
    return { 
      props: { 
        state: JSON.stringify(null), 
        monitors: [],
        maintenances: [],
        pageConfig: {
          title: "Status Monitor", 
          links: [],
          group: {}
        }
      } 
    }
  }
}
