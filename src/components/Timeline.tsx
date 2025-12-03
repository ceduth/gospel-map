'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DataSource, RawMetric } from '@/types';
import { getHourlyTotals } from '@/data/metrics';

interface TimelineProps {
  currentHour: number;
  isPlaying: boolean;
  onHourChange: (hour: number) => void;
  onPlayPause: () => void;
  activeSources: DataSource[];
  showViews: boolean;
  showExposures: boolean;
  metrics: RawMetric[];
}

export default function Timeline({
  currentHour,
  isPlaying,
  onHourChange,
  onPlayPause,
  activeSources,
  showViews,
  showExposures,
  metrics,
}: TimelineProps) {
  const [collapsed, setCollapsed] = useState(false);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const hourlyTotals = useMemo(() => {
    return getHourlyTotals(metrics, activeSources);
  }, [metrics, activeSources]);

  const maxViews = Math.max(...hourlyTotals.map(h => h.views), 1);
  const maxExposures = Math.max(...hourlyTotals.map(h => h.exposures), 1);
  const maxValue = Math.max(maxViews, maxExposures);

  const chartHeight = 60;

  const viewsPath = useMemo(() => {
    const points = hourlyTotals.map((h, i) => {
      const x = (i / 23) * 100;
      const y = chartHeight - (h.views / maxValue) * chartHeight;
      return `${x},${y}`;
    });
    return `M${points.join(' L')} L100,${chartHeight} L0,${chartHeight} Z`;
  }, [hourlyTotals, maxValue]);

  const exposuresPath = useMemo(() => {
    const points = hourlyTotals.map((h, i) => {
      const x = (i / 23) * 100;
      const y = chartHeight - (h.exposures / maxValue) * chartHeight;
      return `${x},${y}`;
    });
    return `M${points.join(' L')} L100,${chartHeight} L0,${chartHeight} Z`;
  }, [hourlyTotals, maxValue]);

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
              {isPlaying ? (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <div className="text-white font-mono text-xl">
              {currentHour.toString().padStart(2, '0')}:00
            </div>
            <div className="ml-auto flex gap-4 text-sm">
              {showViews && (
                <span className="text-blue-400">
                  Views: {hourlyTotals[currentHour]?.views.toLocaleString()}
                </span>
              )}
              {showExposures && (
                <span className="text-emerald-400">
                  Exposures: {hourlyTotals[currentHour]?.exposures.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Area chart */}
          <div className="mb-3 relative">
            <svg
              viewBox={`0 0 100 ${chartHeight}`}
              preserveAspectRatio="none"
              className="w-full h-16 cursor-pointer"
              onClick={handleChartClick}
            >
              {showViews && (
                <path
                  d={viewsPath}
                  fill="rgba(59, 130, 246, 0.4)"
                  stroke="rgba(59, 130, 246, 0.8)"
                  strokeWidth="0.5"
                />
              )}
              {showExposures && (
                <path
                  d={exposuresPath}
                  fill="rgba(16, 185, 129, 0.4)"
                  stroke="rgba(16, 185, 129, 0.8)"
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
                strokeDasharray="2,2"
              />
            </svg>
          </div>

          {/* Hour bars */}
          <div className="flex items-end gap-0.5">
            {hours.map(hour => (
              <button
                key={hour}
                onClick={() => onHourChange(hour)}
                className="flex-1 flex flex-col items-center group relative transition-all duration-150"
              >
                <div
                  className={`
                    w-full h-6 rounded-t transition-all duration-150
                    ${hour === currentHour
                      ? 'bg-blue-500'
                      : 'bg-gray-700 group-hover:bg-gray-600'
                    }
                  `}
                />
                <span className={`text-[10px] mt-1 ${hour === currentHour ? 'text-white' : 'text-gray-500'}`}>
                  {hour.toString().padStart(2, '0')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {collapsed && (
        <div className="px-4 py-2 flex items-center gap-4">
          <button
            onClick={onPlayPause}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 transition-colors"
          >
            {isPlaying ? (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <div className="text-white font-mono">
            {currentHour.toString().padStart(2, '0')}:00
          </div>
        </div>
      )}
    </div>
  );
}