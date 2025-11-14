import React from 'react';
import { Society } from '../../types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export type NewAdminForm = {
  name: string;
  email: string;
  mobile: string;
  societyId: string;
};

type AddAdminDialogProps = {
  isOpen: boolean;
  form: NewAdminForm;
  societies: Society[];
  onClose: () => void;
  onChange: <Field extends keyof NewAdminForm>(field: Field, value: NewAdminForm[Field]) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export const AddAdminDialog: React.FC<AddAdminDialogProps> = ({
  isOpen,
  form,
  societies,
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
          <DialogTitle>Add New Admin</DialogTitle>
          <DialogDescription>
            Add a new administrator and assign them to a society
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-name">Name *</Label>
            <Input
              id="new-name"
              value={form.name}
              onChange={(event) => onChange('name', event.target.value)}
              placeholder="Admin Name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-email">Email *</Label>
            <Input
              id="new-email"
              type="email"
              value={form.email}
              onChange={(event) => onChange('email', event.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-mobile">Mobile *</Label>
            <Input
              id="new-mobile"
              value={form.mobile}
              onChange={(event) => onChange('mobile', event.target.value)}
              placeholder="+91-9876543210"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-society">Society *</Label>
            <Select
              value={form.societyId}
              onValueChange={(value) => onChange('societyId', value)}
            >
              <SelectTrigger id="new-society">
                <SelectValue placeholder="Select a society" />
              </SelectTrigger>
              <SelectContent>
                {societies.map((society) => (
                  <SelectItem key={society.id} value={society.id}>
                    {society.societyName} ({society.societyPin})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Admin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

