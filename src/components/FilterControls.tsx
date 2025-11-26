'use client';

import { DataSource } from '@/types';
import { sourceColors } from '@/data/dummy';

interface FilterControlsProps {
  activeSources: DataSource[];
  onSourceToggle: (source: DataSource) => void;
  showViews: boolean;
  showExposures: boolean;
  onToggleViews: () => void;
  onToggleExposures: () => void;
}

const sourceLabels: Record<DataSource, string> = {
  app: 'App',
  web: 'Web',
  ga4: 'GA4',
  youtube: 'YouTube',
  nextsteps: 'NextSteps',
};

export default function FilterControls({
  activeSources,
  onSourceToggle,
  showViews,
  showExposures,
  onToggleViews,
  onToggleExposures,
}: FilterControlsProps) {
  
  const sources: DataSource[] = ['app', 'web', 'ga4', 'youtube', 'nextsteps'];

  return (
    <div className="absolute top-4 right-16 bg-gray-900/90 backdrop-blur rounded-lg px-4 py-3">
      <div className="mb-3 pb-3 border-b border-gray-700">
        <div className="text-xs text-gray-400 mb-2">Show</div>
        <div className="flex gap-2">
          <button
            onClick={onToggleViews}
            className={`
              px-3 py-1.5 rounded text-sm font-medium transition-all
              ${showViews
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }
            `}
          >
            Views
          </button>
          <button
            onClick={onToggleExposures}
            className={`
              px-3 py-1.5 rounded text-sm font-medium transition-all
              ${showExposures
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }
            `}
          >
            Exposures
          </button>
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-2">Sources</div>
        <div className="flex flex-wrap gap-2">
          {sources.map(source => {
            const isActive = activeSources.includes(source);
            const color = sourceColors[source];
            
            return (
              <button
                key={source}
                onClick={() => onSourceToggle(source)}
                className={`
                  px-3 py-1.5 rounded text-sm font-medium transition-all
                  ${isActive
                    ? 'text-white'
                    : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                  }
                `}
                style={isActive ? { backgroundColor: color } : undefined}
              >
                {sourceLabels[source]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}