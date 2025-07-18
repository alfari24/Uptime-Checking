import { MonitorState, MonitorTarget, PageConfig } from '@/types/config'
import { Accordion, Card, Center, Text, Divider } from '@mantine/core'
import MonitorDetail from './MonitorDetail'

function countUpMonitors(state: MonitorState, monitors: MonitorTarget[], groupIds: string[]) {
  console.log('Evaluating monitors for group:', groupIds);
  
  // Count monitors that are up (not having ongoing incidents)
  return monitors
    .filter(monitor => {
      // First check if this monitor ID is in the group
      if (!groupIds.includes(monitor.id)) return false;
      
      console.log(`Checking monitor: ${monitor.id}, name: ${monitor.name}`);
      
      // Check if the monitor has an open incident (end is undefined)
      if (state.incident[monitor.id] && state.incident[monitor.id].length > 0) {
        const latestIncident = state.incident[monitor.id].slice(-1)[0];
        console.log(`Latest incident for ${monitor.id}:`, latestIncident);
        
        if (latestIncident.end === undefined) {
          // Open incident means the monitor is down
          console.log(`Monitor ${monitor.id} has open incident - considered DOWN`);
          return false;
        }
      }
      
      // For any monitor with recent latency data points
      if (state.latency[monitor.id] && state.latency[monitor.id].recent.length > 0) {
        const latestPoint = state.latency[monitor.id].recent.slice(-1)[0];
        console.log(`Latest latency point for ${monitor.id}:`, latestPoint);
        
        // Consider a monitor down if the most recent ping is 0
        if (latestPoint && latestPoint.ping === 0) {
          console.log(`Monitor ${monitor.id} has ping 0 - considered DOWN`);
          return false;
        }
      }
      
      return true;
    })
    .length;
}

function countTotalMonitors(monitors: MonitorTarget[], groupIds: string[]) {
  // Count total valid monitors in this group
  return monitors.filter(monitor => groupIds.includes(monitor.id)).length;
}

function getStatusTextColor(state: MonitorState, monitors: MonitorTarget[], groupIds: string[]) {
  const upCount = countUpMonitors(state, monitors, groupIds);
  const totalCount = countTotalMonitors(monitors, groupIds);
  
  console.log(`Group status: ${upCount}/${totalCount} operational`);
  
  if (upCount === totalCount) {
    return '#059669' // All operational - green
  } else if (upCount === 0) {
    return '#df484a' // None operational - red
  } else {
    return '#f29030' // Some operational - orange
  }
}

export default function MonitorList({
  monitors,
  state,
  pageConfig
}: {
  monitors: MonitorTarget[]
  state: MonitorState
  pageConfig: PageConfig
}) {
  let group: any = pageConfig?.group || {}
  let groupedMonitor = group && Object.keys(group).length > 0
  let content

  // Fungsi untuk menghasilkan warna background header grup berdasarkan nama grup
  const getGroupHeaderStyle = (groupName: string) => {
    // Warna pastel sesuai dengan jenis grup
    if (groupName.includes('Website')) {
      return { backgroundColor: 'rgba(25, 113, 194, 0.12)' }; // Biru muda untuk website
    } else if (groupName.includes('Private')) {
      return { backgroundColor: 'rgba(234, 179, 8, 0.12)' }; // Kuning muda untuk private
    } else if (groupName.includes('Server')) {
      return { backgroundColor: 'rgba(34, 197, 94, 0.12)' }; // Hijau muda untuk server
    } else {
      return { backgroundColor: 'rgba(107, 114, 128, 0.12)' }; // Default abu-abu muda
    }
  };

  if (groupedMonitor) {
    // Grouped monitors
    content = (
      //<Accordion multiple defaultValue={Object.keys(group)} variant="filled">
      <Accordion multiple defaultValue={[]} variant="contained">
        {Object.keys(group).map((groupName, index) => (
          <Accordion.Item 
            key={groupName} 
            value={groupName}
            style={{
              marginBottom: '16px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid var(--mantine-color-gray-3)'
            }}
          >
            <Accordion.Control
              style={{
                ...getGroupHeaderStyle(groupName),
                fontWeight: 600,
                fontSize: '1.1rem',
                padding: '0px 10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '1.15rem' }}>{groupName}</div>
                <Text
                  fw={700}
                  style={{
                    display: 'inline',
                    paddingRight: '5px',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    backgroundColor: getStatusTextColor(state, monitors, group[groupName]) === '#059669' 
                      ? 'rgba(5, 150, 105, 0.15)' 
                      : getStatusTextColor(state, monitors, group[groupName]) === '#df484a'
                        ? 'rgba(223, 72, 74, 0.15)'
                        : 'rgba(242, 144, 48, 0.15)',
                    color: getStatusTextColor(state, monitors, group[groupName]),
                  }}
                >
                  {/* Calculate how many monitors are actually up using our helper function */}
                  {`${countUpMonitors(state, monitors, group[groupName])}/${countTotalMonitors(monitors, group[groupName])} Operational`}
                </Text>
              </div>
            </Accordion.Control>
            <Accordion.Panel style={{ padding: '0px' }}>
              {monitors
                .filter((monitor) => group[groupName].includes(monitor.id))
                .sort((a, b) => group[groupName].indexOf(a.id) - group[groupName].indexOf(b.id))
                .map((monitor, monitorIndex) => (
                  <div key={monitor.id}>
                    <Card.Section 
                      ml="xs" 
                      mr="xs" 
                      style={{ 
                        padding: '0px',
                        //backgroundColor: 'white',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        //border: '1px solid var(--mantine-color-gray-2)'
                      }}
                    >
                      <MonitorDetail monitor={monitor} state={state} />
                    </Card.Section>
                    {monitorIndex < monitors.filter(m => group[groupName].includes(m.id)).length - 1 && (
                      <Divider style={{ margin: '12px 0' }} />
                    )}
                  </div>
                ))}
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    )
  } else {
    // Ungrouped monitors
    content = monitors.map((monitor) => (
      <div key={monitor.id}>
        <Card.Section ml="xs" mr="xs">
          <MonitorDetail monitor={monitor} state={state} />
        </Card.Section>
      </div>
    ))
  }

  return (
    <Center>      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        ml="md"
        mr="md"
        mt="xl"
        withBorder={!groupedMonitor}
        style={{ width: '100%', maxWidth: '1150px' }}
      >
        {content}
      </Card>
    </Center>
  )
}
