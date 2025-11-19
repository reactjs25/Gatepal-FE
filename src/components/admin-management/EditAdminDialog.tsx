import React from 'react';
import { SocietyAdmin } from '../../types';
import { ADMIN_NAME_MAX_LENGTH } from '../../constants';
import { CharacterLimitHint } from '../CharacterLimitHint';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

type EditableFields = Pick<SocietyAdmin, 'name' | 'email' | 'mobile'>;

type EditAdminDialogProps = {
  isOpen: boolean;
  admin: SocietyAdmin | null;
  onClose: () => void;
  onChange: <Field extends keyof EditableFields>(field: Field, value: EditableFields[Field]) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export const EditAdminDialog: React.FC<EditAdminDialogProps> = ({
  isOpen,
  admin,
  onClose,
  onChange,
  onSubmit,
  isSubmitting,
}) => {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Admin Details</DialogTitle>
          <DialogDescription>Update the administrator&apos;s information</DialogDescription>
        </DialogHeader>
        {admin && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={admin.name}
                onChange={(event) => onChange('name', event.target.value.slice(0, ADMIN_NAME_MAX_LENGTH))}
                maxLength={ADMIN_NAME_MAX_LENGTH}
              />
              <CharacterLimitHint currentLength={admin.name.length} maxLength={ADMIN_NAME_MAX_LENGTH} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={admin.email}
                onChange={(event) => onChange('email', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-mobile">Mobile</Label>
              <Input
                id="edit-mobile"
                value={admin.mobile}
                onChange={(event) => onChange('mobile', event.target.value)}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

