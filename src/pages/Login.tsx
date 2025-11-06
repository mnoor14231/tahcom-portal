import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { ChangePasswordModal } from '../components/modals/ChangePasswordModal.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, User, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';

export function LoginPage() {
  const { login, changePassword } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
        // Show form after logo animation completes
        const timer = setTimeout(() => {
          setShowForm(true);
        }, 3300); // 3.3 seconds (3s animation + 0.3s buffer)
    return () => clearTimeout(timer);
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
      setShowPasswordChangeModal(true);
    } else {
      navigate('/dashboard');
    }
  }

  function handlePasswordChange(newPassword: string) {
    changePassword(newPassword);
    setShowPasswordChangeModal(false);
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -left-24 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-24 -right-24 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        />
      </div>

      {/* Full-Screen Logo Reveal Animation */}
      <AnimatePresence>
        {!showForm && (
          <motion.div
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-gradient-to-br from-orange-50/95 via-amber-50/95 to-yellow-50/95 backdrop-blur-sm"
          >
            <motion.div
              initial={{
                scale: 2,
                rotate: 0,
                opacity: 0
              }}
              animate={{
                scale: [
                  2,     // Start large
                  1.8,   // Shrinking
                  1.6,   // Continue
                  1.4,   // Getting smaller
                  1.2,   // Smaller
                  1.1,   // Almost there
                  1.05,  // Very close
                  1      // Perfect size
                ],
                rotate: [
                  0,     // Start
                  360    // 1 full rotation only
                ],
                opacity: [
                  0,     // Hidden
                  1,     // Fade in
                  1,     // Fully visible
                  1,     // Stay visible
                  1,     // Stay visible
                  1,     // Stay visible
                  1,     // Stay visible
                  1      // Stay visible
                ]
              }}
              transition={{
                duration: 3, // Slower for one rotation
                ease: "easeInOut",
                times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]
              }}
              className="relative"
            >
              {/* Refined animated glow - Reduced */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: [0, 0.25, 0.2, 0.15],
                  scale: [0.8, 1.5, 1.3, 1.1]
                }}
                transition={{
                  duration: 3, // Match the logo duration
                  ease: "easeOut",
                  times: [0, 0.4, 0.7, 1]
                }}
                className="absolute -inset-12 bg-gradient-to-r from-orange-400 to-amber-400 rounded-full blur-xl opacity-30"
              />

              {/* Logo - Smaller Size */}
              <motion.img
                src="/tahcomlogo.png"
                alt="Tahcom"
                className="relative w-24 h-24 rounded-xl shadow-xl ring-4 ring-white/60"
                animate={{
                  boxShadow: [
                    "0 15px 30px -8px rgba(139, 92, 246, 0.4)",
                    "0 15px 30px -8px rgba(251, 146, 60, 0.4)",
                    "0 15px 30px -8px rgba(139, 92, 246, 0.4)",
                  ]
                }}
                transition={{
                  boxShadow: {
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }
                }}
              />

              {/* Sparkles - Smaller */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 0, 0.8, 1],
                  scale: [0, 0, 0.9, 1],
                  rotate: 360
                }}
                transition={{
                  opacity: { duration: 3, times: [0, 0.65, 0.85, 1] }, // Match logo duration
                  scale: { duration: 3, times: [0, 0.65, 0.85, 1] }, // Match logo duration
                  rotate: { duration: 3, repeat: Infinity, ease: "linear" } // Match logo duration
                }}
                className="absolute -top-3 -right-3"
              >
                <Sparkles className="text-orange-500 w-8 h-8" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
              className="w-full max-w-md"
            >
          {/* Card with glassmorphism */}
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-brand rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition duration-1000"></div>
            
            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
              {/* Gradient top border */}
              <div className="h-2 bg-gradient-brand-full"></div>
              
              <div className="p-8">
                {/* Logo and Header */}
                <div className="flex flex-col items-center gap-4 mb-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
                    className="relative"
                  >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-brand rounded-xl blur-lg opacity-50"></div>
                    
                    <img 
                      src="/tahcomlogo.png" 
                      alt="Tahcom" 
                      className="relative h-20 w-20 rounded-xl shadow-2xl ring-4 ring-white/50"
                    />
                    
                    {/* Sparkle effect */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                      className="absolute -top-2 -right-2"
                    >
                      <Sparkles className="text-orange-500" size={20} />
                    </motion.div>
                  </motion.div>
                  
                  <div className="text-center space-y-2">
                    <motion.h1 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="text-3xl font-bold bg-gradient-brand-full bg-clip-text text-transparent"
                    >
                      Tahcom Portal
                    </motion.h1>
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-sm text-gray-600 font-medium"
                    >
                      Welcome back! Please sign in to continue
                    </motion.p>
                  </div>
                </div>

                {/* Login Form */}
                <form className="space-y-6" onSubmit={onSubmit}>
                  {/* Username Field */}
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
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
                        className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border-2 border-gray-200 rounded-xl focus:border-brand-1 focus:bg-white focus:ring-4 focus:ring-orange-100 transition-all duration-300 outline-none font-medium text-gray-900 placeholder-gray-400"
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
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
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
                        className="w-full pl-12 pr-12 py-4 bg-gray-50/50 border-2 border-gray-200 rounded-xl focus:border-brand-1 focus:bg-white focus:ring-4 focus:ring-orange-100 transition-all duration-300 outline-none font-medium text-gray-900 placeholder-gray-400"
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.4 }}
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.02, y: loading ? 0 : -2 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="relative w-full py-4 px-6 rounded-xl font-semibold text-white shadow-xl disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden group"
                  >
                    {/* Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-brand-full transition-all duration-300 group-hover:scale-105"></div>
                    
                    {/* Shine Effect */}
                    <motion.div
                      animate={{
                        x: ['-100%', '200%'],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                    />
                    
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

                {/* Demo Credentials */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-8 pt-6 border-t border-gray-200"
                >
                  <div className="text-center space-y-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Demo Credentials</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {['admin', 'BDmanager', 'BDmember1', 'BDmember2'].map((acc, idx) => (
                        <motion.button
                          key={acc}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.9 + idx * 0.1 }}
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setUsername(acc)}
                          className="px-3 py-1.5 bg-gradient-to-r from-orange-100 to-amber-100 hover:from-orange-200 hover:to-amber-200 text-brand-1 text-xs font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          {acc}
                        </motion.button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Password: <span className="font-mono font-semibold text-brand-1">123</span>
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ChangePasswordModal
        isOpen={showPasswordChangeModal}
        onChangePassword={handlePasswordChange}
        isRequired={true}
      />
    </div>
  );
}
