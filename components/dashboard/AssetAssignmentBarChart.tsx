"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AssetAssignmentDataPoint {
  name: string; // "Assigned" or "Unassigned"
  count: number;
}

interface AssetAssignmentBarChartProps {
  data: AssetAssignmentDataPoint[];
}

export default function AssetAssignmentBarChart({ data }: AssetAssignmentBarChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-center py-4 text-gray-500 dark:text-gray-400">No assignment data available.</div>;
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg h-96  dark:border-gray-700">
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e5e7eb)" className="dark:stroke-slate-700" />
          <XAxis dataKey="name" stroke="var(--text-color-secondary, #6b7280)" className="dark:stroke-slate-400" />
          <YAxis stroke="var(--text-color-secondary, #6b7280)" className="dark:stroke-slate-400" />
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
          <Bar dataKey="count" fill="#34bc68" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
