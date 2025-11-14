import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useData } from '../context/DataContext';
import { SocietyAdmin } from '../types';
import { AdminManagementHeader } from '../components/admin-management/AdminManagementHeader';
import { AdminDesktopTable } from '../components/admin-management/AdminDesktopTable';
import { AdminMobileCards } from '../components/admin-management/AdminMobileCards';
import { AdminSummary } from '../components/admin-management/AdminSummary';
import { EditAdminDialog } from '../components/admin-management/EditAdminDialog';
import { AddAdminDialog, NewAdminForm } from '../components/admin-management/AddAdminDialog';
type EditableAdminFields = Pick<SocietyAdmin, 'name' | 'email' | 'mobile'>;

const initialNewAdminForm: NewAdminForm = {
  name: '',
  email: '',
  mobile: '',
  societyId: '',
};

export const AdminManagement: React.FC = () => {
  const {
    allAdmins,
    societies,
    createSocietyAdmin,
    updateSocietyAdmin,
    toggleSocietyAdminStatus,
    deleteSocietyAdmin,
  } = useData();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAdmin, setEditingAdmin] = useState<SocietyAdmin | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState<NewAdminForm>(initialNewAdminForm);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [pendingAdminId, setPendingAdminId] = useState<string | null>(null);

  const filteredAdmins = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return allAdmins;
    }

    return allAdmins.filter(
      (admin) =>
        admin.name.toLowerCase().includes(query) ||
        admin.email.toLowerCase().includes(query) ||
        admin.societyName.toLowerCase().includes(query)
    );
  }, [allAdmins, searchQuery]);

  const { activeCount, inactiveCount } = useMemo(() => {
    return allAdmins.reduce(
      (counts, admin) => {
        if (admin.status === 'Active') {
          counts.activeCount += 1;
        } else {
          counts.inactiveCount += 1;
        }
        return counts;
      },
      { activeCount: 0, inactiveCount: 0 }
    );
  }, [allAdmins]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleNavigateToSociety = (societyId: string) => {
    navigate(`/societies/${societyId}`);
  };

  const handleEdit = (admin: SocietyAdmin) => {
    setEditingAdmin({ ...admin });
    setIsEditDialogOpen(true);
  };

  const handleEditFieldChange = <Field extends keyof EditableAdminFields>(
    field: Field,
    value: EditableAdminFields[Field]
  ) => {
    setEditingAdmin((previous) =>
      previous
        ? {
            ...previous,
            [field]: value,
          }
        : previous
    );
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingAdmin(null);
  };

  const handleSaveEdit = async () => {
    if (!editingAdmin) {
      return;
    }

    try {
      setIsSavingEdit(true);
      await updateSocietyAdmin(editingAdmin.societyId, editingAdmin.id, {
        name: editingAdmin.name,
        email: editingAdmin.email,
        mobile: editingAdmin.mobile,
      });
      toast.success('Admin updated successfully');
      closeEditDialog();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update admin. Please try again.';
      toast.error(message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleStatus = async (admin: SocietyAdmin) => {
    try {
      setPendingAdminId(admin.id);
      const updated = await toggleSocietyAdminStatus(admin.societyId, admin.id);
      toast.success(`Admin ${updated.status === 'Active' ? 'activated' : 'deactivated'}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update admin status. Please try again.';
      toast.error(message);
    } finally {
      setPendingAdminId(null);
    }
  };

  const handleDelete = async (admin: SocietyAdmin) => {
    const confirmed = confirm(`Are you sure you want to remove ${admin.name} as an admin?`);
    if (!confirmed) {
      return;
    }

    try {
      setPendingAdminId(admin.id);
      await deleteSocietyAdmin(admin.societyId, admin.id);
      toast.success('Admin removed successfully');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to remove admin. Please try again.';
      toast.error(message);
    } finally {
      setPendingAdminId(null);
    }
  };

  const handleResetPassword = (adminEmail: string) => {
    toast.success(`Password reset link sent to ${adminEmail}`);
  };

  const handleAddDialogClose = () => {
    setIsAddDialogOpen(false);
  };

  const handleNewAdminFieldChange = <Field extends keyof NewAdminForm>(
    field: Field,
    value: NewAdminForm[Field]
  ) => {
    setNewAdmin((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.mobile || !newAdmin.societyId) {
      toast.error('Please fill in all fields');
      return;
    }

    const society = societies.find((candidate) => candidate.id === newAdmin.societyId);
    if (!society) {
      toast.error('Please select a valid society');
      return;
    }

    try {
      setIsAddingAdmin(true);
      const created = await createSocietyAdmin(society.id, {
        name: newAdmin.name,
        email: newAdmin.email,
        mobile: newAdmin.mobile,
      });

      toast.success(`Admin added to ${created.societyName} successfully`);
      setNewAdmin(initialNewAdminForm);
      handleAddDialogClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to add admin. Please try again.';
      toast.error(message);
    } finally {
      setIsAddingAdmin(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <AdminManagementHeader
        onAddAdmin={() => setIsAddDialogOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      <AdminDesktopTable
        admins={filteredAdmins}
        onNavigateToSociety={handleNavigateToSociety}
        onEdit={handleEdit}
        onResetPassword={handleResetPassword}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        pendingAdminId={pendingAdminId}
      />

      <AdminMobileCards
        admins={filteredAdmins}
        onNavigateToSociety={handleNavigateToSociety}
        onEdit={handleEdit}
        onResetPassword={handleResetPassword}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        pendingAdminId={pendingAdminId}
      />

      <AdminSummary
        filteredCount={filteredAdmins.length}
        totalCount={allAdmins.length}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
      />

      <EditAdminDialog
        isOpen={isEditDialogOpen}
        admin={editingAdmin}
        onClose={closeEditDialog}
        onChange={handleEditFieldChange}
        onSubmit={handleSaveEdit}
        isSubmitting={isSavingEdit}
      />

      <AddAdminDialog
        isOpen={isAddDialogOpen}
        form={newAdmin}
        societies={societies}
        onClose={handleAddDialogClose}
        onChange={handleNewAdminFieldChange}
        onSubmit={handleAddAdmin}
        isSubmitting={isAddingAdmin}
      />
    </div>
  );
};
