import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { ChangePasswordModal } from '../components/modals/ChangePasswordModal.tsx';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { LogIn, User, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';

export function LoginPage() {
  const { login, changePassword, user, initializing } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (initializing) return;
    if (user) {
      if (user.requirePasswordChange) {
        setShowPasswordChangeModal(true);
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [initializing, user, navigate]);

  useEffect(() => {
    const updateCompactFlag = () => {
      if (typeof window !== 'undefined') {
        setIsCompact(window.matchMedia('(max-width: 480px)').matches);
      }
    };

    updateCompactFlag();
    window.addEventListener('resize', updateCompactFlag);
    return () => window.removeEventListener('resize', updateCompactFlag);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await login(username, password);
    setLoading(false);
    if (!res.ok) { setError(res.error || 'Login failed'); return; }
    
    // Check if password change is required
    if (res.requirePasswordChange) {
      setPasswordChangeError(null);
      setShowPasswordChangeModal(true);
    } else {
      navigate('/dashboard');
    }
  }

  async function handlePasswordChange(newPassword: string) {
    setPasswordChangeLoading(true);
    setPasswordChangeError(null);
    const result = await changePassword(newPassword);
    setPasswordChangeLoading(false);

    if (!result.ok) {
      const message = result.error || 'Failed to update password. Please try again.';
      setPasswordChangeError(message);
      throw new Error(message);
    }

    setShowPasswordChangeModal(false);
    navigate('/dashboard');
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Animated Background Elements - Reduced */}
      {!shouldReduceMotion && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 30, 0],
            }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute -top-32 -left-28 h-80 w-80 rounded-full bg-orange-200/50 blur-3xl md:h-96 md:w-96"
          />
          <motion.div
            animate={{
              scale: [1.05, 0.98, 1.05],
              rotate: [30, 0, 30],
            }}
            transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl md:h-96 md:w-96"
          />
        </div>
      )}

      {/* Main Content */}
      <div className="relative flex min-h-screen items-center justify-center px-3 py-10 sm:px-4">
        <AnimatePresence>
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.2 : 0.3, ease: 'easeOut' }}
            className="w-full max-w-md"
          >
          {/* Card with glassmorphism */}
          <div className="relative">
            {/* Glow effect */}
            {!isCompact && (
              <div className="absolute -inset-1 rounded-2xl bg-gradient-brand blur-xl opacity-30 transition duration-1000 group-hover:opacity-50"></div>
            )}
            
            <div className="relative overflow-hidden rounded-2xl border border-white/30 bg-white/95 shadow-xl backdrop-blur-sm md:border-white/20 md:bg-white/80 md:shadow-2xl md:backdrop-blur-xl">
              {/* Gradient top border */}
              <div className="h-2 bg-gradient-brand-full"></div>
              
              <div className={isCompact ? 'p-6 sm:p-7' : 'p-8'}>
                {/* Logo and Header */}
                <div className="flex flex-col items-center gap-4 mb-8">
                  <motion.div
                    initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="relative"
                  >
                    {/* Glow effect - reduced */}
                    {!isCompact && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-brand blur-lg opacity-20"></div>
                    )}
                    
                    <img 
                      src="/tahcomlogo.png" 
                      alt="Tahcom" 
                      loading="lazy"
                      className="relative h-16 w-16 rounded-xl shadow-xl ring-4 ring-white/60 sm:h-20 sm:w-20"
                    />
                  </motion.div>
                  
                  <div className="text-center space-y-2">
                    <motion.h1 
                      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                      transition={{ delay: 0.05, duration: 0.3, ease: 'easeOut' }}
                      className="text-2xl font-bold text-brand-1 sm:text-3xl"
                    >
                      Tahcom Portal
                    </motion.h1>
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="text-sm font-medium text-gray-600"
                    >
                      Welcome back! Please sign in to continue
                    </motion.p>
                  </div>
                </div>

                {/* Login Form */}
                <form className="space-y-6" onSubmit={onSubmit}>
                  {/* Username Field */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.25 }}
                    className="relative"
                  >
                    <div className={`relative transition-all duration-300 ${
                      focusedField === 'username' ? 'scale-[1.02]' : ''
                    }`}>
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User 
                          className={`transition-colors duration-300 ${
                            focusedField === 'username' ? 'text-brand-1' : 'text-gray-400'
                          }`} 
                          size={20} 
                        />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        onFocus={() => setFocusedField('username')}
                        onBlur={() => setFocusedField(null)}
                        className="w-full rounded-xl border border-orange-100 bg-white/70 pl-12 pr-4 py-3 font-medium text-gray-900 placeholder-gray-400 outline-none transition-all duration-300 focus:border-brand-1 focus:bg-white focus:ring-2 focus:ring-orange-100"
                        placeholder="Enter your username"
                        required
                      />
                      {focusedField === 'username' && (
                        <motion.div
                          layoutId="focusedBorder"
                          className="absolute inset-0 border-2 border-brand-1 rounded-xl pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        />
                      )}
                    </div>
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ 
                        opacity: focusedField === 'username' ? 1 : 0,
                        height: focusedField === 'username' ? 'auto' : 0
                      }}
                      className="mt-2 text-xs text-gray-500 ml-1"
                    >
                      Use: admin, BDmanager, BDmember1, or BDmember2
                    </motion.p>
                  </motion.div>

                  {/* Password Field */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25, duration: 0.25 }}
                    className="relative"
                  >
                    <div className={`relative transition-all duration-300 ${
                      focusedField === 'password' ? 'scale-[1.02]' : ''
                    }`}>
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock 
                          className={`transition-colors duration-300 ${
                            focusedField === 'password' ? 'text-brand-1' : 'text-gray-400'
                          }`} 
                          size={20} 
                        />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        className="w-full rounded-xl border border-orange-100 bg-white/70 pl-12 pr-12 py-3 font-medium text-gray-900 placeholder-gray-400 outline-none transition-all duration-300 focus:border-brand-1 focus:bg-white focus:ring-2 focus:ring-orange-100"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-brand-1 transition-colors duration-200"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                      {focusedField === 'password' && (
                        <motion.div
                          layoutId="focusedBorder"
                          className="absolute inset-0 border-2 border-brand-1 rounded-xl pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        />
                      )}
                    </div>
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ 
                        opacity: focusedField === 'password' ? 1 : 0,
                        height: focusedField === 'password' ? 'auto' : 0
                      }}
                      className="mt-2 text-xs text-gray-500 ml-1"
                    >
                      Default password is: 123
                    </motion.p>
                  </motion.div>

                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="flex items-center gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg"
                      >
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-red-800">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Button */}
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.25 }}
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.99 }}
                    className="group relative w-full rounded-xl px-6 py-3 font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {/* Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-brand-full transition-all duration-200 group-hover:opacity-90"></div>
                    
                    {/* Button Content */}
                    <span className="relative flex items-center justify-center gap-3">
                      {loading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          />
                          <span className="text-base">Signing you in...</span>
                        </>
                      ) : (
                        <>
                          <LogIn size={20} />
                          <span className="text-base">Sign In</span>
                        </>
                      )}
                    </span>
                  </motion.button>
                </form>

                {/* Quick Link to Partners */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="mt-6"
                >
                  <button
                    type="button"
                    onClick={() => navigate('/our-partners')}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#8B4513]/40 bg-gradient-to-r from-white via-orange-50 to-white px-4 py-3 font-semibold text-[#8B4513] transition-all hover:from-orange-50 hover:to-orange-100"
                  >
                    <Sparkles size={18} />
                    Explore Partner Solutions
                  </button>
                </motion.div>

                {/* Demo Credentials */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-7 border-t border-gray-200 pt-6"
                >
                  <div className="text-center space-y-3">
                    
                   
                    <p className="text-xs text-gray-500">
                      Default Password: <span className="font-mono font-semibold text-brand-1">1234</span>
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <ChangePasswordModal
        isOpen={showPasswordChangeModal}
        onChangePassword={handlePasswordChange}
        isRequired={true}
        serverError={passwordChangeError}
        isSubmitting={passwordChangeLoading}
      />
    </div>
  );
}
