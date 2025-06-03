"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface ModelDataPoint {
  name: string; // Model name
  value: number; // Number of assets
}

interface AssetModelDistributionChartProps {
  data: ModelDataPoint[];
}

// Define a color palette for the bar chart segments (can be a single color or varied)
const MODEL_CHART_COLOR = '#3b82f6'; // blue-500

const AssetModelDistributionChart: React.FC<AssetModelDistributionChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500 py-8">No model data to display.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{
          top: 5,
          right: 20,
          left: 10,
          bottom: 5,
        }}
        layout="vertical" // Use vertical layout for better readability of model names
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#d1d5db" />
        <YAxis 
          type="category" 
          dataKey="name" 
          width={120} // Adjust width to accommodate longer model names
          tick={{ fontSize: 12, fill: '#6b7280' }} 
          stroke="#d1d5db"
        />
        <Tooltip
          cursor={{ fill: 'rgba(209, 213, 219, 0.3)' }}
          contentStyle={{ backgroundColor: 'white', borderRadius: '0.375rem', borderColor: '#e5e7eb' }}
          labelStyle={{ color: '#1f2937', fontWeight: '500' }}
        />
        <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
        <Bar dataKey="value" name="Assets" radius={[0, 4, 4, 0]} fill={"#3b82f6"} barSize={20}>
          {/* If you want different colors per bar, map data to Cells here */}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default AssetModelDistributionChart;
