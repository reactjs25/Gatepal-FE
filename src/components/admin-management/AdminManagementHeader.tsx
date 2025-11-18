import React from 'react';
import { Search, Plus, Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

type AdminManagementHeaderProps = {
  onAddAdmin: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (value: string) => void;
  adminPageStart: number;
  adminPageEnd: number;
  totalAdmins: number;
};

export const AdminManagementHeader: React.FC<AdminManagementHeaderProps> = ({
  onAddAdmin,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  itemsPerPage,
  onItemsPerPageChange,
  adminPageStart,
  adminPageEnd,
  totalAdmins,
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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative flex-1 min-w-[250px] lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search by name, email, mobile, or society..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-3 lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-1.5" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span>Items per page</span>
            <Input
              type="number"
              min={1}
              className="w-20"
              value={itemsPerPage.toString()}
              onChange={(event) => onItemsPerPageChange(event.target.value)}
            />
            <span>
              {totalAdmins === 0 ? '0 of 0 items' : `${adminPageStart}-${adminPageEnd} of ${totalAdmins} items`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

