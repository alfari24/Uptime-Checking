import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  TimeScale,
} from 'chart.js'
import 'chartjs-adapter-moment'
import { MonitorState, MonitorTarget } from '@/types/config'
import { iataToCountry } from '@/util/iata'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  TimeScale
)

export default function DetailChart({
  monitor,
  state,
}: {
  monitor: MonitorTarget
  state: MonitorState
}) {
  // Check if a time point was during an outage
  const wasDown = (time: number) => {
    if (!state.incident[monitor.id] || state.incident[monitor.id].length === 0) {
      return false
    }
    
    // Check each incident period
    for (const incident of state.incident[monitor.id]) {
      for (let i = 0; i < incident.start.length; i++) {
        const startTime = incident.start[i]
        const endTime = i === incident.start.length - 1 
          ? incident.end ?? Date.now() / 1000  // If still ongoing, use current time
          : incident.start[i + 1]
        
        // Check if the point's time falls within this incident period
        if (time >= startTime && time <= endTime) {
          return true
        }
      }
    }
    
    return false
  }

  // Get all latency points data
  const rawData = state.latency[monitor.id].recent;
  
  // Safety check for empty data
  if (!rawData || rawData.length === 0) {
    console.error(`No data for monitor ${monitor.id}`);
    return <div>No data available</div>;
  }

  // Define hourly data type
  interface HourlyData {
    totalPoints: number;
    downPoints: number;
    timestamp: number;
    hour: number;
  }

  // Group data by hour
  const hourlyData: Record<number, HourlyData> = {};
  const now = Date.now();
  
  // Create last 24 hourly slots
  for (let i = 0; i < 24; i++) {
    const hourStart = new Date();
    hourStart.setHours(hourStart.getHours() - i);
    hourStart.setMinutes(0, 0, 0);
    
    const hourKey = hourStart.getTime();
    hourlyData[hourKey] = {
      totalPoints: 0,
      downPoints: 0,
      timestamp: hourStart.getTime(),
      hour: hourStart.getHours(),
    };
  }

  // Process data points into hourly buckets
  rawData.forEach(point => {
    const pointDate = new Date(point.time * 1000);
    pointDate.setMinutes(0, 0, 0);
    const hourKey = pointDate.getTime();
    
    if (hourlyData[hourKey]) {
      hourlyData[hourKey].totalPoints++;
      if (wasDown(point.time) || point.ping === 0) {
        hourlyData[hourKey].downPoints++;
      }
    }
  });

  // Create chart data with percentages
  const chartData = Object.values(hourlyData)
    .sort((a: any, b: any) => a.timestamp - b.timestamp)
    .map((hourData: any) => {
      const upPercentage = hourData.totalPoints === 0 ? 100 : 
        ((hourData.totalPoints - hourData.downPoints) / hourData.totalPoints) * 100;
      const downPercentage = hourData.totalPoints === 0 ? 0 : 
        (hourData.downPoints / hourData.totalPoints) * 100;
        
      return {
        x: hourData.timestamp,
        y: 100, // Full height bar
        upPercentage,
        downPercentage,
        hour: hourData.hour,
        // Set to 'down' if more than 50% downtime in this hour
        down: downPercentage > 50
      };
    });

  // Display a full 24 hours of data
  const activeHours = chartData.filter(h => h.upPercentage > 0 || h.downPercentage > 0);
  const hoursToShow = 24; // Always show 24 hours
  // Take the last N hours without reversing, so most recent hour is last (rightmost)
  const displayData = chartData.slice(-hoursToShow);
  
  // Get time ranges for display
  const timestamps = displayData.map(point => point.x);
  const maxTime = Math.max(...timestamps);
  const minTime = Math.min(...timestamps);
  
  // Create separate datasets for up and down percentages
  let data = {
    labels: displayData.map(d => {
      // Format hour for display
      const date = new Date(d.x);
      const hour = date.getHours();
      return `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`;
    }),
    datasets: [
      // Down percentage (red)
      {
        data: displayData.map(d => d.downPercentage),
        backgroundColor: 'rgba(220, 38, 38, 0.9)', // Red for downtime
        borderColor: 'rgb(220, 38, 38)',
        borderWidth: 0,
        borderRadius: {
          topLeft: 4,
          topRight: 4,
          bottomLeft: 0,
          bottomRight: 0,
        },
        barPercentage: 1.0,
        categoryPercentage: 0.9,
        label: 'Down',
        stack: 'stack0',
      },
      // Up percentage (green)
      {
        data: displayData.map(d => d.upPercentage),
        backgroundColor: 'rgba(34, 197, 94, 0.9)', // Green for uptime
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 0,
        borderRadius: {
          topLeft: 0,
          topRight: 0,
          bottomLeft: 4,
          bottomRight: 4,
        },
        barPercentage: 1.0,
        categoryPercentage: 0.9,
        label: 'Up',
        stack: 'stack0',
      },
    ],
  }
  
  let options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    animation: {
      duration: 0,
    },
    plugins: {      
      tooltip: {
        callbacks: {
          title: (items: any) => {
            if (items[0]?.dataIndex !== undefined) {
              const index = items[0].dataIndex;
              const hour = displayData[index];
              return new Date(hour.x).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit'
              });
            }
            return '';
          },
          label: (item: any) => {
            const datasetIndex = item.datasetIndex;
            const value = item.parsed.y.toFixed(1);
            
            if (datasetIndex === 0) {
              return `Down: ${value}%`;
            } else if (datasetIndex === 1) {
              return `Up: ${value}%`;
            }
            return '';
          },
        },
      },
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Uptime Status',
        align: 'start' as const,
      },
    },
    scales: {
      x: {
        type: 'category' as const,
        ticks: {
          source: 'auto' as const,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 24, // Show up to 24 ticks for 24 hours
        },
        grid: {
          display: true,
          offset: false
        },
        border: {
          display: false
        },
        stacked: true,
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          callback: (value: any) => `${value}%`
        },
        grid: {
          display: true
        },
        stacked: true,
        max: 100,
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0
      }
    },
  }

  // @ts-ignore: JSX element type issue, this won't affect runtime
  return (
    <div style={{ height: '180px', width: '100%', maxWidth: '1150px' }}>
      <Bar options={options} data={data} />
    </div>
  )
}
