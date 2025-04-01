import { useState, useEffect } from 'react'

import { createFileRoute } from '@tanstack/react-router'

import CalibrationPlot from '@/components/perm/calibration-plot'
import { getAuthHeaders } from '@/lib/auth'
import { BACKEND_PREFIX_URL } from '@/lib/config'
export const Route = createFileRoute('/dashboard/calibration')({
  component: CalibrationComponent,
})

export interface CycleTimeResponse {
  timestamp?: number
  edge_count?: number
  average_cycle_time_us?: number | null
  message?: string
}

function CalibrationComponent() {
  const [averageCycleTime, setAverageCycleTime] = useState<number>(0)

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetch(BACKEND_PREFIX_URL + '/api/cycle_time', {
        method: 'GET',
        headers: getAuthHeaders(),
      })
        .then((response) => response.json())
        .then((data: CycleTimeResponse) => {
          if (
            data.average_cycle_time_us !== null &&
            data.average_cycle_time_us !== undefined
          ) {
            setAverageCycleTime(data.average_cycle_time_us)
          } else {
            alert('No cycle time data available')
          }
        })
        .catch((_error) => alert('Error fetching cycle time:'))
    }, 1000)

    return () => clearInterval(intervalId)
  }, [])

  return (
    <div className='w-[500px] mx-auto'>
      <CalibrationPlot averageCycleTime={averageCycleTime} />
    </div>
  )
}

export default CalibrationComponent
