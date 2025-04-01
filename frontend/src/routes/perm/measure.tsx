import { useState, useEffect } from 'react';

import { createFileRoute } from '@tanstack/react-router';

import { CycleTimeResponse } from './calibration';

import WaterLevelGauge from '@/components/perm/water-level-gauge';
import { getAuthHeaders } from '@/lib/auth';
import { BACKEND_PREFIX_URL } from '@/lib/config';

export const Route = createFileRoute('/perm/measure')({
  component: RouteComponent,
});

function RouteComponent() {
  const [averageCycleTime, setAverageCycleTime] = useState<number>(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetch(BACKEND_PREFIX_URL + '/api/cycle_time', {
        method: 'GET',
        headers: getAuthHeaders(),
      })
        .then((response) => response.json())
        .then((data: CycleTimeResponse) => {
          if (data.average_cycle_time_us !== null && data.average_cycle_time_us !== undefined) {
            setAverageCycleTime(data.average_cycle_time_us);
          }
        })
        .catch((error) => {
          console.error('Error fetching cycle time:', error);
        });
    }, 10);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      <WaterLevelGauge average_cycle_time_us={averageCycleTime} />
    </>
  );
}
