'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DataSource } from '@/types';
import { aggregateByCityHour, dataSources, sourceColors, dummyMetrics } from '@/data/dummy';
import Timeline from './Timeline';
import FilterControls from './FilterControls';

const CARTO_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';


export default function GospelMap() {

  const [currentHour, setCurrentHour] = useState(12);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSources, setActiveSources] = useState<DataSource[]>([...dataSources]);
  const [showViews, setShowViews] = useState(true);
  const [showExposures, setShowExposures] = useState(true);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [popupInfo, setPopupInfo] = useState<{
    cityId: string;
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentHour(h => (h + 1) % 24);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isPlaying]);

  const cityData = useMemo(() => {
    return aggregateByCityHour(currentHour, dummyMetrics, activeSources, showViews, showExposures);
  }, [currentHour, activeSources, showViews, showExposures]);

  const maxViews = useMemo(() => {
    return Math.max(...cityData.map(d => d.views), 1);
  }, [cityData]);

  const maxExposures = useMemo(() => {
    return Math.max(...cityData.map(d => d.exposures), 1);
  }, [cityData]);

  const handleSourceToggle = useCallback((source: DataSource) => {
    setActiveSources(current => {
      if (current.includes(source)) {
        return current.filter(s => s !== source);
      }
      return [...current, source];
    });
  }, []);

  const getMarkerSize = (value: number, maxValue: number) => {
    const minSize = 8;
    const maxSize = 40;
    const normalized = value / maxValue;
    return minSize + normalized * (maxSize - minSize);
  };

  return (
    <div className="relative h-full w-full">
      <Map
        initialViewState={{
          longitude: 0,
          latitude: 20,
          zoom: 1.5,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={CARTO_DARK}
        attributionControl={false}
      >
        <NavigationControl position="top-right" />

        {showViews && cityData.map(data => (
          <Marker
            key={`view-${data.city.id}`}
            longitude={data.city.lng}
            latitude={data.city.lat}
            anchor="center"
          >
            <div
              className="rounded-full cursor-pointer transition-all duration-300 ease-out"
              style={{
                width: getMarkerSize(data.views, maxViews),
                height: getMarkerSize(data.views, maxViews),
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                border: '2px solid rgba(59, 130, 246, 0.9)',
                boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                transform: hoveredCity === data.city.id ? 'scale(1.2)' : 'scale(1)',
              }}
              onMouseEnter={() => setHoveredCity(data.city.id)}
              onMouseLeave={() => setHoveredCity(null)}
              onClick={() => setPopupInfo({
                cityId: data.city.id,
                lat: data.city.lat,
                lng: data.city.lng,
              })}
            />
          </Marker>
        ))}

        {showExposures && cityData.map(data => (
          <Marker
            key={`exposure-${data.city.id}`}
            longitude={data.city.lng + 0.5}
            latitude={data.city.lat + 0.3}
            anchor="center"
          >
            <div
              className="rounded-full cursor-pointer transition-all duration-300 ease-out"
              style={{
                width: getMarkerSize(data.exposures, maxExposures),
                height: getMarkerSize(data.exposures, maxExposures),
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                border: '2px solid rgba(16, 185, 129, 0.9)',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
                transform: hoveredCity === data.city.id ? 'scale(1.2)' : 'scale(1)',
              }}
              onMouseEnter={() => setHoveredCity(data.city.id)}
              onMouseLeave={() => setHoveredCity(null)}
              onClick={() => setPopupInfo({
                cityId: data.city.id,
                lat: data.city.lat,
                lng: data.city.lng,
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
              const data = cityData.find(d => d.city.id === popupInfo.cityId);
              if (!data) return null;
              
              return (
                <div className="text-sm">
                  <div className="font-semibold text-white mb-2">
                    {data.city.name}, {data.city.country}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-blue-400">Views:</span>
                      <span>{data.views.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-emerald-400">Exposures:</span>
                      <span>{data.exposures.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-600 text-xs">
                    {dataSources.map(source => {
                      const sourceData = data.bySource[source];
                      if (sourceData.views === 0 && sourceData.exposures === 0) return null;
                      return (
                        <div key={source} className="flex justify-between gap-2">
                          <span style={{ color: sourceColors[source] }}>{source}:</span>
                          <span>{sourceData.views}v / {sourceData.exposures}e</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </Popup>
        )}
      </Map>

      <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur rounded-lg px-4 py-3">
        <h1 className="text-lg font-semibold text-white">Gospel Map</h1>
        <p className="text-sm text-gray-400">
          Hour: {currentHour.toString().padStart(2, '0')}:00
        </p>
      </div>

      <FilterControls
        activeSources={activeSources}
        onSourceToggle={handleSourceToggle}
        showViews={showViews}
        showExposures={showExposures}
        onToggleViews={() => setShowViews(!showViews)}
        onToggleExposures={() => setShowExposures(!showExposures)}
      />

      <div className="absolute bottom-24 left-4 bg-gray-900/90 backdrop-blur rounded-lg px-4 py-3">
        <div className="text-xs text-gray-400 mb-2">Legend</div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-gray-300">Views</span>
        </div>
        <div className="flex items-center gap-2 text-sm mt-1">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-gray-300">Exposures</span>
        </div>
      </div>

      <Timeline
        currentHour={currentHour}
        isPlaying={isPlaying}
        onHourChange={setCurrentHour}
        onPlayPause={() => setIsPlaying(!isPlaying)}
      />
    </div>
  );
}