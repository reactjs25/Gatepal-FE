import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useData } from "../context/DataContext";
import { SocietyAdmin } from "../types";
import { Button } from "../components/ui/button";
import { AdminManagementHeader } from "../components/admin-management/AdminManagementHeader";
import { AdminDesktopTable } from "../components/admin-management/AdminDesktopTable";
import { AdminMobileCards } from "../components/admin-management/AdminMobileCards";
import { EditAdminDialog } from "../components/admin-management/EditAdminDialog";
import {
  AddAdminDialog,
  NewAdminForm,
} from "../components/admin-management/AddAdminDialog";
import { formatDateDDMMYYYY } from "../lib/utils";

type SortField =
  | "name"
  | "email"
  | "mobile"
  | "societyName"
  | "status"
  | "createdAt";
type SortDirection = "asc" | "desc";

type EditableAdminFields = Pick<SocietyAdmin, "name" | "email" | "mobile">;

const initialNewAdminForm: NewAdminForm = {
  name: "",
  email: "",
  mobile: "",
  societyId: "",
};

export const AdminManagement: React.FC = () => {
  const {
    allAdmins,
    societies,
    createSocietyAdmin,
    updateSocietyAdmin,
    toggleSocietyAdminStatus,
    deleteSocietyAdmin,
    sendSocietyAdminPasswordReset,
  } = useData();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAdmin, setEditingAdmin] = useState<SocietyAdmin | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState<NewAdminForm>(initialNewAdminForm);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [pendingAdminId, setPendingAdminId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Update page title
  useEffect(() => {
    document.title = "Society Admins - GatePal";
  }, []);

  const filteredAndSortedAdmins = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // First apply status filter
    let filtered = allAdmins.filter((admin) => {
      return statusFilter === "all" || admin.status === statusFilter;
    });

    // Then apply search filter if query exists
    if (query && query.length > 0) {
      filtered = filtered.filter((admin) => {
        // Search matching - check all fields with null/undefined safety
        const adminName = String(admin.name || "")
          .toLowerCase()
          .trim();
        const adminEmail = String(admin.email || "")
          .toLowerCase()
          .trim();
        const adminSociety = String(admin.societyName || "")
          .toLowerCase()
          .trim();
        const adminMobile = String(admin.mobile || "").replace(/\D/g, "");
        const adminStatus = String(admin.status || "")
          .toLowerCase()
          .trim();
        const queryDigits = query.replace(/\D/g, "");

        // Check name
        const matchesName = adminName.length > 0 && adminName.includes(query);

        // Check email
        const matchesEmail =
          adminEmail.length > 0 && adminEmail.includes(query);

        // Check society
        const matchesSociety =
          adminSociety.length > 0 && adminSociety.includes(query);

        // Check mobile (only if query has digits)
        const matchesMobile =
          queryDigits.length > 0 &&
          adminMobile.length > 0 &&
          adminMobile.includes(queryDigits);

        // Check date (Added On) - try different date formats
        let matchesDate = false;
        if (admin.createdAt) {
          try {
            const date = new Date(admin.createdAt);
            if (!isNaN(date.getTime())) {
              const formattedDate = formatDateDDMMYYYY(date);
              if (formattedDate !== "-") {
                const formattedLower = formattedDate.toLowerCase();
                const slashVariant = formattedDate
                  .replace(/-/g, "/")
                  .toLowerCase();
                const dotVariant = formattedDate
                  .replace(/-/g, ".")
                  .toLowerCase();
                const compactVariant = formattedDate.replace(/-/g, "");
                const isoDate = date.toISOString().split("T")[0];
                const year = date.getFullYear().toString();
                matchesDate =
                  formattedLower.includes(query) ||
                  slashVariant.includes(query) ||
                  dotVariant.includes(query) ||
                  isoDate.includes(query) ||
                  (queryDigits.length > 0 &&
                    compactVariant.includes(queryDigits)) ||
                  year.includes(query);
              }
            }
          } catch (e) {
            console.error(e);
          }
        }

        const statusMatches =
          adminStatus.length > 0 &&
          (["active", "inactive", "trial"].includes(query)
            ? adminStatus === query
            : adminStatus.includes(query));

        return (
          matchesName ||
          matchesEmail ||
          matchesSociety ||
          matchesMobile ||
          matchesDate ||
          statusMatches
        );
      });
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "email":
            aValue = a.email.toLowerCase();
            bValue = b.email.toLowerCase();
            break;
          case "mobile":
            aValue = a.mobile;
            bValue = b.mobile;
            break;
          case "societyName":
            aValue = a.societyName.toLowerCase();
            bValue = b.societyName.toLowerCase();
            break;
          case "status":
            aValue = a.status;
            bValue = b.status;
            break;
          case "createdAt":
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [allAdmins, searchQuery, statusFilter, sortField, sortDirection]);

  const paginatedAdmins = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedAdmins.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedAdmins, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedAdmins.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    // Reset to first page when sorting changes
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      setItemsPerPage(parsed);
      setCurrentPage(1);
    }
  };

  const totalAdmins = filteredAndSortedAdmins.length;
  const adminPageStart =
    totalAdmins === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const adminPageEnd =
    totalAdmins === 0 ? 0 : Math.min(currentPage * itemsPerPage, totalAdmins);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Reset to first page when search changes
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    // Reset to first page when status filter changes
    setCurrentPage(1);
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
      toast.success("Admin updated successfully");
      closeEditDialog();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update admin. Please try again.";
      toast.error(message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleStatus = async (admin: SocietyAdmin) => {
    try {
      setPendingAdminId(admin.id);
      const updated = await toggleSocietyAdminStatus(admin.societyId, admin.id);
      toast.success(
        `Admin ${updated.status === "Active" ? "activated" : "deactivated"}`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update admin status. Please try again.";
      toast.error(message);
    } finally {
      setPendingAdminId(null);
    }
  };

  const handleDelete = async (admin: SocietyAdmin) => {
    const confirmed = confirm(
      `Are you sure you want to remove ${admin.name} as an admin?`
    );
    if (!confirmed) {
      return;
    }

    try {
      setPendingAdminId(admin.id);
      await deleteSocietyAdmin(admin.societyId, admin.id);
      toast.success("Admin removed successfully");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to remove admin. Please try again.";
      toast.error(message);
    } finally {
      setPendingAdminId(null);
    }
  };

  const handleResetPassword = async (admin: SocietyAdmin) => {
    try {
      setPendingAdminId(admin.id);
      const message = await sendSocietyAdminPasswordReset(
        admin.societyId,
        admin.id
      );
      toast.success(message || `Password reset link sent to ${admin.email}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to send password reset email. Please try again.";
      toast.error(message);
    } finally {
      setPendingAdminId(null);
    }
  };

  const handleAddDialogClose = () => {
    setIsAddDialogOpen(false);
    // Clear form when dialog closes
    setNewAdmin(initialNewAdminForm);
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
    if (
      !newAdmin.name ||
      !newAdmin.email ||
      !newAdmin.mobile ||
      !newAdmin.societyId
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    const society = societies.find(
      (candidate) => candidate.id === newAdmin.societyId
    );
    if (!society) {
      toast.error("Please select a valid society");
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
        error instanceof Error
          ? error.message
          : "Failed to add admin. Please try again.";
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
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        adminPageStart={adminPageStart}
        adminPageEnd={adminPageEnd}
        totalAdmins={totalAdmins}
      />

      <AdminDesktopTable
        admins={paginatedAdmins}
        onNavigateToSociety={handleNavigateToSociety}
        onEdit={handleEdit}
        onResetPassword={handleResetPassword}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        pendingAdminId={pendingAdminId}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
      />

      <AdminMobileCards
        admins={paginatedAdmins}
        onNavigateToSociety={handleNavigateToSociety}
        onEdit={handleEdit}
        onResetPassword={handleResetPassword}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        pendingAdminId={pendingAdminId}
      />

      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

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
        allAdmins={allAdmins}
        onClose={handleAddDialogClose}
        onChange={handleNewAdminFieldChange}
        onSubmit={handleAddAdmin}
        isSubmitting={isAddingAdmin}
      />
    </div>
  );
};
