import { useState, useEffect } from 'react';

import { RoundSlider } from 'mz-react-round-slider';
import { Video, Pause, Timer } from 'lucide-react';

import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

import { getAuthHeaders } from '@/lib/auth';
import { BACKEND_PREFIX_URL } from '@/lib/config';

interface WaterLevelGaugeProps {
  average_cycle_time_us: number;
}

const MAX_WATER_LEVEL_DISPLAY = 500;

export default function WaterLevelGauge({ average_cycle_time_us }: WaterLevelGaugeProps) {
  const [pointers, setPointers] = useState([{ value: average_cycle_time_us }]);
  const [slope, setSlope] = useState<number>(0);
  const [intercept, setIntercept] = useState<number>(0);
  const [recording, setRecording] = useState(false);

  // Load calibration data (slope & intercept) from the backend on mount.
  useEffect(() => {
    fetch(BACKEND_PREFIX_URL + '/api/calibration', {
      method: 'GET',
      headers: getAuthHeaders(),
    })
      .then((response) => response.json())
      .then((respData) => {
        if (respData) {
          if (respData.slope !== undefined) setSlope(respData.slope);
          if (respData.intercept !== undefined) setIntercept(respData.intercept);
        }
      })
      .catch((error) => {
        console.error('Error loading calibration data:', error);
      });
  }, []);

  useEffect(() => {
    let waterLevel = slope * average_cycle_time_us + intercept;
    if (waterLevel > MAX_WATER_LEVEL_DISPLAY) {
      waterLevel = MAX_WATER_LEVEL_DISPLAY;
    } else if (waterLevel < 0) {
      waterLevel = 0;
    }
    setPointers([{ value: waterLevel }]);
  }, [average_cycle_time_us, slope, intercept]);

  const handleRecordMeasurement = async () => {
    if (!recording) {
      // Start the measurement by sending calibration parameters
      try {
        const startResponse = await fetch(BACKEND_PREFIX_URL + '/api/measurements/start', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            calibration_slope: slope,
            calibration_intercept: intercept,
          }),
        });

        if (!startResponse.ok) {
          const errorData = await startResponse.json();
          throw new Error(errorData.detail || 'Failed to start measurement.');
        }
        setRecording(true);
      } catch (err) {
        console.error(err);
      }
    } else {
      // Stop the measurement
      try {
        const stopResponse = await fetch(BACKEND_PREFIX_URL + '/api/measurements/stop', {
          method: 'POST',
          headers: getAuthHeaders(),
        });

        if (!stopResponse.ok) {
          const errorData = await stopResponse.json();
          throw new Error(errorData.detail || 'Failed to stop measurement.');
        }
        const stopData = await stopResponse.json();
        alert('Measurement recorded. CSV available at: ' + stopData.file_link);
      } catch (err) {
        console.error(err);
      } finally {
        setRecording(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="relative w-[800px] h-[800px] overflow-hidden flex items-center justify-center rounded-lg">
        <RoundSlider
          textColor="#000"
          textFontSize={50}
          tickValuesColor="#000"
          textSuffix="mm"
          keyboardDisabled={true}
          disabled={true}
          mousewheelDisabled={true}
          pointerBgColorDisabled="#fff"
          connectionBgColorDisabled="url(#connection)"
          pathRadius={370}
          pathThickness={55}
          animateOnClick={true}
          pathStartAngle={150}
          pathEndAngle={30}
          pointerRadius={20}
          pointers={pointers}
          onChange={(items) => {
            setPointers(items as unknown as { value: number }[]);
          }}
          step={0.01}
          min={0}
          max={MAX_WATER_LEVEL_DISPLAY}
          enableTicks={true}
          showTickValues={true}
          ticksGroupSize={27}
          connectionBgColor={'url(#connection)'}
          SvgDefs={
            <>
              <linearGradient id="connection" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4287f5" />
                <stop offset="100%" stopColor="#0045b3" />
              </linearGradient>
            </>
          }
        />
        <div className="absolute flex flex-col items-center gap-4 pt-80">
          {/* Display the current average cycle time */}
          <p className="text-xl flex gap-2">
            <Timer /> {average_cycle_time_us.toFixed(2)}µs
          </p>
          <div className="flex gap-4">
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="outline"
                  className="rounded-full w-[160px] h-[160px] text-xl"
                  onClick={handleRecordMeasurement}
                >
                  {recording ? <Pause className="scale-[3]" /> : <Video className="scale-[3]" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{recording ? 'Stop recording' : 'Start recording'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
