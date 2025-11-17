import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Phone, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useAuth } from '../context/AuthContext';
const logo = new URL('../assets/f327b419d75f4a4c0592f1b2bf0e3f99041c24be.png', import.meta.url).href;

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Validate full name (alphabet and space only, max 50 chars)
  const validateFullName = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Full name is required';
    }
    if (value.length > 50) {
      return 'Full name must be 50 characters or less';
    }
    if (!/^[a-zA-Z\s]+$/.test(value)) {
      return 'Full name can only contain letters and spaces';
    }
    return undefined;
  };

  // Validate email
  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Email address is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  // Validate phone number (numeric only, exactly 10 digits)
  const validatePhoneNumber = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Phone number is required';
    }
    if (!/^\d+$/.test(value)) {
      return 'Phone number can only contain numbers';
    }
    if (value.length !== 10) {
      return 'Phone number must be exactly 10 digits';
    }
    return undefined;
  };

  // Validate password (min 8, max 128 chars)
  const validatePassword = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Password is required';
    }
    if (value.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (value.length > 128) {
      return 'Password must be 128 characters or less';
    }
    return undefined;
  };

  // Validate confirm password
  const validateConfirmPassword = (value: string, passwordValue: string): string | undefined => {
    if (!value.trim()) {
      return 'Confirm password is required';
    }
    if (value.length > 128) {
      return 'Password must be 128 characters or less';
    }
    if (value !== passwordValue) {
      return 'Passwords do not match';
    }
    return undefined;
  };

  // Handle full name change with validation
  const handleFullNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFullName(value);
    const error = validateFullName(value);
    setFieldErrors((prev) => ({ ...prev, fullName: error }));
  };

  // Handle email change with validation
  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setEmail(value);
    const error = validateEmail(value);
    setFieldErrors((prev) => ({ ...prev, email: error }));
  };

  // Handle phone number change with validation (only allow numbers)
  const handlePhoneNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, ''); // Remove non-numeric characters
    setPhoneNumber(value);
    const error = validatePhoneNumber(value);
    setFieldErrors((prev) => ({ ...prev, phoneNumber: error }));
  };

  // Handle password change with validation
  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPassword(value);
    const error = validatePassword(value);
    setFieldErrors((prev) => ({ ...prev, password: error }));
    // Also validate confirm password if it has a value
    if (confirmPassword) {
      const confirmError = validateConfirmPassword(confirmPassword, value);
      setFieldErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  // Handle confirm password change with validation
  const handleConfirmPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setConfirmPassword(value);
    const error = validateConfirmPassword(value, password);
    setFieldErrors((prev) => ({ ...prev, confirmPassword: error }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    // Validate all fields
    const fullNameError = validateFullName(fullName);
    const emailError = validateEmail(email);
    const phoneNumberError = validatePhoneNumber(phoneNumber);
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(confirmPassword, password);

    if (fullNameError || emailError || phoneNumberError || passwordError || confirmPasswordError) {
      setFieldErrors({
        fullName: fullNameError,
        email: emailError,
        phoneNumber: phoneNumberError,
        password: passwordError,
        confirmPassword: confirmPasswordError,
      });
      return;
    }

    setLoading(true);

    try {
      const success = await signup({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        password,
      });
      if (success) {
        navigate('/dashboard');
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'We were unable to submit your request. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img src={logo} alt="GatePal" className="h-16" />
            </div>
            <p className="text-gray-600">Create Your Super Admin Account</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={handleFullNameChange}
                  className="pl-10"
                  required
                  maxLength={50}
                />
              </div>
              {fieldErrors.fullName && (
                <p className="text-sm text-red-500">{fieldErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={handleEmailChange}
                  className="pl-10"
                  required
                />
              </div>
              {fieldErrors.email && (
                <p className="text-sm text-red-500">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  className="pl-10"
                  required
                  maxLength={10}
                />
              </div>
              {fieldErrors.phoneNumber && (
                <p className="text-sm text-red-500">{fieldErrors.phoneNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={handlePasswordChange}
                  className="pl-10"
                  required
                  minLength={8}
                  maxLength={128}
                />
              </div>
              {fieldErrors.password && (
                <p className="text-sm text-red-500">{fieldErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirm Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Enter your confirm password"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  className="pl-10"
                  required
                  minLength={8}
                  maxLength={128}
                />
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-sm text-red-500">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating your account...' : 'Create Account'}
            </Button>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-green-600 hover:text-green-700">
                Login
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          © 2025 Society Management Portal. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Signup;

