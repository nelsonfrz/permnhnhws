// calibration-plot.tsx
import { useState, useMemo, useEffect } from 'react';
import { VictoryChart, VictoryScatter, VictoryLine, VictoryTheme, VictoryAxis } from 'victory';
import { BACKEND_PREFIX_URL } from '@/lib/config';
import { getAuthHeaders } from '@/lib/auth';
import { Button } from '../ui/button';
import { Ruler, Save } from 'lucide-react';

interface DataPoint {
  x: number; // Now: T (measured cycle time in μs)
  y: number; // Now: h (known physical level)
}

interface CalibrationPlotProps {
  averageCycleTime: number;
}

// Initial calibration points: the known h values are preset,
// while T (the measured cycle time) starts at 0.
const initialScatterData: DataPoint[] = [
  { x: 0, y: 200 },
  { x: 0, y: 250 },
  { x: 0, y: 300 },
  { x: 0, y: 350 },
  { x: 0, y: 400 },
  { x: 0, y: 450 },
  { x: 0, y: 500 },
];

/**
 * Computes a simple linear regression (least-squares fit) from the data.
 * Now interpreted as h = m * T + b, where T (x) is the measured cycle time and h (y) is the known level.
 */
function computeRegressionLine(data: DataPoint[]): {
  line: DataPoint[];
  m: number;
  b: number;
  r2: number;
} {
  if (data.length < 2) return { line: [], m: 0, b: 0, r2: 0 };

  const n = data.length;
  const sumX = data.reduce((acc, pt) => acc + pt.x, 0);
  const sumY = data.reduce((acc, pt) => acc + pt.y, 0);
  const sumXY = data.reduce((acc, pt) => acc + pt.x * pt.y, 0);
  const sumXX = data.reduce((acc, pt) => acc + pt.x * pt.x, 0);

  const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const b = (sumY - m * sumX) / n;

  const minX = Math.min(...data.map((pt) => pt.x));
  const maxX = Math.max(...data.map((pt) => pt.x));

  // Calculate R²
  const yMean = sumY / n;
  const ssTotal = data.reduce((acc, pt) => acc + Math.pow(pt.y - yMean, 2), 0);
  const ssResidual = data.reduce((acc, pt) => acc + Math.pow(pt.y - (m * pt.x + b), 2), 0);
  const r2 = ssTotal === 0 ? 1 : 1 - ssResidual / ssTotal;

  return {
    line: [
      { x: minX, y: m * minX + b },
      { x: maxX, y: m * maxX + b },
    ],
    m,
    b,
    r2,
  };
}

export default function CalibrationPlot({ averageCycleTime }: CalibrationPlotProps) {
  const [data, setData] = useState<DataPoint[]>(initialScatterData);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Compute regression line, slope, intercept and R² for h(T) = m * T + b
  const { line: regressionLineData, m, b, r2 } = useMemo(() => computeRegressionLine(data), [data]);

  // Load saved calibration data from the backend on mount
  useEffect(() => {
    fetch(BACKEND_PREFIX_URL + '/api/calibration', {
      method: 'GET',
      headers: getAuthHeaders(),
    })
      .then((response) => response.json())
      .then((respData) => {
        if (respData && respData.calibration_points) {
          setData(respData.calibration_points);
        }
      })
      .catch((error) => {
        console.error('Error loading calibration data:', error);
      });
  }, []);

  // When a calibration point is clicked, mark it as selected.
  const handlePointClick = (index: number) => {
    setSelectedIndex(index);
  };

  // Update the selected point’s measured cycle time (T) with the current averageCycleTime.
  const handleUpdatePoint = () => {
    if (selectedIndex === null) return;
    setData((prevData) =>
      prevData.map((point, idx) =>
        idx === selectedIndex ? { ...point, x: averageCycleTime } : point
      )
    );
  };

  // Sends calibration data (points, slope, intercept) to the backend to be saved.
  const handleSaveCalibration = () => {
    fetch(BACKEND_PREFIX_URL + '/api/calibration/save', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        calibration_points: data,
        slope: m,
        intercept: b,
      }),
    })
      .then((response) => response.json())
      .then((result) => {
        alert(result.message || 'Calibration saved successfully.');
      })
      .catch(() => {
        alert('Error saving calibration.');
      });
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Calibration Plot</h1>
      <p>T = {averageCycleTime.toFixed(2)}μs</p>
      {m !== null && b !== null && r2 !== null && (
        <p>
          h(T) = {m.toFixed(4)}⋅T {b < 0 ? '' : '+'} {b.toFixed(2)}, R² = {r2.toFixed(5)}
        </p>
      )}

      <VictoryChart theme={VictoryTheme.material} width={600} height={500}>
        <VictoryAxis
          label="T (μs)"
          style={{ axisLabel: { padding: 30 }, grid: { stroke: '#ECECEC' } }}
        />
        <VictoryAxis
          dependentAxis
          label="h"
          style={{ axisLabel: { padding: 40 }, grid: { stroke: '#ECECEC' } }}
        />

        <VictoryScatter
          data={data}
          size={20}
          style={{
            data: { fill: ({ index }) => (index === selectedIndex ? 'red' : '#54aaff') },
          }}
          events={[
            {
              target: 'data',
              eventHandlers: {
                onClick: () => {
                  return [
                    {
                      target: 'data',
                      mutation: (props) => {
                        handlePointClick(props.index);
                        return null;
                      },
                    },
                  ];
                },
              },
            },
          ]}
        />

        {regressionLineData.length === 2 && (
          <VictoryLine
            data={regressionLineData}
            style={{ data: { stroke: 'blue', strokeWidth: 2 } }}
          />
        )}
      </VictoryChart>

      <p className="mb-2">
        {selectedIndex !== null ? (
          <>
            Selected Data Point: T = {data[selectedIndex].x}μs, h = {data[selectedIndex].y}
          </>
        ) : (
          <>No data point selected. Click on a point to select it.</>
        )}
      </p>

      <div className="flex gap-2">
        <Button
          onClick={handleUpdatePoint}
          disabled={selectedIndex === null}
          variant="outline"
          className="rounded-full w-[100px] h-[100px] text-xl"
        >
          <Ruler className="scale-[2]" />
        </Button>
        <Button
          onClick={handleSaveCalibration}
          variant="outline"
          className="rounded-full w-[100px] h-[100px] text-xl"
        >
          <Save className="scale-[2]" />
        </Button>
      </div>
    </div>
  );
}
