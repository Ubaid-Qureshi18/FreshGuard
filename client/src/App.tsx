import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-load pages for better performance
const Landing      = lazy(() => import('./pages/Landing'));
const Login        = lazy(() => import('./pages/Login'));
const Register     = lazy(() => import('./pages/Register'));
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const Pantry       = lazy(() => import('./pages/Pantry'));
const Scanner      = lazy(() => import('./pages/Scanner'));
const AddFood      = lazy(() => import('./pages/AddFood'));
const FoodDetails  = lazy(() => import('./pages/FoodDetails'));
const Rescue       = lazy(() => import('./pages/Rescue'));
const RecipeDetails = lazy(() => import('./pages/RecipeDetails'));
const Notifications = lazy(() => import('./pages/Notifications'));
const ShoppingList  = lazy(() => import('./pages/ShoppingList'));
const Insights     = lazy(() => import('./pages/Insights'));
const Profile      = lazy(() => import('./pages/Profile'));
const Settings     = lazy(() => import('./pages/Settings'));
const AppLayout    = lazy(() => import('./components/AppLayout'));

// ── Loading Skeleton ───────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf9]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-emerald-800 to-emerald-600 flex items-center justify-center text-3xl shadow-lg shadow-emerald-800/20">
            🌿
          </div>
          <div className="absolute -inset-1 rounded-3xl border-2 border-emerald-400 opacity-40 animate-ping" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-700">FreshGuard</p>
          <p className="text-xs text-gray-400 mt-0.5">Loading your kitchen intelligence…</p>
        </div>
      </div>
    </div>
  );
}

// ── 404 Page ──────────────────────────────────────────────
function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf9]">
      <div className="text-center px-4">
        <div className="text-6xl mb-4">🥦</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-sm text-gray-500 mb-6">This page has spoiled — it doesn't exist.</p>
        <a href="/dashboard" className="btn-primary text-sm px-6 py-3 inline-block">
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<Landing />} />

        {/* Auth routes */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* App routes — no login required */}
        <Route path="/" element={<AppLayout />}>
          <Route path="dashboard"    element={<Dashboard />} />
          <Route path="pantry"       element={<Pantry />} />
          <Route path="scan"         element={<Scanner />} />
          <Route path="add"          element={<AddFood />} />
          <Route path="food/:id"     element={<FoodDetails />} />
          <Route path="rescue"       element={<Rescue />} />
          <Route path="recipe/:idx"  element={<RecipeDetails />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="shopping"     element={<ShoppingList />} />
          <Route path="insights"     element={<Insights />} />
          <Route path="profile"      element={<Profile />} />
          <Route path="settings"     element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#0f172a',
                color: '#f8fafc',
                borderRadius: '14px',
                padding: '12px 18px',
                fontSize: '0.8125rem',
                fontWeight: '600',
                boxShadow: '0 8px 24px rgba(15,23,42,0.2)',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
