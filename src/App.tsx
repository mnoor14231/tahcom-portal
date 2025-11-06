import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { DataProvider } from './context/DataContext.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { LoginPage } from './pages/Login.tsx';
import { DashboardPage } from './pages/Dashboard.tsx';
import { KPIsPage } from './pages/KPIs.tsx';
import { TasksPage } from './pages/Tasks.tsx';
import { DepartmentsPage } from './pages/Departments.tsx';
import { PeoplePage } from './pages/People.tsx';
import { PartnersPage } from './pages/Partners.tsx';
import { OurPartnersPage } from './pages/OurPartners.tsx';
import { SettingsPage } from './pages/Settings.tsx';
import { AgentsPage } from './pages/Agents.tsx';
import { EmailExpertPage } from './pages/EmailExpert.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <NotificationProvider>
          <LanguageProvider>
            <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/our-partners" element={<OurPartnersPage />} />
            <Route path="/" element={<Navigate to="/our-partners" replace />} />
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
              <Route path="partners" element={<PartnersPage />} />
              <Route path="agents" element={<AgentsPage />} />
              <Route path="agents/email-expert" element={<EmailExpertPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/our-partners" replace />} />
            </Routes>
          </LanguageProvider>
        </NotificationProvider>
      </DataProvider>
    </AuthProvider>
  );
}


