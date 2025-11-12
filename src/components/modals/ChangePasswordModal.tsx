import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, AlertCircle } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onChangePassword: (newPassword: string) => void | Promise<void>;
  isRequired?: boolean;
  serverError?: string | null;
  isSubmitting?: boolean;
}

export function ChangePasswordModal({
  isOpen,
  onChangePassword,
  isRequired = false,
  serverError = null,
  isSubmitting = false
}: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 3) {
      setError('Password must be at least 3 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword === '123') {
      setError('Please choose a password different from the default');
      return;
    }

    try {
      await onChangePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      // Parent handles error display via serverError prop
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
          />
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="card w-full max-w-md shadow-2xl"
            >
              <div className="card-padding">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <Lock className="text-amber-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Change Password</h3>
                    <p className="text-sm text-gray-600">
                      {isRequired ? 'You must change your password to continue' : 'Update your password'}
                    </p>
                  </div>
                </div>

                {isRequired && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={18} />
                    <p className="text-sm text-amber-800">
                      Your account is using the default password. For security reasons, please set a new password.
                    </p>
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-sm font-medium mb-2">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors"
                      placeholder="Enter new password"
                      required
                      minLength={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:border-brand-1 focus:ring-brand-1 transition-colors"
                      placeholder="Confirm new password"
                      required
                      minLength={3}
                    />
                  </div>

                  {(error || serverError) && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">
                        {error || serverError}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full btn btn-primary py-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lock size={18} />
                    {isSubmitting ? 'Updating...' : 'Change Password'}
                  </button>
                </form>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    <strong>Password Requirements:</strong>
                    <br />
                    • At least 3 characters long
                    <br />
                    • Cannot be the default password (123)
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

