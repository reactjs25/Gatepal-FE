import React from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

type AdminManagementHeaderProps = {
  onAddAdmin: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
};

export const AdminManagementHeader: React.FC<AdminManagementHeaderProps> = ({
  onAddAdmin,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-gray-900 mb-2">Society Admins</h1>
          <p className="text-gray-600">Manage all society administrators</p>
        </div>
        <Button onClick={onAddAdmin}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Admin
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search by name, email, or society..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  );
};

