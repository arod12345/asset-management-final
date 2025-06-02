"use client";

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have a utility for class names

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trendValue?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  trendPeriod?: string;
  className?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon: Icon,
  trendValue,
  trendDirection = 'neutral',
  trendPeriod,
  className,
}) => {
  const trendColor = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-gray-500',
  };

  return (
    <div
      className={cn(
        'bg-gray-800/50 backdrop-blur-md shadow-xl rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition-all duration-300 transform hover:scale-105',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <Icon className="h-6 w-6 text-purple-400" />
      </div>
      <div>
        <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
        {trendValue && trendPeriod && (
          <div className="flex items-center text-xs">
            <span className={cn('font-semibold', trendColor[trendDirection])}>
              {trendDirection === 'up' ? '▲' : trendDirection === 'down' ? '▼' : ''} {trendValue}
            </span>
            <span className="ml-1 text-gray-500">{trendPeriod}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
