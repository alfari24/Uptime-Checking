import { MaintenanceConfig, MonitorState, MonitorTarget, PageConfig } from '@/types/config'
import { Center, Container, Title } from '@mantine/core'
import { IconCircleCheck, IconAlertCircle } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import MaintenanceAlert from './MaintenanceAlert'

function useWindowVisibility() {
  const [isVisible, setIsVisible] = useState(true)
  useEffect(() => {
    const handleVisibilityChange = () => setIsVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])
  return isVisible
}

export default function OverallStatus({
  state,
  maintenances,
  monitors,
  pageConfig = { title: '', links: [], group: {} }
}: {
  state: MonitorState
  maintenances: MaintenanceConfig[]
  monitors: MonitorTarget[]
  pageConfig?: PageConfig
}) {
  let group = pageConfig?.group || {}
  let groupedMonitor = (group && Object.keys(group).length > 0) || false

  let statusString = ''
  let icon = <IconAlertCircle style={{ width: 64, height: 64, color: '#b91c1c' }} />
  
  // Check if state is null or undefined, or if overallUp/overallDown are missing
  if (!state || typeof state.overallUp !== 'number' || typeof state.overallDown !== 'number') {
    statusString = 'No data yet'
  } else if (state.overallUp === 0 && state.overallDown === 0) {
    statusString = 'No data yet'
  } else if (state.overallUp === 0) {
    statusString = 'All systems not operational'
  } else if (state.overallDown === 0) {
    // Validate if truly all systems are operational by checking each monitor individually
    let allTrulyOperational = true;
    
    // Check each monitor's actual status
    monitors.forEach(monitor => {
      // Check for open incidents
      if (state.incident && state.incident[monitor.id] && state.incident[monitor.id].length > 0) {
        const latestIncident = state.incident[monitor.id].slice(-1)[0];
        if (latestIncident && latestIncident.end === undefined) {
          allTrulyOperational = false;
        }
      }
      
      // Check for 0 ping in recent data
      if (allTrulyOperational && state.latency && state.latency[monitor.id] && state.latency[monitor.id].recent && state.latency[monitor.id].recent.length > 0) {
        const latestPoint = state.latency[monitor.id].recent.slice(-1)[0];
        if (latestPoint && latestPoint.ping === 0) {
          allTrulyOperational = false;
        }
      }
    });
    
    if (allTrulyOperational) {
      statusString = 'All systems operational';
      icon = <IconCircleCheck style={{ width: 64, height: 64, color: '#059669' }} />;
    } else {
      // Some systems are actually down despite overallDown being 0
      statusString = 'Some systems not operational';
      // Keep the alert icon
    }
  } else {
    statusString = `Some systems not operational (${state.overallDown} out of ${
      state.overallUp + state.overallDown
    })`
  }
  const [openTime] = useState(Math.round(Date.now() / 1000))
  const [currentTime, setCurrentTime] = useState(Math.round(Date.now() / 1000))
  const isWindowVisible = useWindowVisibility()
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isWindowVisible) return
      // Refresh if data is more than 10 minutes old (600 seconds)
      // and the page has been open for at least 30 seconds
      if (currentTime - state.lastUpdate > 600 /*&& currentTime - openTime > 30*/) {
        window.location.reload()
      }
      setCurrentTime(Math.round(Date.now() / 1000))
    }, 1000)
    return () => clearInterval(interval)
  })

  const now = new Date()
  let filteredMaintenances: (Omit<MaintenanceConfig, 'monitors'> & { monitors?: MonitorTarget[] })[] =
    maintenances
      .filter((m) => now >= new Date(m.start) && (!m.end || now <= new Date(m.end)))
      .map((maintenance) => ({
        ...maintenance,
        monitors: maintenance.monitors?.map(
          (monitorId) => monitors.find((mon) => monitorId === mon.id)!
        ),
      }))
  return (
    <Container size="lg" style={{ maxWidth: '1200px' }} mt="xl">
      <Center>{icon}</Center>
      <Title mt="sm" style={{ textAlign: 'center' }} order={1}>
        {statusString}
      </Title>
      <Title mt="sm" style={{ textAlign: 'center', color: '#70778c' }} order={5}>
        Last updated on:{' '}
        {`${new Date(state.lastUpdate * 1000).toLocaleString()} (${
          currentTime - state.lastUpdate
        } sec ago)`}
      </Title>      {filteredMaintenances.map((maintenance, idx) => (
        <MaintenanceAlert
          key={idx}
          maintenance={maintenance}
          style={{ maxWidth: '100%' }}
        />
      ))}
    </Container>
  )
}
