'use client';

interface TimelineProps {
  currentHour: number;
  isPlaying: boolean;
  onHourChange: (hour: number) => void;
  onPlayPause: () => void;
}

export default function Timeline({
  currentHour,
  isPlaying,
  onHourChange,
  onPlayPause,
}: TimelineProps) {
  
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800">
      <div className="px-4 py-3">
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
        </div>

        <div className="flex items-end gap-0.5">
          {hours.map(hour => (
            <button
              key={hour}
              onClick={() => onHourChange(hour)}
              className="flex-1 flex flex-col items-center group relative transition-all duration-150"
            >
              <div
                className={`
                  w-full rounded-t transition-all duration-150
                  ${hour === currentHour
                    ? 'bg-blue-500 h-4'
                    : 'bg-gray-700 h-4 group-hover:bg-gray-600 group-hover:h-6'
                  }
                `}
              />
              {hour % 1 === 0 && (
                <span className="text-xs text-gray-500 mt-1">
                  {hour.toString().padStart(2, '0')}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}