import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HomeIcon, ArrowUpTrayIcon, ClockIcon,
  UsersIcon, ArrowRightOnRectangleIcon,
  ShieldCheckIcon, Bars3Icon, XMarkIcon, BellIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { to: '/dashboard',  icon: HomeIcon,          label: 'Dashboard'    },
  { to: '/upload',     icon: ArrowUpTrayIcon,   label: 'Upload CSV'   },
  { to: '/predict',    icon: CpuChipIcon,       label: 'Single Predict'},
  { to: '/analytics',  icon: ChartBarIcon,      label: 'Analytics'    },
  { to: '/history',    icon: ClockIcon,         label: 'History'      },
];

const adminItems = [
  { to: '/admin', icon: UsersIcon, label: 'User Management' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <ShieldCheckIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">FraudGuard</p>
            <p className="text-xs text-brand-400 mt-0.5">AI Detection</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-xs text-slate-500 uppercase tracking-wider px-3 mb-3 font-semibold">Main</p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}
            onClick={() => setSidebarOpen(false)}>
            <Icon className="w-4.5 h-4.5 w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <>
            <p className="text-xs text-slate-500 uppercase tracking-wider px-3 mb-3 mt-6 font-semibold">Admin</p>
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}
                onClick={() => setSidebarOpen(false)}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="nav-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-dark-800 border-r border-white/5 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-dark-800 border-r border-white/5 flex flex-col z-10">
            <button onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-dark-600 text-slate-400">
              <XMarkIcon className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-dark-800/50 backdrop-blur-md border-b border-white/5 flex items-center px-4 lg:px-6 gap-4 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-dark-600 text-slate-400">
            <Bars3Icon className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button className="relative p-2 rounded-lg hover:bg-dark-600 text-slate-400 transition-colors">
            <BellIcon className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
            {user?.username?.[0]?.toUpperCase()}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
