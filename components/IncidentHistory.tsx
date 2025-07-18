import { useState } from 'react';
import { MonitorState, MonitorTarget } from '@/types/config';
import { Text, Paper, Accordion, Badge, Timeline, Group, Button, Tooltip } from '@mantine/core';
import { IconAlertCircle, IconCalendar, IconClock, IconInfoCircle } from '@tabler/icons-react';

interface IncidentHistoryProps {
  monitors: MonitorTarget[];
  state: MonitorState;
}

export default function IncidentHistory({ monitors, state }: IncidentHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Handle case where state is null or undefined
  if (!state || !state.incident) {
    return (
      <Paper mt="xl" p="md" withBorder>
        <Text fw={600} size="lg">Incident History</Text>
        <Text c="dimmed" mt="md">No incident data available</Text>
      </Paper>
    );
  }
  
  // Function to format duration in a human-readable way
  const formatDuration = (start: number, end: number) => {
    const durationSeconds = end - start;
    
    if (durationSeconds < 60) {
      return `${Math.round(durationSeconds)}s`;
    } else if (durationSeconds < 3600) {
      return `${Math.round(durationSeconds / 60)}m`;
    } else if (durationSeconds < 86400) {
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    } else {
      const days = Math.floor(durationSeconds / 86400);
      const hours = Math.floor((durationSeconds % 86400) / 3600);
      return `${days}d ${hours}h`;
    }
  };

  // Get all incidents across all monitors from the last 30 days
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
  
  // Collect and flatten all incidents
  const allIncidents = monitors.flatMap(monitor => {
    const monitorIncidents = state.incident[monitor.id] || [];
    return monitorIncidents.map(incident => {
      // Get the first start time and error message
      const startTime = incident.start[0];
      const endTime = incident.end || Math.floor(Date.now() / 1000);
      const errorMsg = incident.error[0];
      
      return {
        monitorId: monitor.id,
        monitorName: monitor.name,
        start: startTime,
        end: endTime,
        error: errorMsg,
        duration: endTime - startTime,
        ongoing: incident.end === undefined
      };
    }).filter(incident => incident.start >= thirtyDaysAgo);
  });
  
  // Sort incidents by start time (newest first)
  const sortedIncidents = allIncidents.sort((a, b) => b.start - a.start);
    // Only show the 4 most recent incidents when not expanded
  const displayedIncidents = expanded ? sortedIncidents : sortedIncidents.slice(0, 4);
    // Find monitor by ID and its group
  const getMonitor = (id: string) => monitors.find(m => m.id === id);
  
  // Get group name for a monitor ID
  const getGroupName = (id: string): string => {
    // Import group configuration from frontend.config
    const { group } = require('@/frontend.config').pageConfig;
    
    if (!group) return '';
    
    // Find which group the monitor belongs to
    for (const [groupName, monitorIds] of Object.entries(group)) {
      if ((monitorIds as string[]).includes(id)) {
        return groupName.replace(/^[^\s]+ /, ''); // Remove the emoji prefix
      }
    }
    
    return '';
  };
  
  if (sortedIncidents.length === 0) {
    return (
      <Paper p="md" radius="md" withBorder mt="lg" mb="lg">
        <Group justify="space-between" mb="md">
          <Text fw={700} size="lg">
            <IconInfoCircle style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Incident History - Last 30 Days
          </Text>
        </Group>
        <Text c="dimmed">No incidents recorded in the last 30 days.</Text>
      </Paper>
    );
  }
  return (
    <Paper p="md" radius="md" withBorder mt="lg" mb="lg">
      <Group justify="space-between" mb="md">
        <Text fw={700} size="lg">
          <IconInfoCircle style={{ verticalAlign: 'middle', marginRight: '8px' }} />
          Incident History - Last 30 Days
        </Text>
      </Group>
      
      <Timeline active={-1} bulletSize={24} lineWidth={2}>
        {displayedIncidents.map((incident, index) => {
          const monitor = getMonitor(incident.monitorId);
          const date = new Date(incident.start * 1000);
          const formattedDate = date.toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
          });
          const formattedTime = date.toLocaleTimeString(undefined, { 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
          });
          
          return (
            <Timeline.Item 
              key={`${incident.monitorId}-${incident.start}`}              title={                <Group gap="xs">
                  <Text fw={600}>
                    {getGroupName(incident.monitorId) 
                      ? `${getGroupName(incident.monitorId)} - ${incident.monitorName || incident.monitorId}`
                      : incident.monitorName || incident.monitorId}
                  </Text>
                  {incident.ongoing && (
                    <Badge color="red">Ongoing</Badge>
                  )}
                </Group>
              }
              bullet={<IconAlertCircle size={16} />}
              color="red"
            >
              <Text size="sm" color="dimmed" mb={4}>
                <IconCalendar size={14} style={{verticalAlign: 'text-top', marginRight: '5px'}}/>
                {formattedDate} <IconClock size={14} style={{verticalAlign: 'text-top', marginRight: '5px', marginLeft: '5px'}}/> {formattedTime}
              </Text>              <Text size="sm" mb={4}>
                Duration: {formatDuration(incident.start, incident.end)}
              </Text>              <Tooltip label="Detailed error information hidden for security" multiline maw={300}>
                <Text size="sm" color="dimmed" lineClamp={1}>
                  Error: Connection issue detected
                </Text>
              </Tooltip>
            </Timeline.Item>
          );
        })}
      </Timeline>        {sortedIncidents.length > 4 && (
        <Group justify="center" mt="md">
          <Button 
            variant="subtle" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show Less' : `Show ${sortedIncidents.length - 4} More Incidents`}
          </Button>
        </Group>
      )}
    </Paper>
  );
}
