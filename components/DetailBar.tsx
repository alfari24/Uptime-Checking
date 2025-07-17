import { MonitorState, MonitorTarget } from '@/types/config'
import { getColor } from '@/util/color'
import { Box, Tooltip, Modal } from '@mantine/core'
import { useResizeObserver } from '@mantine/hooks'
import { useState } from 'react'
const moment = require('moment')
require('moment-precise-range-plugin')

export default function DetailBar({
  monitor,
  state,
}: {
  monitor: MonitorTarget
  state: MonitorState
}) {
  const [barRef, barRect] = useResizeObserver()
  const [modalOpened, setModalOpened] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modelContent, setModelContent] = useState(<div />)

  const overlapLen = (x1: number, x2: number, y1: number, y2: number) => {
    return Math.max(0, Math.min(x2, y2) - Math.max(x1, y1))
  }

  const uptimePercentBars = []

  const currentTime = Math.round(Date.now() / 1000)
  const montiorStartTime = state.incident[monitor.id][0].start[0]

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const calculateVisibleDays = () => {
    // Jika lebar kurang dari 540px, tampilkan default 14 hari (2 minggu)
    if (barRect.width < 540) return 14;
    
    // Hitung jumlah hari berdasarkan lebar kontainer
    // Asumsi: setiap bar membutuhkan sekitar 10px lebar + 2px margin
    const barWidthWithMargin = 12;
    const estimatedDays = Math.floor(barRect.width / barWidthWithMargin);

    // Batasi hingga maksimum 130 hari
    return Math.min(130, Math.max(14, estimatedDays));
  }
  
  const visibleDays = barRect.width ? calculateVisibleDays() : 90;
  
  for (let i = visibleDays - 1; i >= 0; i--) {
    const dayStart = Math.round(todayStart.getTime() / 1000) - i * 86400
    const dayEnd = dayStart + 86400

    const dayMonitorTime = overlapLen(dayStart, dayEnd, montiorStartTime, currentTime)
    let dayDownTime = 0

    let incidentReasons: string[] = []

    for (let incident of state.incident[monitor.id]) {
      const incidentStart = incident.start[0]
      const incidentEnd = incident.end ?? currentTime

      const overlap = overlapLen(dayStart, dayEnd, incidentStart, incidentEnd)
      dayDownTime += overlap

      // Incident history for the day
      if (overlap > 0) {
        for (let i = 0; i < incident.error.length; i++) {
          let partStart = incident.start[i]
          let partEnd =
            i === incident.error.length - 1 ? incident.end ?? currentTime : incident.start[i + 1]
          partStart = Math.max(partStart, dayStart)
          partEnd = Math.min(partEnd, dayEnd)

          if (overlapLen(dayStart, dayEnd, partStart, partEnd) > 0) {
            const startStr = new Date(partStart * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
            const endStr = new Date(partEnd * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
            incidentReasons.push(`[${startStr}-${endStr}] ${incident.error[i]}`)
          }
        }
      }
    }    const dayPercent = (((dayMonitorTime - dayDownTime) / dayMonitorTime) * 100).toPrecision(4)
      const tooltipContent = Number.isNaN(Number(dayPercent)) ? 
      'No Data' : 
      `${dayPercent}% at ${new Date(dayStart * 1000).toLocaleDateString()}${dayDownTime > 0 ? 
        `\nDown for ${moment.preciseDiff(moment(0), moment(dayDownTime * 1000))} (click for detail)` : ''}`;

    // Gunakan string sederhana untuk tooltip agar tidak terjadi error
    uptimePercentBars.push(
      // Wrap in a div to fix the Tooltip component issue
      <span key={i}>        <Tooltip
          label={tooltipContent}
          multiline
          position="top"
        >
          <div
          style={{
            height: '20px',
            width: visibleDays > 45 ? '7px' : visibleDays > 30 ? '9px' : '12px',
            background: getColor(dayPercent, false),
            borderRadius: '2px',
            marginLeft: '1px',
            marginRight: '1px',
          }}
          onClick={() => {
            if (dayDownTime > 0) {
              setModalTitle(
                `🚨 ${monitor.name} incidents at ${new Date(dayStart * 1000).toLocaleDateString()}`
              )
              setModelContent(
                <>
                  {incidentReasons.map((reason, index) => (
                    <div key={index}>{reason}</div>
                  ))}
                </>
              )
              setModalOpened(true)
            }
          }}        />
      </Tooltip>
      </span>
    )
  }

  return (
    <>      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={modalTitle}
        size={'60em'}
      >
        {modelContent}
      </Modal>      <Box
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          marginTop: '10px',
          marginBottom: '5px',
          width: '100%',
          maxWidth: '1150px',
          justifyContent: 'space-between', // Center the bars
          overflow: 'hidden',       // Hide overflow
        }}
        visibleFrom="540"
        ref={barRef}
      >
        {uptimePercentBars}
      </Box>
    </>
  )
}
