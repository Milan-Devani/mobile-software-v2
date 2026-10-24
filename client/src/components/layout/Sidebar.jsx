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
        {/* Apple Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[var(--spatial-border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#0077ed] to-[#0066cc] dark:from-[#0a84ff] dark:to-[#0071e3] flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Smartphone className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="font-bold text-[var(--spatial-text-title)] text-[15px] tracking-tight leading-none">Mobotech</h1>
              <p className="text-[11px] text-[#0071e3] dark:text-[#0a84ff] font-medium tracking-wide mt-0.5">mobile care</p>
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
            className="w-full spatial-btn-primary flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.2]" />
            <span>Create Job Sheet</span>
          </button>
        </div>

        {/* Apple macOS Navigation Links */}
        <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-medium transition-all duration-150 active:scale-[0.98] ${
                    isActive
                      ? 'bg-[#0071e3]/12 text-[#0071e3] dark:bg-[#0a84ff]/18 dark:text-[#0a84ff] font-semibold'
                      : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 stroke-[2]" />
                <span className="tracking-tight">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-[var(--spatial-border)]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#0071e3]/15 text-[#0071e3] dark:bg-[#0a84ff]/20 dark:text-[#0a84ff] border border-[#0071e3]/20 dark:border-[#0a84ff]/30 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {user?.full_name ? user.full_name.charAt(0) : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--spatial-text-title)] truncate tracking-tight">{user?.full_name || 'Staff'}</p>
                <p className="text-[10px] text-[var(--spatial-text-muted)] uppercase tracking-wider font-medium">{user?.role_id || 'Role'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 text-[var(--spatial-text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors active:scale-95"
            >
              <LogOut className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
