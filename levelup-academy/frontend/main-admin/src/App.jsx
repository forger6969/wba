import { lazy, Suspense, useRef } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { useDashboard } from './queries.js';
import Layout from './components/Layout.jsx';
import Splash from './components/Splash.jsx';
const Login = lazy(() => import('./pages/Login.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Leads = lazy(() => import('./pages/Leads.jsx'));
const Organizations = lazy(() => import('./pages/Organizations.jsx'));
const OrgDetail = lazy(() => import('./pages/OrgDetail.jsx'));
const Billing = lazy(() => import('./pages/Billing.jsx'));
const Revenue = lazy(() => import('./pages/Revenue.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Announcements = lazy(() => import('./pages/Announcements.jsx'));
const Features = lazy(() => import('./pages/Features.jsx'));
const VideoStorage = lazy(() => import('./pages/VideoStorage.jsx'));
const Audit = lazy(() => import('./pages/Audit.jsx'));
const ActionCenter = lazy(() => import('./pages/ActionCenter.jsx'));
const SiteAnalytics = lazy(() => import('./pages/SiteAnalytics.jsx'));
const ChatModeration = lazy(() => import('./pages/ChatModeration.jsx'));
const SystemHealth = lazy(() => import('./pages/SystemHealth.jsx'));
const ErrorLog = lazy(() => import('./pages/ErrorLog.jsx'));
const QueueHealth = lazy(() => import('./pages/QueueHealth.jsx'));
const Invoices = lazy(() => import('./pages/Invoices.jsx'));
const PartnerHealth = lazy(() => import('./pages/PartnerHealth.jsx'));
const ProductActivity = lazy(() => import('./pages/ProductActivity.jsx'));
const PartnerChanges = lazy(() => import('./pages/PartnerChanges.jsx'));

function BootGate({ children }) {
  const { token, loading } = useAuth();
  const { data } = useDashboard();
  const booted = useRef(false);
  if (data) booted.current = true;

  if (loading) return <Splash />;
  if (token && !booted.current) return <Splash />;
  return children;
}

function Protected({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { token } = useAuth();
  return (
    <BootGate>
      <Suspense fallback={<Splash />}><Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
        <Route element={<Protected><Layout /></Protected>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/organizations/:id" element={<OrgDetail />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/revenue" element={<Revenue />} />
          <Route path="/features" element={<Features />} />
          <Route path="/video-storage" element={<VideoStorage />} />
          <Route path="/action-center" element={<ActionCenter />} />
          <Route path="/site-analytics" element={<SiteAnalytics />} />
          <Route path="/chat-moderation" element={<ChatModeration />} />
          <Route path="/system-health" element={<SystemHealth />} />
          <Route path="/error-log" element={<ErrorLog />} />
          <Route path="/queue-health" element={<QueueHealth />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/partner-health" element={<PartnerHealth />} />
          <Route path="/product-activity" element={<ProductActivity />} />
          <Route path="/partner-changes" element={<PartnerChanges />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes></Suspense>
    </BootGate>
  );
}
