import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { completeSocietyAdminPasswordReset } from '../services/societyService';
const logo = new URL('../assets/f327b419d75f4a4c0592f1b2bf0e3f99041c24be.png', import.meta.url).href;

const MIN_PASSWORD_LENGTH = 8;

export const ResetPassword: React.FC = () => {
  const { completePasswordReset } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token') ?? '';
  const emailParam = searchParams.get('email') ?? '';
  const roleParam = (searchParams.get('role') ?? 'super_admin').toLowerCase();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const hasValidParams = useMemo(
    () => Boolean(resetToken) && Boolean(emailParam),
    [resetToken, emailParam]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!hasValidParams) {
      setError('This reset link is invalid or has expired.');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (roleParam === 'society_admin') {
        const message = await completeSocietyAdminPasswordReset({
          token: resetToken,
          email: emailParam,
          password,
        });
        toast.success(message || 'Password reset successful. You can now log in.');
        navigate('/login', { replace: true });
        return;
      }

      await completePasswordReset({
        token: resetToken,
        email: emailParam,
        password,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
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
            <h1 className="text-gray-900 mb-2">Set a New Password</h1>
            <p className="text-gray-600">
              Choose a strong password to secure your Gatepal account.
            </p>
          </div>

          {!hasValidParams ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  The reset link is invalid or has already been used. Please request a new one.
                </AlertDescription>
              </Alert>
              <Link to="/forgot-password">
                <Button className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Request New Link
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={emailParam}
                    readOnly
                    className="pl-10 bg-gray-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pl-10"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="pl-10"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Resetting password...' : 'Reset Password'}
              </Button>

              <Link to="/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;


