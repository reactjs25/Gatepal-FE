import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  MoreVertical,
  Edit,
  Eye,
  Power,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';

export const SocietyList: React.FC = () => {
  const { societies, toggleSocietyStatus, isLoadingSocieties, societiesError } = useData();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [togglingSocietyId, setTogglingSocietyId] = useState<string | null>(null);

  const filteredSocieties = societies.filter((society) => {
    const matchesSearch =
      society.societyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      society.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      society.societyPin.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || society.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleStatusToggle = async (societyId: string) => {
    try {
      setTogglingSocietyId(societyId);
      const updated = await toggleSocietyStatus(societyId);
      const isActive = updated.status === 'Active';
      toast.success(`Society ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update society status. Please try again.';
      toast.error(message);
    } finally {
      setTogglingSocietyId(null);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-gray-900 mb-2">Societies</h1>
            <p className="text-gray-600">Manage all registered societies</p>
          </div>
          <Button onClick={() => navigate('/societies/new')}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Society
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by name, location, or PIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-1.5" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Trial">Trial</SelectItem>

            </SelectContent>
          </Select>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-1.5" />
            Import
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Societies Table - Desktop */}
      <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>Society Name</TableHead>
              <TableHead>PIN</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Wings</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>Admins</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingSocieties ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  Loading societies...
                </TableCell>
              </TableRow>
            ) : filteredSocieties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No societies found
                </TableCell>
              </TableRow>
            ) : (
              filteredSocieties.map((society) => (
                <TableRow 
                  key={society.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/societies/${society.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-gray-900">{society.societyName}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {society.societyPin}
                    </code>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-gray-600 truncate">{society.address}</p>
                  </TableCell>
                  <TableCell>{society.totalWings}</TableCell>
                  <TableCell>
                    {society.wings.reduce((sum, wing) => sum + wing.totalUnits, 0)}
                  </TableCell>
                  <TableCell>{society.societyAdmins.length}</TableCell>
                  <TableCell>
                    <Badge
                      variant={society.status === 'Active' ? 'default' : 'secondary'}
                      className={
                        society.status === 'Active'
                          ? 'bg-green-100 text-green-800 hover:bg-green-100'
                          : society.status === 'Inactive'
                          ? 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                          : society.status === 'Trial'
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                          : 'bg-red-100 text-red-800 hover:bg-red-100'
                      }
                    >
                      {society.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="text-gray-600">
                        {new Date(society.engagementStartDate).toLocaleDateString()} -
                      </p>
                      <p className="text-gray-600">
                        {new Date(society.engagementEndDate).toLocaleDateString()}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/societies/${society.id}`)}>
                          <Eye className="w-4 h-4 mr-1.5" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate(`/societies/${society.id}/edit`)}
                        >
                          <Edit className="w-4 h-4 mr-1.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            if (togglingSocietyId === society.id) return;
                            await handleStatusToggle(society.id);
                          }}
                          disabled={togglingSocietyId === society.id}
                        >
                          <Power className="w-4 h-4 mr-1.5" />
                          {society.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Societies Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {isLoadingSocieties ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            Loading societies...
          </div>
        ) : filteredSocieties.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            No societies found
          </div>
        ) : (
          filteredSocieties.map((society) => (
            <div
              key={society.id}
              className="bg-white rounded-lg border border-gray-200 p-4 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 truncate">{society.societyName}</p>
                    <code className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {society.societyPin}
                    </code>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/societies/${society.id}`)}>
                      <Eye className="w-4 h-4 mr-1.5" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate(`/societies/${society.id}/edit`)}
                    >
                      <Edit className="w-4 h-4 mr-1.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        if (togglingSocietyId === society.id) return;
                        await handleStatusToggle(society.id);
                      }}
                      disabled={togglingSocietyId === society.id}
                    >
                      <Power className="w-4 h-4 mr-1.5" />
                      {society.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Location */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Location</p>
                <p className="text-sm text-gray-900">{society.address}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500 mb-1">Wings</p>
                  <p className="text-gray-900">{society.totalWings}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500 mb-1">Units</p>
                  <p className="text-gray-900">
                    {society.wings.reduce((sum, wing) => sum + wing.totalUnits, 0)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500 mb-1">Admins</p>
                  <p className="text-gray-900">{society.societyAdmins.length}</p>
                </div>
              </div>

              {/* Status & Engagement */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <Badge
                    variant={society.status === 'Active' ? 'default' : 'secondary'}
                    className={
                      society.status === 'Active'
                        ? 'bg-green-100 text-green-800 hover:bg-green-100'
                        : society.status === 'Inactive'
                        ? 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                        : society.status === 'Trial'
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                        : 'bg-red-100 text-red-800 hover:bg-red-100'
                    }
                  >
                    {society.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Engagement</p>
                  <p className="text-xs text-gray-600">
                    {new Date(society.engagementStartDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    -{' '}
                    {new Date(society.engagementEndDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-600">
        Showing {filteredSocieties.length} of {societies.length} societies
      </div>
      {societiesError && (
        <div className="mt-2 text-sm text-red-600" role="alert">
          {societiesError}
        </div>
      )}
    </div>
  );
};
