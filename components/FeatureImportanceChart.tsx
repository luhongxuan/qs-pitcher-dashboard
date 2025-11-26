import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { FeatureContribution } from '../types';

interface Props {
  features: FeatureContribution[];
}

export const FeatureImportanceChart: React.FC<Props> = ({ features }) => {
  // Sort features by absolute impact for better visualization
  const sortedFeatures = [...features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  
  // Take top 7 for cleaner UI
  const displayFeatures = sortedFeatures.slice(0, 7);

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={displayFeatures}
          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={100} 
            tick={{ fill: '#94a3b8', fontSize: 12 }} 
            interval={0}
          />
          <Tooltip 
            cursor={{fill: '#1e293b'}}
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
            formatter={(value: number) => [value.toFixed(3), "Impact"]}
          />
          <ReferenceLine x={0} stroke="#64748b" />
          <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
            {displayFeatures.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.contribution >= 0 ? '#10b981' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};