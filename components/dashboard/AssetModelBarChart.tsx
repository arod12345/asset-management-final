"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AssetModelDataPoint {
  name: string; // Asset model name
  count: number; // Count of assets of this model
}

interface AssetModelBarChartProps {
  data: AssetModelDataPoint[];
  topN?: number; // Optional: to show only top N models
}

export default function AssetModelBarChart({ data, topN = 5 }: AssetModelBarChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-center py-4 text-gray-500 dark:text-gray-400">No asset model data available.</div>;
  }

  const processedData = data
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg h-96 dark:border-gray-700">
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={processedData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e5e7eb)" className="dark:stroke-slate-700" />
          <XAxis type="number" stroke="var(--text-color-secondary, #6b7280)" className="dark:stroke-slate-400" />
          <YAxis dataKey="name" type="category" stroke="var(--text-color-secondary, #6b7280)" className="dark:stroke-slate-400" width={100} />
          <Tooltip 
            cursor={{ fill: 'var(--tooltip-cursor-fill, #f3f4f6)' }} 
            contentStyle={{ 
              backgroundColor: 'var(--tooltip-bg, white)', 
              borderColor: 'var(--tooltip-border, #e5e7eb)',
              borderRadius: '0.375rem',
              color: 'var(--tooltip-text, #374151)' 
            }}
            wrapperClassName="dark:!bg-slate-700 dark:!border-slate-600 dark:[&_.recharts-tooltip-item]:!text-slate-200"
          />
          <Legend />
          <Bar dataKey="count" fill="#efc22f" name="Asset Count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
