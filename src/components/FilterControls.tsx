'use client';

import { Smartphone, Globe, Eye } from 'lucide-react';
import { DataSource } from '@/types';
import { sourceColors } from '@/data/metrics';

interface FilterControlsProps {
  activeSources: DataSource[];
  onSourceToggle: (source: DataSource) => void;
  showViews: boolean;
  onToggleViews: () => void;
}

const sourceLabels: Record<DataSource, string> = {
  app: 'App',
  web: 'Web',
};

const sourceIcons: Record<DataSource, React.ReactNode> = {
  app: <Smartphone size={16} />,
  web: <Globe size={16} />,
};

export default function FilterControls({
  activeSources,
  onSourceToggle,
  showViews,
  onToggleViews,
}: FilterControlsProps) {

  const sources: DataSource[] = ['app', 'web'];

  return (
    <div className="absolute top-4 right-16 bg-gray-900/90 backdrop-blur rounded-lg px-4 py-3">
      <div className="mb-4 pb-4 border-b border-gray-700">
        <div className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wide">Metrics</div>
        <div className="flex gap-3">
          <button
            onClick={onToggleViews}
            className={`
              px-4 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2.5 shadow-lg
              ${showViews
                ? 'bg-blue-600 text-white shadow-blue-500/50'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 shadow-none'
              }
            `}
          >
            <Eye size={20} />
            <span>Media Views</span>
          </button>
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">Sources</div>
        <div className="flex flex-wrap gap-2">
          {sources.map(source => {
            const isActive = activeSources.includes(source);
            const color = sourceColors[source];

            return (
              <button
                key={source}
                onClick={() => onSourceToggle(source)}
                className={`
                  px-2.5 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5
                  ${isActive
                    ? 'text-white'
                    : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                  }
                `}
                style={isActive ? { backgroundColor: color } : undefined}
              >
                {sourceIcons[source]}
                <span>{sourceLabels[source]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}