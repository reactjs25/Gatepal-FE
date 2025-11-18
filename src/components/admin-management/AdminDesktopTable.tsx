import React from 'react';
import { Users, MoreVertical, Edit, Power, Trash2, Key } from 'lucide-react';
import { SocietyAdmin } from '../../types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { formatDateDDMMYYYY } from '../../lib/utils';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Paper from '@mui/material/Paper';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

type SortField = 'name' | 'email' | 'mobile' | 'societyName' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

type AdminDesktopTableProps = {
  admins: SocietyAdmin[];
  onNavigateToSociety: (societyId: string) => void;
  onEdit: (admin: SocietyAdmin) => void;
  onResetPassword: (admin: SocietyAdmin) => void;
  onToggleStatus: (admin: SocietyAdmin) => void;
  onDelete: (admin: SocietyAdmin) => void;
  pendingAdminId: string | null;
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
};

export const AdminDesktopTable: React.FC<AdminDesktopTableProps> = ({
  admins,
  onNavigateToSociety,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onDelete,
  pendingAdminId,
  sortField,
  sortDirection,
  onSort,
}) => {
  const isEmpty = admins.length === 0;

  const columns: { label: string; field: SortField }[] = [
    { label: 'Admin Name', field: 'name' },
    { label: 'Email', field: 'email' },
    { label: 'Mobile', field: 'mobile' },
    { label: 'Society', field: 'societyName' },
    { label: 'Status', field: 'status' },
    { label: 'Added On', field: 'createdAt' },
  ];

  return (
    <div className="hidden md:block">
      <TableContainer component={Paper} className="rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableHead>
            <TableRow>
              {columns.map(({ label, field }) => (
                <TableCell key={field}>
                  <TableSortLabel
                    active={sortField === field}
                    direction={sortField === field ? sortDirection : 'asc'}
                    onClick={() => onSort(field)}
                  >
                    {label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isEmpty ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" className="py-8 text-gray-500">
                  No admins found
                </TableCell>
              </TableRow>
            ) : (
              admins.map((admin) => (
                <TableRow key={admin.id} hover>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-gray-900">{admin.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">{admin.email}</TableCell>
                  <TableCell className="text-gray-600">{admin.mobile}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => onNavigateToSociety(admin.societyId)}
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {admin.societyName}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={admin.status === 'Active' ? 'default' : 'secondary'}
                      className={
                        admin.status === 'Active'
                          ? 'bg-green-100 text-green-800 hover:bg-green-100'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                      }
                    >
                      {admin.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {formatDateDDMMYYYY(admin.createdAt)}
                  </TableCell>
                  <TableCell align="right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(admin)}>
                          <Edit className="w-4 h-4 mr-1.5" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onResetPassword(admin)}
                          disabled={pendingAdminId === admin.id}
                        >
                          <Key className="w-4 h-4 mr-1.5" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onToggleStatus(admin)}
                          disabled={pendingAdminId === admin.id}
                        >
                          <Power className="w-4 h-4 mr-1.5" />
                          {admin.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => onDelete(admin)}
                          disabled={pendingAdminId === admin.id}
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Remove Admin
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

