import React, { useState } from 'react';
import { JobFilter, JobSortField, SortDirection, JobStatus } from '../types';

interface JobFiltersProps {
  onFilterChange: (filter: JobFilter) => void;
  onSortChange: (sortBy: JobSortField, sortDir: SortDirection) => void;
  currentFilter: JobFilter;
  currentSortBy: JobSortField;
  currentSortDir: SortDirection;
}

export const JobFilters: React.FC<JobFiltersProps> = ({
  onFilterChange,
  onSortChange,
  currentFilter,
  currentSortBy,
  currentSortDir,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStatusChange = (status: JobStatus | '') => {
    onFilterChange({
      ...currentFilter,
      status: status || undefined,
    });
  };

  const handleMinPaymentChange = (value: string) => {
    onFilterChange({
      ...currentFilter,
      minPayment: value ? parseFloat(value) : undefined,
    });
  };

  const handleMaxPaymentChange = (value: string) => {
    onFilterChange({
      ...currentFilter,
      maxPayment: value ? parseFloat(value) : undefined,
    });
  };

  const handleSortChange = (field: JobSortField) => {
    if (currentSortBy === field) {
      onSortChange(field, currentSortDir === 'Asc' ? 'Desc' : 'Asc');
    } else {
      onSortChange(field, 'Desc');
    }
  };

  const clearFilters = () => {
    onFilterChange({});
    onSortChange('CreatedAt', 'Desc');
  };

  const hasActiveFilters = currentFilter.status || currentFilter.minPayment || currentFilter.maxPayment;

  return (
    <div className="bg-mc-ui-bg border-2 border-mc-ui-border-light p-4 mb-4">
      <div className="flex justify-between items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-mc-text-dark hover:text-white text-sm"
        >
          <svg
            className={`w-4 h-4 mr-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Filters & Sorting
          {hasActiveFilters && (
            <span className="ml-2 bg-mc-diamond text-white text-xs px-2 py-0.5 rounded">
              Active
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-mc-redstone hover:text-red-300"
          >
            Clear All
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-xs text-mc-text-dark mb-1">Status</label>
            <select
              value={currentFilter.status || ''}
              onChange={(e) => handleStatusChange(e.target.value as JobStatus | '')}
              className="w-full bg-mc-ui-bg-dark border-2 border-mc-ui-border-dark text-white p-2 text-sm"
            >
              <option value="">All Statuses</option>
              <option value={JobStatus.Posted}>Posted</option>
              <option value={JobStatus.InProgress}>In Progress</option>
              <option value={JobStatus.Completed}>Completed</option>
            </select>
          </div>

          {/* Min Payment */}
          <div>
            <label className="block text-xs text-mc-text-dark mb-1">Min Payment</label>
            <input
              type="number"
              value={currentFilter.minPayment || ''}
              onChange={(e) => handleMinPaymentChange(e.target.value)}
              placeholder="0"
              className="w-full bg-mc-ui-bg-dark border-2 border-mc-ui-border-dark text-white p-2 text-sm"
            />
          </div>

          {/* Max Payment */}
          <div>
            <label className="block text-xs text-mc-text-dark mb-1">Max Payment</label>
            <input
              type="number"
              value={currentFilter.maxPayment || ''}
              onChange={(e) => handleMaxPaymentChange(e.target.value)}
              placeholder="No limit"
              className="w-full bg-mc-ui-bg-dark border-2 border-mc-ui-border-dark text-white p-2 text-sm"
            />
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-xs text-mc-text-dark mb-1">Sort By</label>
            <div className="flex gap-1">
              {(['CreatedAt', 'Payment', 'Id'] as JobSortField[]).map((field) => (
                <button
                  key={field}
                  onClick={() => handleSortChange(field)}
                  className={`flex-1 p-2 text-xs border-2 transition-colors ${
                    currentSortBy === field
                      ? 'bg-mc-diamond text-white border-mc-ui-border-dark'
                      : 'bg-mc-ui-bg-dark text-mc-text-dark border-mc-ui-border-dark hover:bg-mc-stone'
                  }`}
                >
                  {field === 'CreatedAt' ? 'Date' : field}
                  {currentSortBy === field && (
                    <span className="ml-1">{currentSortDir === 'Asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobFilters;
