"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AssetStatusDataPoint {
  name: string; // e.g., "Active", "Inactive"
  value: number; // Count of assets in this status
}

interface AssetStatusPieChartProps {
  data: AssetStatusDataPoint[];
}

const COLORS = ['#34bc68', '#efc22f', '#00C49F', '#FFBB28', '#FF00FF']; // Updated first two colors

export default function AssetStatusPieChart({ data }: AssetStatusPieChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-center py-4 text-gray-500 dark:text-gray-400">No status data available.</div>;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 h-96">
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            // label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            innerRadius={70}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
