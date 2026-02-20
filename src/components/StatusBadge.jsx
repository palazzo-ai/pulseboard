import React, { useState, useRef, useEffect } from 'react';

const STATUSES = {
  not_started: { label: 'Not Started', color: '#9CA3AF', dotColor: '#D1D5DB', bgColor: '#F3F4F6' },
  in_progress: { label: 'In Progress', color: '#2563EB', dotColor: '#3B82F6', bgColor: '#EFF6FF' },
  done: { label: 'Done', color: '#16A34A', dotColor: '#22C55E', bgColor: '#F0FDF4' },
  blocked: { label: 'Blocked', color: '#DC2626', dotColor: '#EF4444', bgColor: '#FEF2F2' }
};

export const StatusBadge = ({ status, onStatusChange, size = 'sm' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const statusInfo = STATUSES[status] || STATUSES.not_started;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleClick = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleSelect = (e, newStatus) => {
    e.stopPropagation();
    if (newStatus !== status) {
      onStatusChange(newStatus);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1 rounded-[10px] text-[10px] font-medium hover:ring-1 hover:ring-slate-300 transition-all cursor-pointer"
        style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color, padding: '1px 7px 1px 5px' }}
        title="Click to change status"
      >
        <span
          className="flex-shrink-0 rounded-full"
          style={{ width: 5, height: 5, backgroundColor: statusInfo.dotColor }}
        />
        {statusInfo.label}
        <svg className="w-2.5 h-2.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-[100] py-1 min-w-[110px]">
          {Object.entries(STATUSES).map(([key, { label, color, dotColor }]) => (
            <button
              key={key}
              onClick={(e) => handleSelect(e, key)}
              className={`w-full px-2 py-1.5 text-left text-[10px] text-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                status === key ? 'bg-slate-50' : ''
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }}></span>
              <span className="flex-1" style={{ color }}>{label}</span>
              {status === key && (
                <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
