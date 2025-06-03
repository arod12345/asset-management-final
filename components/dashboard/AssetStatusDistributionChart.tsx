"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface StatusDataPoint {
  name: string;
  count: number;
  fill: string;
}

interface AssetStatusDistributionChartProps {
  data: { name: string; value: number }[]; // Expects data in format: [{ name: 'Active', value: 10 }, ...]
}

const STATUS_COLORS: { [key: string]: string } = {
  'Active': '#22c55e', // green-500
  'Inactive': '#ef4444', // red-500
  'Maintenance': '#eab308', // yellow-500
  'Archived': '#6b7280', // gray-500
  'Out for Repair': '#f97316', // orange-500
  // Add more statuses and their colors as needed
};

const AssetStatusDistributionChart: React.FC<AssetStatusDistributionChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500 py-8">No status data to display.</p>;
  }

  const chartData: StatusDataPoint[] = data.map(item => ({
    name: item.name,
    count: item.value,
    fill: STATUS_COLORS[item.name] || STATUS_COLORS['Archived'], // Default color if status not in map
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{
          top: 5,
          right: 20, // Adjusted right margin for YAxis labels
          left: 10, // Adjusted left margin for XAxis labels
          bottom: 5,
        }}
        barGap={10} // Gap between bars of different categories
        barCategoryGap="20%" // Gap between bars of the same category (if grouped)
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 12, fill: '#6b7280' }} 
          stroke="#d1d5db"
        />
        <YAxis 
          allowDecimals={false} 
          tick={{ fontSize: 12, fill: '#6b7280' }} 
          stroke="#d1d5db"
        />
        <Tooltip
          cursor={{ fill: 'rgba(209, 213, 219, 0.3)' }} // Light gray hover effect
          contentStyle={{ backgroundColor: 'white', borderRadius: '0.375rem', borderColor: '#e5e7eb' }}
          labelStyle={{ color: '#1f2937', fontWeight: '500' }}
        />
        <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
        <Bar dataKey="count" name="Assets" radius={[4, 4, 0, 0]}> // Rounded top corners
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default AssetStatusDistributionChart;
