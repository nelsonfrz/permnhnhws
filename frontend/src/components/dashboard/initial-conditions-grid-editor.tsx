import { useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

function valueToHexColor(value: number): string {
  if (value > 0) {
    throw new Error('Value must be 0 or less');
  }

  const normalized = Math.min(1, Math.abs(value) / 100);
  const r = Math.round(255 * normalized);
  const g = Math.round(255 * normalized);
  const b = 255;

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function Grid({
  nodes,
  size,
  onCellClick,
}: {
  nodes: number[];
  size: number;
  onCellClick: (index: number) => void;
}) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {nodes.map((node, idx) => (
          <div
            key={idx}
            onMouseDown={() => onCellClick(idx)}
            style={{ backgroundColor: valueToHexColor(node) }}
            className="border-[0.1px] bg-blue-400 flex items-center justify-center aspect-square hover:opacity-50 cursor-crosshair"
          ></div>
        ))}
      </div>
    </div>
  );
}

export function InitialConditionsGridEditor() {
  const [matrixPotential, setMatrixPotential] = useState<number>(0);
  const [size, setSize] = useState<number>(16);
  const [nodes, setNodes] = useState<number[]>(Array.from({ length: size * size }, () => 0));

  const handleCellClick = (index: number) => {
    setNodes((prevNodes) => {
      const newNodes = [...prevNodes];
      newNodes[index] = matrixPotential;
      return newNodes;
    });
  };

  return (
    <div className='space-y-4'>
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="matrixPotential">Matrix Potential</Label>
        <Input
        max={0}
          type="number"
          id="matrixPotential"
          placeholder="Matrix Potential"
          value={matrixPotential}
          onChange={(e) => setMatrixPotential(Number(e.target.value))}
        />
      </div>
      <Grid nodes={nodes} size={size} onCellClick={handleCellClick} />
    </div>
  );
}
