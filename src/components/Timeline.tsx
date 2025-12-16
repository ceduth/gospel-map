'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Play, Pause } from 'lucide-react';
import { DataSource, RawMetric } from '@/types';
import { getHourlyTotals } from '@/data/metrics';

interface TimelineProps {
  currentHour: number;
  isPlaying: boolean;
  onHourChange: (hour: number) => void;
  onPlayPause: () => void;
  activeSources: DataSource[];
  showViews: boolean;
  metrics: RawMetric[];
  selectedLanguages: string[];
  selectedTitles: string[];
}

export default function Timeline({
  currentHour,
  isPlaying,
  onHourChange,
  onPlayPause,
  activeSources,
  showViews,
  metrics,
  selectedLanguages,
  selectedTitles,
}: TimelineProps) {
  const [collapsed, setCollapsed] = useState(true);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const hourlyTotals = useMemo(() => {
    return getHourlyTotals(metrics, activeSources, selectedLanguages, selectedTitles);
  }, [metrics, activeSources, selectedLanguages, selectedTitles]);

  const maxViews = Math.max(...hourlyTotals.map(h => h.views), 1);

  const chartHeight = 60;

  const viewsPath = useMemo(() => {
    const points = hourlyTotals.map((h, i) => {
      const x = (i / 23) * 100;
      const y = chartHeight - (h.views / maxViews) * chartHeight;
      return `${x},${y}`;
    });
    return `M${points.join(' L')} L100,${chartHeight} L0,${chartHeight} Z`;
  }, [hourlyTotals, maxViews]);

  const handleChartClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const hour = Math.round((x / rect.width) * 23);
    onHourChange(Math.max(0, Math.min(23, hour)));
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800">
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900/95 border border-gray-800 border-b-0 rounded-t-lg px-3 py-1 text-gray-400 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {!collapsed && (
        <div className="px-4 py-3">
          {/* Play/Pause and current time */}
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={onPlayPause}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <div className="text-white font-mono text-lg">
              {currentHour.toString().padStart(2, '0')}:00 UTC
            </div>
          </div>

          {/* Chart */}
          <svg
            viewBox={`0 0 100 ${chartHeight}`}
            className="w-full h-16 cursor-pointer"
            preserveAspectRatio="none"
            onClick={handleChartClick}
          >
            {showViews && (
              <path
                d={viewsPath}
                fill="rgba(59, 130, 246, 0.3)"
                stroke="rgba(59, 130, 246, 0.8)"
                strokeWidth="0.5"
              />
            )}
            {/* Current hour indicator */}
            <line
              x1={(currentHour / 23) * 100}
              y1="0"
              x2={(currentHour / 23) * 100}
              y2={chartHeight}
              stroke="white"
              strokeWidth="0.5"
            />
          </svg>

          {/* Hour labels */}
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            {[0, 6, 12, 18, 23].map(h => (
              <span key={h}>{h.toString().padStart(2, '0')}:00</span>
            ))}
          </div>
        </div>
      )}

      {/* Collapsed view */}
      {collapsed && (
        <div className="px-4 py-2 flex items-center gap-4">
          <button
            onClick={onPlayPause}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 transition-colors"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div className="text-white font-mono">
            {currentHour.toString().padStart(2, '0')}:00 UTC
          </div>
          <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(currentHour / 23) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}