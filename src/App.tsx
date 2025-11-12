import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { DataProvider } from './context/DataContext.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';

const LoginPage = lazy(() => import('./pages/Login.tsx').then(m => ({ default: m.LoginPage })));
const OurPartnersPage = lazy(() => import('./pages/OurPartners.tsx').then(m => ({ default: m.OurPartnersPage })));
const AppLayout = lazy(() => import('./components/layout/AppLayout.tsx').then(m => ({ default: m.AppLayout })));
const DashboardPage = lazy(() => import('./pages/Dashboard.tsx').then(m => ({ default: m.DashboardPage })));
const KPIsPage = lazy(() => import('./pages/KPIs.tsx').then(m => ({ default: m.KPIsPage })));
const TasksPage = lazy(() => import('./pages/Tasks.tsx').then(m => ({ default: m.TasksPage })));
const DepartmentsPage = lazy(() => import('./pages/Departments.tsx').then(m => ({ default: m.DepartmentsPage })));
const PeoplePage = lazy(() => import('./pages/People.tsx').then(m => ({ default: m.PeoplePage })));
const SettingsPage = lazy(() => import('./pages/Settings.tsx').then(m => ({ default: m.SettingsPage })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-brand-1 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-4 border-brand-1 border-t-transparent rounded-full"
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <NotificationProvider>
          <LanguageProvider>
            <Suspense fallback={<PageLoader />}>
              <>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/our-partners" element={<OurPartnersPage />} />
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="kpis" element={<KPIsPage />} />
                    <Route path="tasks" element={<TasksPage />} />
                    <Route path="departments" element={<DepartmentsPage />} />
                    <Route path="people" element={<PeoplePage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </>
            </Suspense>
          </LanguageProvider>
        </NotificationProvider>
      </DataProvider>
    </AuthProvider>
  );
}


