import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, hasRole } from '../../context/AuthContext.tsx';
import { useData } from '../../context/DataContext.tsx';
import { useNotifications } from '../../context/NotificationContext.tsx';
import { NotificationPanel } from '../notifications/NotificationPanel.tsx';
import { ChevronDown, LogOut, Settings, Shield, Users, Home, Gauge, ListChecks, Menu, X, Globe, Building2, Bell, Handshake } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import { PushNotificationPrompt } from '../notifications/PushNotificationPrompt.tsx';

function cx(...classes: Array<string | false | undefined>) { return classes.filter(Boolean).join(' '); }

export function AppLayout() {
  const { user, logout } = useAuth();
  const { lang, toggle } = useLanguage();
  const navigate = useNavigate();
  const { state, setPreviewDepartment } = useData();
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

  const isAdmin = hasRole(user, ['admin']);
  const isManager = hasRole(user, ['manager']);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <Home size={18} /> },
    // Admin does not have a dedicated KPIs list page; hide KPIs for admin
    ...(!isAdmin ? [{ to: '/kpis', label: 'KPIs', icon: <Gauge size={18} /> }] : []),
    // Hide Tasks from admin; show for manager and members
    ...(!isAdmin ? [{ to: '/tasks', label: 'Tasks', icon: <ListChecks size={18} /> }] : []),
    ...(isAdmin ? [{ to: '/departments', label: 'Departments', icon: <Shield size={18} /> }] : []),
    ...(isManager ? [{ to: '/people', label: 'People', icon: <Users size={18} /> }] : []),
    // Partners page available for all users
    { to: '/our-partners', label: 'Partners', icon: <Handshake size={18} /> },
    // Settings page now available for all users (admin, manager, member)
    { to: '/settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      {/* Modern Header with gradient accent */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="h-1 bg-gradient-brand-full" />
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </motion.button>
              <div className="flex items-center gap-3">
                <motion.img
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  src="/tahcomlogo.png"
                  alt="Tahcom"
                  className="h-10 w-10 rounded-lg shadow-md"
                />
                <div>
                  <h1 className="text-lg font-bold bg-gradient-brand bg-clip-text text-transparent">
                    Tahcom Portal
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block">{user?.displayName} • {user?.role}</p>
                </div>
              </div>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
              >
                <Bell size={18} className="text-gray-600" />
                {unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.div>
                )}
              </motion.button>

              {/* Language toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-outline flex items-center gap-2"
                onClick={toggle}
              >
                <Globe size={16} />
                <span className="hidden sm:inline">{lang === 'en' ? 'English' : 'العربية'}</span>
                <span className="sm:hidden">{lang.toUpperCase()}</span>
              </motion.button>

              {/* Admin department switcher */}
              {isAdmin && (
                <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                  <Building2 size={16} className="text-brand-1" />
                  <select
                    className="text-sm font-medium bg-transparent border-none focus:ring-0 cursor-pointer"
                    value={state.previewDepartmentCode}
                    onChange={(e) => setPreviewDepartment(e.target.value)}
                  >
                    {state.departments.map((d) => (
                      <option key={d.code} value={d.code}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* User menu */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-semibold">
                    {user?.displayName.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium">{user?.displayName}</div>
                    <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
                  </div>
                  <ChevronDown size={16} className={`transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </motion.button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 card shadow-xl border border-gray-200"
                    >
                      <div className="p-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container-wide px-4 sm:px-6 lg:px-12 xl:px-16 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 py-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block">
          <div className="card sticky top-24">
            <nav className="p-3 space-y-1">
              {navItems.map((item, idx) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <NavLink
                    to={item.to}
                    className={({ isActive }) => cx(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-gradient-brand text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                </motion.div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                className="fixed left-0 top-0 bottom-0 w-64 bg-white z-50 lg:hidden shadow-2xl"
              >
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Menu</h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                      <X size={20} />
                    </button>
                  </div>
                </div>
                <nav className="p-3 space-y-1">
                  {navItems.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsSidebarOpen(false)}
                      className={({ isActive }) => cx(
                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                        isActive
                          ? 'bg-gradient-brand text-white shadow-lg'
                          : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="min-h-[70vh]">
          <Outlet />
        </main>
      </div>

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onRemoveNotification={removeNotification}
      />

      <PushNotificationPrompt />
    </div>
  );
}
