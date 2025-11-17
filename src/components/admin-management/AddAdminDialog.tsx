import React, { useState, useEffect } from 'react';
import { Society, SocietyAdmin } from '../../types';
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
  allAdmins: SocietyAdmin[];
  onClose: () => void;
  onChange: <Field extends keyof NewAdminForm>(field: Field, value: NewAdminForm[Field]) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export const AddAdminDialog: React.FC<AddAdminDialogProps> = ({
  isOpen,
  form,
  societies,
  allAdmins,
  onClose,
  onChange,
  onSubmit,
  isSubmitting,
}) => {
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [mobileError, setMobileError] = useState<string | undefined>(undefined);

  // Filter out inactive societies
  const activeSocieties = societies.filter((s) => s.status === 'Active');

  // Clear form and errors when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setEmailError(undefined);
      setMobileError(undefined);
    }
  }, [isOpen]);

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Email address is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    
    // Check for duplicate email across all admins
    const normalizedEmail = value.trim().toLowerCase();
    const duplicateEmail = allAdmins.find(
      (admin) => admin.email.toLowerCase() === normalizedEmail
    );
    
    if (duplicateEmail) {
      return `An admin with this email already exists in ${duplicateEmail.societyName}`;
    }
    
    return undefined;
  };

  const validateMobile = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Phone number is required';
    }
    const mobileDigits = value.replace(/\D/g, '');
    if (!/^\d+$/.test(mobileDigits)) {
      return 'Phone number can only contain numbers';
    }
    if (mobileDigits.length !== 10) {
      return 'Phone number must be exactly 10 digits';
    }
    
    // Check for duplicate mobile across all admins
    const duplicateMobile = allAdmins.find(
      (admin) => admin.mobile.replace(/\D/g, '') === mobileDigits
    );
    
    if (duplicateMobile) {
      return `An admin with this phone number already exists in ${duplicateMobile.societyName}`;
    }
    
    return undefined;
  };

  const handleEmailChange = (value: string) => {
    onChange('email', value);
    const error = validateEmail(value);
    setEmailError(error);
  };

  const handleMobileChange = (value: string) => {
    // Only allow numeric characters and limit to 10 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 10);
    onChange('mobile', numericValue);
    const error = validateMobile(numericValue);
    setMobileError(error);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const handleSubmit = () => {
    const emailErr = validateEmail(form.email);
    const mobileErr = validateMobile(form.mobile);
    
    if (emailErr || mobileErr) {
      setEmailError(emailErr);
      setMobileError(mobileErr);
      return;
    }
    
    onSubmit();
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
              placeholder="Enter your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-email">Email *</Label>
            <Input
              id="new-email"
              type="email"
              value={form.email}
              onChange={(event) => handleEmailChange(event.target.value)}
              placeholder="Enter your email"
            />
            {emailError && (
              <p className="text-sm text-red-500">{emailError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-mobile">Phone *</Label>
            <Input
              id="new-mobile"
              value={form.mobile}
              onChange={(event) => handleMobileChange(event.target.value)}
              placeholder="Enter your phone"
              maxLength={10}
            />
            {mobileError && (
              <p className="text-sm text-red-500">{mobileError}</p>
            )}
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
                {activeSocieties.map((society) => (
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
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Admin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

