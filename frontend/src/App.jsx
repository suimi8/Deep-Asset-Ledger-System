import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { LayoutDashboard, TrendingUp, Wallet, Settings as SettingsIcon, Globe, ChevronRight, LogOut, LogIn, UserPlus, Activity } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';
import Dashboard from "./pages/Dashboard";
import StockList from "./pages/StockList";
import StockDetail from "./pages/StockDetail";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Diagnosis from "./pages/Diagnosis";
import { AuthProvider, useAuth } from "./context/AuthContext";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#0f172a]">
      <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  return children;
}

function Layout({ children }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [langOpen, setLangOpen] = useState(false);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setLangOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentLangLabel = {
    'en': 'English',
    'zh-CN': '简体中文',
    'zh-TW': '繁體中文'
  }[i18n.language];

  return (
    <div className="flex h-screen bg-[#0f172a] text-[#f1f5f9] font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className="w-72 glass-pane border-r border-white/5 flex flex-col z-20">
        <div className="p-8">
          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp size={22} className="text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
              {t('app.title')}
            </h1>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-1">
          <p className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{t('app.nav.menu') || 'Menu'}</p>
          <NavItem to="/" icon={<LayoutDashboard size={18} />} label={t('app.nav.overview')} active={location.pathname === "/"} />
          <NavItem to="/stocks" icon={<TrendingUp size={18} />} label={t('app.nav.stocks')} active={location.pathname.startsWith("/stocks")} />
          <NavItem to="/diagnosis" icon={<Activity size={18} />} label={t('diagnosis.title')} active={location.pathname === "/diagnosis"} />
          <NavItem to="/transactions" icon={<Wallet size={18} />} label={t('app.nav.transactions')} active={location.pathname === "/transactions"} />
        </nav>

        <div className="p-6 border-t border-white/5 space-y-4">
          <NavItem to="/settings" icon={<SettingsIcon size={18} />} label={t('app.nav.settings')} active={location.pathname === "/settings"} />

          {user && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-all duration-300 group"
            >
              <LogOut size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold tracking-wide">{t('auth.logout') || '退出登录'}</span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="w-full p-4 rounded-2xl bg-white/5 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                  <Globe size={14} className="group-hover:text-blue-400 transition-colors text-gray-400" />
                </div>
                <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">
                  {currentLangLabel}
                </span>
              </div>
              <ChevronRight size={12} className={`text-gray-500 transition-transform duration-300 ${langOpen ? 'rotate-90' : ''}`} />
            </button>

            {langOpen && (
              <div className="absolute bottom-full left-0 w-full mb-2 p-2 bg-[#1e293b]/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-2 duration-200 z-50">
                {['en', 'zh-CN', 'zh-TW'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => changeLanguage(lang)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${i18n.language === lang
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    {lang === 'en' ? 'English' : lang === 'zh-CN' ? '简体中文' : '繁體中文'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
        <div className="p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label, active }) {
  return (
    <Link
      to={to}
      className={`
        flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 group
        ${active
          ? 'bg-blue-500/10 text-white shadow-sm ring-1 ring-blue-500/20'
          : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <span className={`${active ? 'text-blue-400' : 'group-hover:text-gray-300'} transition-colors`}>
          {icon}
        </span>
        <span className="text-sm font-semibold tracking-wide">{label}</span>
      </div>
      {active && <div className="w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_8px_#3b82f6]" />}
    </Link>
  );
}

function App() {
  const { t } = useTranslation();
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(30, 41, 59, 0.9)',
              color: '#fff',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: '600',
              padding: '12px 24px',
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="*" element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/stocks" element={<StockList />} />
                  <Route path="/stocks/:id" element={<StockDetail />} />
                  <Route path="/diagnosis" element={<Diagnosis />} />
                  <Route path="/transactions" element={<div className="text-xl font-bold p-20 glass-card rounded-3xl text-center">{t('common.coming_soon')}</div>} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
