import React, { useState, useRef, useEffect } from 'react';

const STATUSES = {
  not_started: { label: 'Not Started', color: '#6b7280', bgColor: '#6b728020' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bgColor: '#3b82f620' },
  done: { label: 'Done', color: '#22c55e', bgColor: '#22c55e20' },
  blocked: { label: 'Blocked', color: '#ef4444', bgColor: '#ef444420' }
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

  const sizeClasses = {
    xs: 'px-1 py-0.5 text-[8px]',
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs'
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleClick}
        className={`${sizeClasses[size]} rounded font-medium flex items-center gap-0.5 hover:ring-1 hover:ring-white/30 transition-all cursor-pointer`}
        style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
        title="Click to change status"
      >
        {statusInfo.label}
        <svg className={`${size === 'xs' ? 'w-2 h-2' : 'w-2.5 h-2.5'} opacity-60`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-[100] py-1 min-w-[110px]">
          {Object.entries(STATUSES).map(([key, { label, color }]) => (
            <button
              key={key}
              onClick={(e) => handleSelect(e, key)}
              className={`w-full px-2 py-1.5 text-left text-[10px] flex items-center gap-2 hover:bg-slate-700 transition-colors ${
                status === key ? 'bg-slate-700' : ''
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></span>
              <span className="flex-1" style={{ color }}>{label}</span>
              {status === key && (
                <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
