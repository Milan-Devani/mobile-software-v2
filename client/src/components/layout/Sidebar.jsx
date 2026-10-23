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
  Receipt,
  Building2,
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
    { label: 'Sell / Invoicing', path: '/sales', icon: Receipt, roles: ['admin', 'technician', 'staff'] },
    { label: 'Vendor Management', path: '/vendors', icon: Building2, roles: ['admin', 'technician', 'staff'] },
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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 spatial-sidebar flex flex-col print:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[var(--spatial-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-primary-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-sky-950/40">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-[var(--spatial-text-title)] text-base tracking-tight leading-none">Mobotech</h1>
              <p className="text-[11px] text-sky-400 font-semibold mt-1">mobile care</p>
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
            className="w-full spatial-btn-primary flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold"
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
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 font-semibold border-l-4 border-sky-400 shadow-sm shadow-sky-950/10'
                      : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)]'
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
        <div className="p-3 border-t border-[var(--spatial-border)]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 font-bold text-xs uppercase shrink-0">
                {user?.full_name ? user.full_name.charAt(0) : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--spatial-text-title)] truncate">{user?.full_name || 'Staff'}</p>
                <p className="text-[10px] text-[var(--spatial-text-muted)] uppercase font-mono tracking-wider">{user?.role_id || 'Role'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 text-[var(--spatial-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
