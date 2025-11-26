import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface GaugeChartProps {
  probability: number; // 0 to 1
  threshold: number;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({ probability, threshold }) => {
  const percentage = probability * 100;
  
  // Data for the semi-circle
  // The gauge is 180 degrees. 
  // We construct segments to color the gauge appropriately.
  // Segment 1: Value up to current percentage.
  // Segment 2: Remaining value to 100.
  const data = [
    { name: 'Score', value: percentage },
    { name: 'Remainder', value: 100 - percentage },
  ];

  // Determine color based on threshold logic
  let color = '#ef4444'; // red-500
  if (probability >= threshold + 0.15) color = '#10b981'; // emerald-500
  else if (probability >= threshold) color = '#eab308'; // yellow-500

  // Needle rotation
  const rotation = -90 + (percentage * 1.8); // Map 0-100 to -90 to 90 degrees

  return (
    <div className="relative w-full h-48 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="75%" // Move center down
            startAngle={180}
            endAngle={0}
            innerRadius={80}
            outerRadius={110}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            {/* Active Part */}
            <Cell fill={color} />
            {/* Empty Part */}
            <Cell fill="#1e293b" /> 
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* Text in the middle bottom */}
      <div className="absolute bottom-4 flex flex-col items-center">
        <span className="text-4xl font-bold text-white tracking-tighter">
          {percentage.toFixed(1)}%
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400 mt-1">
          QS Probability
        </span>
      </div>
    </div>
  );
};