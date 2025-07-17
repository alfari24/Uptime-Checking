import { Text, Tooltip } from '@mantine/core'
import { MonitorState, MonitorTarget } from '@/types/config'
import { IconAlertCircle, IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react'
import DetailChart from './DetailChart'
import DetailBar from './DetailBar'
import { getColor } from '@/util/color'
import { maintenances } from '@/frontend.config'

export default function MonitorDetail({
  monitor,
  state,
}: {
  monitor: MonitorTarget
  state: MonitorState
}) {
  if (!state.latency[monitor.id])
    return (
      <>
        <Text mt="sm" fw={700}>
          {monitor.name}
        </Text>
        <Text mt="sm" fw={700}>
          No data available, please make sure you have deployed your workers with latest config and
          check your worker status!
        </Text>
      </>
    )

  // Check if monitor is down based on incident data or recent ping values
  const hasOpenIncident = state.incident[monitor.id].slice(-1)[0].end === undefined;
  const latestPing = state.latency[monitor.id].recent && state.latency[monitor.id].recent.slice(-1)[0];
  const isDownDueToPing = latestPing && latestPing.ping === 0;
  
  const isDown = hasOpenIncident || isDownDueToPing;
  
  let statusIcon = isDown ? (
    <IconAlertCircle
      style={{ width: '1.25em', height: '1.25em', color: '#b91c1c', marginRight: '3px' }}
    />
  ) : (
    <IconCircleCheck
      style={{ width: '1.25em', height: '1.25em', color: '#059669', marginRight: '3px' }}
    />
  )

  // Hide real status icon if monitor is in maintenance
  const now = new Date()
  const hasMaintenance = maintenances
    .filter((m) => now >= new Date(m.start) && (!m.end || now <= new Date(m.end)))
    .find((maintenance) => maintenance.monitors?.includes(monitor.id))
  if (hasMaintenance)
    statusIcon = (
      <IconAlertTriangle
        style={{
          width: '1.25em',
          height: '1.25em',
          color: '#fab005',
          marginRight: '3px',
        }}
      />
    )

  // Calculate uptime percentage properly
  let totalTime = Date.now() / 1000 - state.incident[monitor.id][0].start[0];
  if (totalTime <= 0) totalTime = 1; // Prevent division by zero
  
  let downTime = 0;
  for (let incident of state.incident[monitor.id]) {
    // Make sure end time is not before start time
    const endTime = incident.end ?? Date.now() / 1000;
    const duration = Math.max(0, endTime - incident.start[0]);
    downTime += duration;
  }
  
  // Ensure downTime doesn't exceed totalTime to prevent negative percentages
  downTime = Math.min(downTime, totalTime);
  
  // Calculate uptime percentage and ensure it's between 0 and 100
  const uptimePercent = Math.max(0, Math.min(100, ((totalTime - downTime) / totalTime) * 100)).toFixed(1)

  // Conditionally render monitor name with or without hyperlink based on monitor.url presence
  const monitorNameElement = (
    <Text mt="sm" fw={700} style={{ display: 'inline-flex', alignItems: 'center' }}>
      {monitor.statusPageLink ? (
        <a
          href={monitor.statusPageLink}
          target="_blank"
          style={{ display: 'inline-flex', alignItems: 'center', color: 'inherit' }}
        >
          {statusIcon} {monitor.name}
        </a>
      ) : (
        <>
          {statusIcon} {monitor.name}
        </>
      )}
    </Text>
  )

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {monitor.tooltip ? (
          <Tooltip label={monitor.tooltip}>{monitorNameElement}</Tooltip>
        ) : (
          monitorNameElement
        )}

        <Text mt="sm" fw={700} style={{ display: 'inline', color: getColor(uptimePercent, true) }}>
          Overall: {uptimePercent}%
        </Text>
      </div>

      <DetailBar monitor={monitor} state={state} />
      {!monitor.hideLatencyChart && <DetailChart monitor={monitor} state={state} />}
    </>
  )
}
