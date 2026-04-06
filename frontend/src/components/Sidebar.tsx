import { NavLink, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  FolderIcon,
  ArrowUpTrayIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowRightStartOnRectangleIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

const userNavItems = [
  { to: '/', label: 'Dashboard', icon: HomeIcon, exact: true },
  { to: '/projects', label: 'Projects', icon: FolderIcon, exact: false },
  { to: '/upload', label: 'Upload Results', icon: ArrowUpTrayIcon, exact: false },
  { to: '/comparison', label: 'Compare Tests', icon: ChartBarIcon, exact: false },
  { to: '/trends', label: 'Trend Analysis', icon: ArrowTrendingUpIcon, exact: false },
];

const adminNavItems = [
  { to: '/admin', label: 'User Management', icon: UsersIcon, exact: false },
];

export default function Sidebar() {
  const { username, role, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="w-64 min-h-screen bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">PerfInsight</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Common nav items */}
        {userNavItems.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        {/* Admin-only section */}
        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3">
              <div className="flex items-center gap-1.5">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Admin</span>
              </div>
            </div>
            {adminNavItems.map(({ to, label, icon: Icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-slate-700 space-y-3">
        <div className="flex items-center gap-2 px-1">
          <UserCircleIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-sm text-slate-300 truncate block">{username}</span>
            {isAdmin && (
              <span className="text-xs text-indigo-400 font-medium">Admin</span>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors duration-150"
        >
          <ArrowRightStartOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
          Sign out
        </button>
        <p className="text-xs text-slate-600 text-center">v1.0.0</p>
      </div>
    </aside>
  );
}
