'use client';

import { Smartphone, Globe, Eye, Route } from 'lucide-react';
import { DataSource } from '@/types';
import { sourceColors } from '@/data/metrics';

interface FilterControlsProps {
  activeSources: DataSource[];
  onSourceToggle: (source: DataSource) => void;
  showViews: boolean;
  showJourneyViews: boolean;
  onToggleViews: () => void;
  onToggleJourneyViews: () => void;
}

const sourceLabels: Record<DataSource, string> = {
  app: 'App',
  web: 'Web',
  youtube: 'YouTube',
  nextsteps: 'NextSteps',
};

const NextStepsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 67 67" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(10, 10)">
      <path d="M12.5955 6.0247C12.5955 4.36103 13.9442 3.01236 15.6079 3.01236H43.0537C44.7173 3.01236 46.066 4.36103 46.066 6.0247V29.438C46.066 31.5469 43.9549 33.003 41.9836 32.2539L14.5378 21.8245C13.3685 21.3802 12.5955 20.2595 12.5955 19.0086V6.0247Z" fill="currentColor"/>
      <path d="M33.6819 37.6543C33.6819 39.318 32.3333 40.6667 30.6696 40.6667H3.22379C1.56012 40.6667 0.211448 39.318 0.211448 37.6543V14.241C0.211448 12.1322 2.32252 10.676 4.29383 11.4251L31.7396 21.8545C32.9089 22.2988 33.6819 23.4195 33.6819 24.6704V37.6543Z" fill="currentColor"/>
    </g>
  </svg>
);

const sourceIcons: Record<DataSource, React.ReactNode> = {
  app: <Smartphone size={16} />,
  web: <Globe size={16} />,
  youtube: null,
  nextsteps: <NextStepsIcon />,
};

export default function FilterControls({
  activeSources,
  onSourceToggle,
  showViews,
  showJourneyViews,
  onToggleViews,
  onToggleJourneyViews,
}: FilterControlsProps) {

  const sources: DataSource[] = ['app', 'web', 'youtube', 'nextsteps'];

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
          <button
            onClick={onToggleJourneyViews}
            className={`
              px-4 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2.5 shadow-lg
              ${showJourneyViews
                ? 'bg-emerald-600 text-white shadow-emerald-500/50'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 shadow-none'
              }
            `}
          >
            <Route size={20} />
            <span>Journey Views</span>
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