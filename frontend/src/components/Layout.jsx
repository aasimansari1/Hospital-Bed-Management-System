import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BedDouble,
  Users,
  Building2,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  HeartPulse,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/beds', label: 'Beds', icon: BedDouble },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/wards', label: 'Wards', icon: Building2 },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-full bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white p-4 transition-transform
                    dark:border-slate-800 dark:bg-slate-900
                    md:static md:translate-x-0
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between md:justify-start md:gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/30">
              <HeartPulse size={18} />
            </div>
            <div>
              <p className="text-base font-bold leading-tight text-slate-900 dark:text-white">HBMS</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Bed Management</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="mt-6 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors
                ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute inset-x-4 bottom-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
              {user?.name || 'Guest'}
            </p>
            <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{user?.role}</p>
            <button
              onClick={handleLogout}
              className="btn-ghost mt-2 w-full justify-center text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
        />
      )}

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 md:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100 md:text-lg">
              Welcome back, {user?.name?.split(' ')[0] || 'there'}
            </h1>
            <p className="hidden text-xs text-slate-500 dark:text-slate-400 md:block">
              Here is the live status of your hospital
            </p>
          </div>
          <button
            onClick={toggle}
            className="btn-secondary"
            title={dark ? 'Switch to light' : 'Switch to dark'}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            <span className="hidden sm:inline">{dark ? 'Light' : 'Dark'}</span>
          </button>
        </header>

        <div className="flex-1 animate-fade-in p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
