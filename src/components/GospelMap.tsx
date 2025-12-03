'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Map as MapGL, Marker, Popup, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DataSource, RawMetric, AggregatedLocation } from '@/types';
import { loadMetrics, aggregateByLocationHour, dataSources, sourceColors } from '@/data/metrics';
import Timeline from './Timeline';
import FilterControls from './FilterControls';

const CARTO_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';


export default function GospelMap() {

  const [metrics, setMetrics] = useState<RawMetric[]>([]);
  const [currentHour, setCurrentHour] = useState(12);
  const [cumulativeData, setCumulativeData] = useState<Map<string, AggregatedLocation>>(new Map());
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeSources, setActiveSources] = useState<DataSource[]>([...dataSources]);
  const [showViews, setShowViews] = useState(true);
  const [showJourneyViews, setShowJourneyViews] = useState(true);
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [popupInfo, setPopupInfo] = useState<{
    id: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics().then(setMetrics);
  }, []);

  // Handle cumulative data accumulation and reset
  useEffect(() => {
    if (metrics.length === 0) return;

    // Accumulate data from hour 0 to currentHour
    const newCumulative = new Map<string, AggregatedLocation>();

    for (let h = 0; h <= currentHour; h++) {
      const hourData = aggregateByLocationHour(h, metrics, activeSources, showViews, showJourneyViews);

      for (const data of hourData) {
        const id = data.location.id;

        if (!newCumulative.has(id)) {
          newCumulative.set(id, {
            location: data.location,
            hour: currentHour,
            views: 0,
            journeyViews: 0,
            bySource: {
              app: { views: 0, journeyViews: 0 },
              web: { views: 0, journeyViews: 0 },
              youtube: { views: 0, journeyViews: 0 },
              nextsteps: { views: 0, journeyViews: 0 },
            },
          });
        }

        const existing = newCumulative.get(id)!;
        existing.views += data.views;
        existing.journeyViews += data.journeyViews;

        // Accumulate by source
        for (const source of dataSources) {
          existing.bySource[source].views += data.bySource[source].views;
          existing.bySource[source].journeyViews += data.bySource[source].journeyViews;
        }
      }
    }

    setCumulativeData(newCumulative);
  }, [currentHour, metrics, activeSources, showViews, showJourneyViews]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentHour(h => (h + 1) % 24);
    }, 300);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const locationData = Array.from(cumulativeData.values());

  const maxViews = useMemo(() => {
    // Calculate max across ALL hours (0-23), not just cumulative
    const allHourTotals: number[] = [];
    for (let h = 0; h < 24; h++) {
      const hourData = aggregateByLocationHour(h, metrics, activeSources, true, false);
      const hourTotal = hourData.reduce((sum, d) => sum + d.views, 0);
      allHourTotals.push(hourTotal);
    }
    return Math.max(...allHourTotals, 1);
  }, [metrics, activeSources]);

  const maxJourneyViews = useMemo(() => {
    const allHourTotals: number[] = [];
    for (let h = 0; h < 24; h++) {
      const hourData = aggregateByLocationHour(h, metrics, activeSources, false, true);
      const hourTotal = hourData.reduce((sum, d) => sum + d.journeyViews, 0);
      allHourTotals.push(hourTotal);
    }
    return Math.max(...allHourTotals, 1);
  }, [metrics, activeSources]);

  const handleSourceToggle = useCallback((source: DataSource) => {
    setActiveSources(current => {
      if (current.includes(source)) {
        return current.filter(s => s !== source);
      }
      return [...current, source];
    });
  }, []);

  const getMarkerSize = (value: number, maxValue: number) => {
    const minSize = 6;
    const maxSize = 50;
    const normalized = value / maxValue;
    return minSize + normalized * (maxSize - minSize);
  };

  return (
    <div className="relative h-full w-full">
      {mapError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900">
          <div className="text-center p-8 bg-gray-800 rounded-lg max-w-md">
            <h2 className="text-xl font-bold text-red-400 mb-4">Map Error</h2>
            <p className="text-gray-300 mb-4">{mapError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
      <MapGL
        initialViewState={{
          longitude: 0,
          latitude: 20,
          zoom: 1.5,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={CARTO_DARK}
        attributionControl={false}
        onError={(e) => {
          console.error('Map error:', e);
          setMapError('Failed to initialize map. WebGL may be unavailable.');
        }}
      >
        <NavigationControl position="top-right" />

        {showViews && locationData.map(data => (
          <Marker
            key={`view-${data.location.id}`}
            longitude={data.location.lng}
            latitude={data.location.lat}
            anchor="center"
          >
            <div
              className="rounded-full cursor-pointer transition-all duration-500 ease-out"
              style={{
                width: getMarkerSize(data.views, maxViews),
                height: getMarkerSize(data.views, maxViews),
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                border: '2px solid rgba(59, 130, 246, 0.9)',
                boxShadow: hoveredLocation === data.location.id
                  ? '0 0 20px rgba(59, 130, 246, 0.8)'
                  : '0 0 15px rgba(59, 130, 246, 0.6)',
                transform: hoveredLocation === data.location.id ? 'scale(1.2)' : 'scale(1)',
                animation: data.views > 0 ? 'pulse 2s ease-in-out infinite' : 'none',
              }}
              onMouseEnter={() => setHoveredLocation(data.location.id)}
              onMouseLeave={() => setHoveredLocation(null)}
              onClick={() => setPopupInfo({
                id: data.location.id,
                lat: data.location.lat,
                lng: data.location.lng,
              })}
            />
          </Marker>
        ))}

        {showJourneyViews && locationData.map(data => (
          <Marker
            key={`journeyview-${data.location.id}`}
            longitude={data.location.lng + 0.5}
            latitude={data.location.lat + 0.3}
            anchor="center"
          >
            <div
              className="rounded-full cursor-pointer transition-all duration-500 ease-out"
              style={{
                width: getMarkerSize(data.journeyViews, maxJourneyViews),
                height: getMarkerSize(data.journeyViews, maxJourneyViews),
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                border: '2px solid rgba(16, 185, 129, 0.9)',
                boxShadow: hoveredLocation === data.location.id
                  ? '0 0 20px rgba(16, 185, 129, 0.8)'
                  : '0 0 15px rgba(16, 185, 129, 0.6)',
                transform: hoveredLocation === data.location.id ? 'scale(1.2)' : 'scale(1)',
                animation: data.journeyViews > 0 ? 'pulse 2s ease-in-out infinite' : 'none',
              }}
              onMouseEnter={() => setHoveredLocation(data.location.id)}
              onMouseLeave={() => setHoveredLocation(null)}
              onClick={() => setPopupInfo({
                id: data.location.id,
                lat: data.location.lat,
                lng: data.location.lng,
              })}
            />
          </Marker>
        ))}

        {popupInfo && (
          <Popup
            longitude={popupInfo.lng}
            latitude={popupInfo.lat}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
          >
            {(() => {
              const data = locationData.find(d => d.location.id === popupInfo.id);
              if (!data) return null;

              return (
                <div className="text-sm">
                  <div className="font-semibold text-white mb-2">
                    {data.location.country}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-blue-400">Media Views:</span>
                      <span>{data.views.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-emerald-400">Journey Views:</span>
                      <span>{data.journeyViews.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-600 text-xs">
                    {dataSources.map(source => {
                      const sourceData = data.bySource[source];
                      if (sourceData.views === 0 && sourceData.journeyViews === 0) return null;
                      return (
                        <div key={source} className="flex justify-between gap-2">
                          <span style={{ color: sourceColors[source] }}>{source}:</span>
                          <span>{sourceData.views}v / {sourceData.journeyViews}j</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </Popup>
        )}
      </MapGL>

      <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur rounded-lg px-4 py-3">
        <h1 className="text-lg font-semibold text-white">Jesus Film Project User Map</h1>
        <p className="text-sm text-gray-400">
          Hour: {currentHour.toString().padStart(2, '0')}:00
        </p>
      </div>

      <FilterControls
        activeSources={activeSources}
        onSourceToggle={handleSourceToggle}
        showViews={showViews}
        showJourneyViews={showJourneyViews}
        onToggleViews={() => setShowViews(!showViews)}
        onToggleJourneyViews={() => setShowJourneyViews(!showJourneyViews)}
      />

      <div className="absolute bottom-24 left-4 bg-gray-900/90 backdrop-blur rounded-lg px-4 py-3">
        <div className="text-xs text-gray-400 mb-2">Legend</div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-gray-300">Media Views</span>
        </div>
        <div className="flex items-center gap-2 text-sm mt-1">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-gray-300">Journey Views</span>
        </div>
      </div>

      <Timeline
        currentHour={currentHour}
        isPlaying={isPlaying}
        onHourChange={setCurrentHour}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        activeSources={activeSources}
        showViews={showViews}
        showJourneyViews={showJourneyViews}
        metrics={metrics}
      />
    </div>
  );
}