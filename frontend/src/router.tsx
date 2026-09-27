// ═══════════════════════════════════════════════════════════════
// VORTEX router — every page lazily code-split; 3D chunks load only
// on routes that use them. Role guards on all private areas.
// ═══════════════════════════════════════════════════════════════
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from './components/layout/ProtectedRoute';
import { PublicLayout } from './components/layout/PublicLayout';
import { DashboardShell } from './components/layout/DashboardShell';
import { PageLoader } from './components/ui/Feedback';

// Public
const Landing = lazy(() => import('./pages/public/Landing'));
const About = lazy(() => import('./pages/public/About'));
const HowItWorks = lazy(() => import('./pages/public/HowItWorks'));
const Features = lazy(() => import('./pages/public/Features'));
const Contact = lazy(() => import('./pages/public/Contact'));
const Login = lazy(() => import('./pages/public/Login'));
const Register = lazy(() => import('./pages/public/Register'));
const NotFound = lazy(() => import('./pages/public/NotFound'));

// Farmer
const FarmerDashboard = lazy(() => import('./pages/farmer/FarmerDashboard'));
const AnalyzeCrop = lazy(() => import('./pages/farmer/AnalyzeCrop'));
const Processing = lazy(() => import('./pages/farmer/Processing'));
const AnalysisResult = lazy(() => import('./pages/farmer/AnalysisResult'));
const History = lazy(() => import('./pages/farmer/History'));
const FarmerNotifications = lazy(() => import('./pages/farmer/Notifications'));
const FarmerProfile = lazy(() => import('./pages/farmer/Profile'));

// Expert
const ExpertDashboard = lazy(() => import('./pages/expert/ExpertDashboard'));
const ExpertCases = lazy(() => import('./pages/expert/Cases'));
const ExpertCaseDetail = lazy(() => import('./pages/expert/CaseDetail'));
const ExpertReviewed = lazy(() => import('./pages/expert/Reviewed'));
const ExpertProfile = lazy(() => import('./pages/expert/Profile'));

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminExperts = lazy(() => import('./pages/admin/Experts'));
const AdminCrops = lazy(() => import('./pages/admin/Crops'));
const AdminDiseases = lazy(() => import('./pages/admin/Diseases'));
const AdminAnalyses = lazy(() => import('./pages/admin/Analyses'));
const AdminAnalysisDetail = lazy(() => import('./pages/admin/AnalysisDetail'));
const AdminReviews = lazy(() => import('./pages/admin/Reviews'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));



function L({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export function AppRouter() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<L><Landing /></L>} />
        <Route path="/about" element={<L><About /></L>} />
        <Route path="/how-it-works" element={<L><HowItWorks /></L>} />
        <Route path="/features" element={<L><Features /></L>} />
        <Route path="/contact" element={<L><Contact /></L>} />
      </Route>
      <Route path="/login" element={<GuestRoute><L><Login /></L></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><L><Register /></L></GuestRoute>} />

      {/* ── Farmer ── */}
      <Route
        path="/app"
        element={
          <ProtectedRoute roles={['FARMER']}>
            <DashboardShell><L><FarmerDashboard /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/analyze"
        element={
          <ProtectedRoute roles={['FARMER']}>
            <DashboardShell><L><AnalyzeCrop /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/analyze/:id/processing"
        element={
          <ProtectedRoute roles={['FARMER']}>
            <DashboardShell><L><Processing /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/analyses/:id"
        element={
          <ProtectedRoute roles={['FARMER']}>
            <DashboardShell><L><AnalysisResult /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/history"
        element={
          <ProtectedRoute roles={['FARMER']}>
            <DashboardShell><L><History /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/notifications"
        element={
          <ProtectedRoute roles={['FARMER']}>
            <DashboardShell><L><FarmerNotifications /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/profile"
        element={
          <ProtectedRoute roles={['FARMER']}>
            <DashboardShell><L><FarmerProfile /></L></DashboardShell>
          </ProtectedRoute>
        }
      />

      {/* ── Expert ── */}
      <Route
        path="/expert"
        element={
          <ProtectedRoute roles={['EXPERT']}>
            <DashboardShell><L><ExpertDashboard /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expert/cases"
        element={
          <ProtectedRoute roles={['EXPERT']}>
            <DashboardShell><L><ExpertCases /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expert/cases/:id"
        element={
          <ProtectedRoute roles={['EXPERT']}>
            <DashboardShell><L><ExpertCaseDetail /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expert/reviewed"
        element={
          <ProtectedRoute roles={['EXPERT']}>
            <DashboardShell><L><ExpertReviewed /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expert/profile"
        element={
          <ProtectedRoute roles={['EXPERT']}>
            <DashboardShell><L><ExpertProfile /></L></DashboardShell>
          </ProtectedRoute>
        }
      />

      {/* ── Admin ── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DashboardShell><L><AdminDashboard /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DashboardShell><L><AdminUsers /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/experts"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DashboardShell><L><AdminExperts /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/crops"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DashboardShell><L><AdminCrops /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/diseases"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DashboardShell><L><AdminDiseases /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analyses"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DashboardShell><L><AdminAnalyses /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analyses/:id"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DashboardShell><L><AdminAnalysisDetail /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reviews"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DashboardShell><L><AdminReviews /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DashboardShell><L><AdminReports /></L></DashboardShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DashboardShell><L><AdminSettings /></L></DashboardShell>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<L><NotFound /></L>} />
    </Routes>
  );
}

