'use client';

import { useState, useRef, useEffect } from 'react';
import { Smartphone, Globe, Eye, ChevronDown, Search } from 'lucide-react';
import { DataSource } from '@/types';
import { sourceColors } from '@/data/metrics';

interface FilterControlsProps {
  activeSources: DataSource[];
  onSourceToggle: (source: DataSource) => void;
  showViews: boolean;
  onToggleViews: () => void;
  languages: string[];
  titles: string[];
  selectedLanguages: string[];
  selectedTitles: string[];
  onLanguageChange: (languages: string[]) => void;
  onTitleChange: (titles: string[]) => void;
}

const sourceLabels: Record<DataSource, string> = {
  app: 'App',
  web: 'Web',
};

const sourceIcons: Record<DataSource, React.ReactNode> = {
  app: <Smartphone size={16} />,
  web: <Globe size={16} />,
};

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  };

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  // Sort: selected items first, then alphabetical
  const sortedOptions = [...filteredOptions].sort((a, b) => {
    const aSelected = selected.includes(a);
    const bSelected = selected.includes(b);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return a.localeCompare(b);
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < sortedOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < sortedOptions.length) {
          toggle(sortedOptions[focusedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setSearch('');
        setFocusedIndex(-1);
        break;
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-option]');
      items[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  // Reset focus when search changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [search]);

  const selectAllFiltered = () => {
    const newSelected = [...new Set([...selected, ...filteredOptions])];
    onChange(newSelected);
  };

  const unselectedFilteredCount = filteredOptions.filter(opt => !selected.includes(opt)).length;

  return (
    <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-left flex items-center justify-between hover:bg-gray-700 transition-colors"
      >
        <span className="text-gray-300 truncate">
          {selected.length === 0 ? `All ${label}` : `${selected.length} selected`}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-64 max-h-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-700">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-12 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                {filteredOptions.length}/{options.length}
              </span>
            </div>
          </div>
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => {
                onChange([]);
                setSearch('');
              }}
              className="flex-1 px-3 py-1.5 text-left text-xs text-gray-400 hover:bg-gray-700"
            >
              Clear
            </button>
            {search && unselectedFilteredCount > 0 && (
              <button
                onClick={selectAllFiltered}
                className="flex-1 px-3 py-1.5 text-right text-xs text-blue-400 hover:bg-gray-700"
              >
                Select all {filteredOptions.length}
              </button>
            )}
          </div>
          <div ref={listRef} className="max-h-48 overflow-auto">
            {sortedOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
            ) : (
              sortedOptions.map((opt, index) => (
                <label
                  key={opt}
                  data-option
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${
                    index === focusedIndex
                      ? 'bg-gray-600'
                      : 'hover:bg-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={() => toggle(opt)}
                    className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                  />
                  <span className="text-sm text-gray-300 truncate">{opt}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FilterControls({
  activeSources,
  onSourceToggle,
  showViews,
  onToggleViews,
  languages,
  titles,
  selectedLanguages,
  selectedTitles,
  onLanguageChange,
  onTitleChange,
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

      <div className="mb-4 pb-4 border-b border-gray-700">
        <div className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wide">Filters</div>
        <div className="space-y-2">
          <MultiSelect
            label="Languages"
            options={languages}
            selected={selectedLanguages}
            onChange={onLanguageChange}
          />
          <MultiSelect
            label="Titles"
            options={titles}
            selected={selectedTitles}
            onChange={onTitleChange}
          />
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