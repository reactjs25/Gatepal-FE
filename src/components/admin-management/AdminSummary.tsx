import React from 'react';

type AdminSummaryProps = {
  filteredCount: number;
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
};

export const AdminSummary: React.FC<AdminSummaryProps> = ({
  filteredCount,
  totalCount,
  activeCount,
  inactiveCount,
}) => {
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
      <span>
        Showing {filteredCount} of {totalCount} admins
      </span>
      <div className="flex items-center gap-4">
        <span>Active: {activeCount}</span>
        <span>Inactive: {inactiveCount}</span>
      </div>
    </div>
  );
};

