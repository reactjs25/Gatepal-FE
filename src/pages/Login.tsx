import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
const logo = new URL('../assets/f327b419d75f4a4c0592f1b2bf0e3f99041c24be.png', import.meta.url).href;

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Update page title
  useEffect(() => {
    document.title = 'Super Admin Login - GatePal';
  }, []);

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

  const validatePassword = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Password is required';
    }
    if (value.trim().length < 8) {
      return 'Password must be at least 8 characters';
    }
    return undefined;
  };

  // Handle email change with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    const error = validateEmail(value);
    setEmailError(error);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    const error = validatePassword(value);
    setPasswordError(error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email before submission
    const emailValidationError = validateEmail(email);
    const passwordValidationError = validatePassword(password);
    setEmailError(emailValidationError);
    setPasswordError(passwordValidationError);
    if (emailValidationError || passwordValidationError) {
      return;
    }

    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An error occurred. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img src={logo} alt="GatePal" className="h-16" />
            </div>

            <p className="text-gray-600">Super Admin Login</p>
          </div>

         

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" data-required>
                Email Address
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
              {emailError && (
                <p className="text-sm validation-message">{emailError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" data-required>
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={handlePasswordChange}
                  className="pl-10 pr-12"
                  required
                />
              </div>
              {passwordError && (
                <p className="text-sm validation-message">{passwordError}</p>
              )}
            </div>

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-green-600 hover:text-green-700"
              >
                Forgot Password?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>

            <p className="text-center text-sm text-gray-600">
              New to Gatepal?{' '}
              <Link to="/signup" className="font-medium text-green-600 hover:text-green-700">
                Create an account
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
