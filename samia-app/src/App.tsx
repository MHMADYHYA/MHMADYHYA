import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import { AppShell } from './app/AppShell'
import { queryClient } from './app/queryClient'
import { Spinner, ToastProvider } from './components/Feedback'
import { AppointmentDetailsPage } from './features/appointments/AppointmentDetailsPage'
import { NewAppointmentPage } from './features/appointments/NewAppointmentPage'
import { AuthProvider, useAuth } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { ResetPasswordPage } from './features/auth/ResetPasswordPage'
import { CalendarPage } from './features/calendar/CalendarPage'
import { ClientDetailsPage } from './features/clients/ClientDetailsPage'
import { ClientsPage } from './features/clients/ClientsPage'
import { FollowUpPage } from './features/followup/FollowUpPage'
import { OutboxPage } from './features/outbox/OutboxPage'
import { PaymentsPage } from './features/payments/PaymentsPage'
import { PublicAppointmentPage } from './features/public/PublicAppointmentPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { WelcomePage } from './pages/WelcomePage'

/** الصفحات المحمية: لازم تسجيل دخول بحساب مشرف */
function Protected() {
  const { status } = useAuth()
  if (status === 'loading') return <Spinner label="بنفتح التطبيق..." />
  if (status === 'not_configured') return <Navigate to="/setup" replace />
  if (status !== 'signed_in') return <Navigate to="/login" replace />
  return <AppShell />
}

function PublicOnly() {
  const { status } = useAuth()
  if (status === 'not_configured') return <Navigate to="/setup" replace />
  return <Outlet />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/setup" element={<WelcomePage />} />
              <Route path="/a/:token" element={<PublicAppointmentPage />} />
              <Route element={<PublicOnly />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
              </Route>
              <Route element={<Protected />}>
                <Route index element={<Navigate to="/calendar" replace />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/appointments/new" element={<NewAppointmentPage />} />
                <Route path="/appointments/:id" element={<AppointmentDetailsPage />} />
                <Route path="/messages" element={<OutboxPage />} />
                <Route path="/follow-up" element={<FollowUpPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/clients/:id" element={<ClientDetailsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/calendar" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
