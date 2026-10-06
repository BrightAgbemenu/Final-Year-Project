import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { NewClientPage } from '@/pages/NewClientPage';
import { ClientDetailPage } from '@/pages/ClientDetailPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            {/* Not gated by PublicOnlyRoute: a valid reset link gives the browser a
                real (temporary) session, which PublicOnlyRoute would otherwise treat
                as "already logged in" and bounce to the dashboard before the user
                can set a new password. */}
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/clients/new" element={<NewClientPage />} />
                <Route path="/clients/:id" element={<ClientDetailPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<LoginPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
