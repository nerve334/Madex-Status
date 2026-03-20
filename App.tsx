import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { checkSetupStatus, getToken, setToken, getMe } from './api';
import { DashboardIcon, SettingsIcon, Globe, Activity, Shield, Bell, Users } from './components/Icons';

const PublicStatus = lazy(() => import('./pages/PublicStatus'));
const Login = lazy(() => import('./pages/Login'));
const Setup = lazy(() => import('./pages/Setup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AllSites = lazy(() => import('./pages/AllSites'));
const SiteProfile = lazy(() => import('./pages/SiteProfile'));
const Settings = lazy(() => import('./pages/Settings'));
const PublicManagement = lazy(() => import('./pages/PublicManagement'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Notifications = lazy(() => import('./pages/Notifications'));

const Loader = () => (
  <div className="min-h-screen bg-dark-950 flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// ── Sidebar Navigation ──
const navItems = [
  { path: '/admindashboard', icon: DashboardIcon, label: 'Dashboard' },
  { path: '/sites', icon: Globe, label: 'Monitors' },
  { path: '/public-management', icon: Shield, label: 'Public Status' },
  { path: '/notifications', icon: Bell, label: 'Notifications' },
  { path: '/users', icon: Users, label: 'Users' },
  { path: '/settings', icon: SettingsIcon, label: 'Settings' },
];

const Sidebar: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const location = useLocation();
  return (
    <aside className="fixed left-0 top-0 w-64 h-full bg-dark-900 border-r border-dark-800 flex flex-col z-50">
      <div className="p-6 border-b border-dark-800">
        <Link to="/admindashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-brand" />
          </div>
          <span className="font-black text-lg uppercase tracking-wider text-zinc-100 group-hover:text-brand transition-colors">Madex</span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/sites' && location.pathname.startsWith('/sites/'));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-brand/10 text-brand border border-brand/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-dark-800 border border-transparent'}`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-dark-800 space-y-2">
        <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-zinc-500 hover:text-zinc-300 hover:bg-dark-800 transition-all border border-transparent">
          <Globe className="w-5 h-5" />
          View Status Page
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-400 hover:bg-rose-500/10 transition-all border border-transparent"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Logout
        </button>
      </div>
    </aside>
  );
};

// ── Dashboard Layout ──
const DashboardLayout: React.FC<{ children: React.ReactNode; onLogout: () => void }> = ({ children, onLogout }) => (
  <div className="min-h-screen bg-dark-950">
    <Sidebar onLogout={onLogout} />
    <main className="ml-64 min-h-screen p-8">
      {children}
    </main>
  </div>
);

// ── Protected Route ──
const ProtectedRoute: React.FC<{ isAuth: boolean; children: React.ReactNode }> = ({ isAuth, children }) => {
  if (!isAuth) return <Navigate to="/madexadm" replace />;
  return <>{children}</>;
};

// ── Main App ──
const App: React.FC = () => {
  const [isAuth, setIsAuth] = useState(!!getToken());
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const { setupComplete: sc } = await checkSetupStatus();
        setSetupComplete(sc);

        if (getToken()) {
          try {
            await getMe();
            setIsAuth(true);
          } catch {
            setToken(null);
            setIsAuth(false);
          }
        }
      } catch {
        setSetupComplete(true);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleLogin = (token: string) => {
    setToken(token);
    setIsAuth(true);
  };

  const handleLogout = () => {
    setToken(null);
    setIsAuth(false);
  };

  if (loading) return <Loader />;

  const adminPage = (Component: React.FC<any>, props?: any) => (
    <ProtectedRoute isAuth={isAuth}>
      <DashboardLayout onLogout={handleLogout}>
        <Suspense fallback={<Loader />}>
          <Component {...props} />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  );

  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<PublicStatus />} />

          {/* Setup */}
          <Route path="/setup" element={
            setupComplete ? <Navigate to="/madexadm" replace /> : <Setup onSetupComplete={(token) => { setSetupComplete(true); handleLogin(token); }} />
          } />

          {/* Login */}
          <Route path="/madexadm" element={
            !setupComplete ? <Navigate to="/setup" replace /> :
            isAuth ? <Navigate to="/admindashboard" replace /> :
            <Login onLogin={handleLogin} isAuthenticated={isAuth} />
          } />

          {/* Admin Pages */}
          <Route path="/admindashboard" element={adminPage(Dashboard)} />
          <Route path="/sites" element={adminPage(AllSites)} />
          <Route path="/sites/:id" element={adminPage(SiteProfile)} />
          <Route path="/public-management" element={adminPage(PublicManagement)} />
          <Route path="/users" element={adminPage(UserManagement)} />
          <Route path="/notifications" element={adminPage(Notifications)} />
          <Route path="/settings" element={adminPage(Settings)} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;

