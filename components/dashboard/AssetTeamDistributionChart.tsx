"use client";

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TeamDataPoint {
  name: string; // Team name
  value: number; // Number of assets
}

interface AssetTeamDistributionChartProps {
  data: TeamDataPoint[];
}

// Define a color palette for the pie chart segments
const COLORS = [
  '#0088FE', // Blue
  '#00C49F', // Green
  '#FFBB28', // Yellow
  '#FF8042', // Orange
  '#AF19FF', // Purple
  '#FF4560', // Red
  '#775DD0', // Indigo
  '#546E7A', // Slate
];

const AssetTeamDistributionChart: React.FC<AssetTeamDistributionChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500 py-8">No team assignment data to display.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: 'white', borderRadius: '0.375rem', borderColor: '#e5e7eb' }}
          labelStyle={{ color: '#1f2937', fontWeight: '500' }}
        />
        <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default AssetTeamDistributionChart;
