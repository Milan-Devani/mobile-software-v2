import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  LayoutDashboard,
  Wrench,
  Users,
  Package,
  CreditCard,
  Bell,
  Settings,
  LogOut,
  Smartphone,
  PlusCircle,
  ShieldCheck,
  User
} from 'lucide-react';
import { logout } from '../../store/authSlice';
import Swal from 'sweetalert2';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    Swal.fire({
      title: 'Sign out?',
      text: 'You will need to enter your credentials to log in again.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Sign Out',
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(logout());
        navigate('/login');
      }
    });
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'technician', 'staff'] },
    { label: 'Repair Jobs', path: '/jobs', icon: Wrench, roles: ['admin', 'technician', 'staff'] },
    { label: 'Customers', path: '/customers', icon: Users, roles: ['admin', 'technician', 'staff'] },
    { label: 'Parts & Stock', path: '/parts', icon: Package, roles: ['admin', 'technician', 'staff'] },
    { label: 'Payments', path: '/payments', icon: CreditCard, roles: ['admin', 'staff'] },
    { label: 'Notifications', path: '/notifications', icon: Bell, roles: ['admin', 'staff', 'technician'] },
    { label: 'Shop Settings', path: '/settings', icon: Settings, roles: ['admin'] },
  ];

  const filteredNav = navItems.filter((item) => !item.roles || item.roles.includes(user?.role_id));

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white shadow-lg shadow-primary-900/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base tracking-tight leading-none">TechFix Pro</h1>
              <p className="text-[11px] text-primary-400 font-medium mt-1">Repair Management</p>
            </div>
          </div>
        </div>

        {/* Quick New Job Button */}
        <div className="px-4 py-3">
          <button
            onClick={() => {
              navigate('/jobs/new');
              onClose?.();
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all shadow-primary-900/20 active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Job Sheet</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-600/15 text-primary-400 font-semibold border-l-4 border-primary-500'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/30">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-800/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs uppercase shrink-0">
                {user?.full_name ? user.full_name.charAt(0) : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'Staff'}</p>
                <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">{user?.role_id || 'Role'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
