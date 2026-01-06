import React, { useState, useRef, useEffect } from 'react';

// Multi-select filter dropdown component
export default function MultiSelectFilter({
  label,
  options, // Array of { id, name, color? }
  selected, // Array of selected ids
  onChange, // (newSelected: string[]) => void
  allLabel = 'All',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => {
    onChange([]);
  };

  const selectOnly = (id, e) => {
    e.stopPropagation();
    onChange([id]);
  };

  const selectedCount = selected.length;
  const displayText = selectedCount === 0 
    ? allLabel 
    : selectedCount === 1 
      ? options.find(o => o.id === selected[0])?.name || selected[0]
      : `${selectedCount} selected`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
          ${selectedCount > 0 
            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50' 
            : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
          }
        `}
      >
        <span className="text-slate-500">{label}:</span>
        <span>{displayText}</span>
        <svg 
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[200px] bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          {/* All option */}
          <button
            onClick={selectAll}
            className={`
              w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors
              ${selectedCount === 0 
                ? 'bg-indigo-600/20 text-indigo-300' 
                : 'text-slate-300 hover:bg-slate-700'
              }
            `}
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedCount === 0 ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600'}`}>
              {selectedCount === 0 && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="flex-1">{allLabel}</span>
          </button>

          <div className="border-t border-slate-700" />

          {/* Options */}
          <div className="max-h-[300px] overflow-y-auto">
            {options.map(option => {
              const isSelected = selected.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => toggleOption(option.id)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors group
                    ${isSelected ? 'bg-indigo-600/10' : 'hover:bg-slate-700'}
                  `}
                >
                  {/* Checkbox */}
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600'}`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Color dot */}
                  {option.color && (
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: option.color }}
                    />
                  )}

                  {/* Label */}
                  <span className={`flex-1 ${isSelected ? 'text-indigo-300' : 'text-slate-300'}`}>
                    {option.name}
                  </span>

                  {/* Only button */}
                  <span 
                    onClick={(e) => selectOnly(option.id, e)}
                    className="text-[10px] text-slate-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    only
                  </span>
                </button>
              );
            })}
          </div>

          {/* Clear button */}
          {selectedCount > 0 && (
            <>
              <div className="border-t border-slate-700" />
              <button
                onClick={selectAll}
                className="w-full px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
