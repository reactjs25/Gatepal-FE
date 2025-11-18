import React from 'react';
import { Users, MoreVertical, Edit, Power, Trash2, Key } from 'lucide-react';
import { SocietyAdmin } from '../../types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { formatDateDDMMYYYY } from '../../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

type AdminMobileCardsProps = {
  admins: SocietyAdmin[];
  onNavigateToSociety: (societyId: string) => void;
  onEdit: (admin: SocietyAdmin) => void;
  onResetPassword: (admin: SocietyAdmin) => void;
  onToggleStatus: (admin: SocietyAdmin) => void;
  onDelete: (admin: SocietyAdmin) => void;
  pendingAdminId: string | null;
};

export const AdminMobileCards: React.FC<AdminMobileCardsProps> = ({
  admins,
  onNavigateToSociety,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onDelete,
  pendingAdminId,
}) => {
  const isEmpty = admins.length === 0;

  if (isEmpty) {
    return (
      <div className="md:hidden space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No admins found
        </div>
      </div>
    );
  }

  return (
    <div className="md:hidden space-y-4">
      {admins.map((admin) => (
        <div
          key={admin.id}
          className="bg-white rounded-lg border border-gray-200 p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 truncate">{admin.name}</p>
                <Badge
                  variant={admin.status === 'Active' ? 'default' : 'secondary'}
                  className={
                    admin.status === 'Active'
                      ? 'bg-green-100 text-green-800 hover:bg-green-100 text-xs'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-100 text-xs'
                  }
                >
                  {admin.status}
                </Badge>
              </div>
            </div>
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
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Email</p>
              <p className="text-sm text-gray-900 break-all">{admin.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Mobile</p>
              <p className="text-sm text-gray-900">{admin.mobile}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200 flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">Society</p>
              <button
                onClick={() => onNavigateToSociety(admin.societyId)}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline truncate block"
              >
                {admin.societyName}
              </button>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Added On</p>
              <p className="text-xs text-gray-600">{formatDateDDMMYYYY(admin.createdAt)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

