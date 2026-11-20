import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  LayoutDashboard,
  Wrench,
  Users,
  Package,
  IndianRupee,
  Bell,
  Settings,
  LogOut,
  Smartphone,
  PlusCircle,
  Receipt,
  Trash2,
  Star,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { logout } from '../../store/authSlice';
import { setShopProfile } from '../../store/settingsSlice';
import { settingsService } from '../../services/settingsService';
import { useTheme } from '../../context/ThemeContext';
import Swal from 'sweetalert2';

export const Sidebar = ({ isOpen, onClose, collapsed = false, onToggleCollapse }) => {
  const { user } = useSelector((state) => state.auth);
  const shop = useSelector((state) => state.settings.shop);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    settingsService
      .getSettings()
      .then((res) => {
        const s = res?.shop || res?.data?.shop;
        if (s) dispatch(setShopProfile(s));
      })
      .catch(() => {});
  }, [dispatch]);

  const { isDark } = useTheme();
  const logoUrl = isDark
    ? (shop?.logo_url_dark || shop?.logo_url)
    : (shop?.logo_url || shop?.logo_url_dark);

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
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'developer', 'technician', 'staff'] },
    { label: 'Repair Jobs', path: '/jobs', icon: Wrench, roles: ['admin', 'developer', 'technician', 'staff'] },
    { label: 'Sell / Invoicing', path: '/sales', icon: Receipt, roles: ['admin', 'developer', 'technician', 'staff'] },
    // { label: 'Vendor Management', path: '/vendors', icon: Building2, roles: ['admin', 'developer', 'technician', 'staff'] },
    { label: 'Customers', path: '/customers', icon: Users, roles: ['admin', 'developer', 'technician', 'staff'] },
    { label: 'Parts & Stock', path: '/parts', icon: Package, roles: ['admin', 'developer', 'technician', 'staff'] },
    { label: 'Payments', path: '/payments', icon: IndianRupee, roles: ['admin', 'developer', 'staff'] },
    { label: 'Google Reviews', path: '/reviews', icon: Star, roles: ['admin', 'developer', 'staff'] },
    { label: 'Notifications', path: '/notifications', icon: Bell, roles: ['admin', 'developer', 'staff', 'technician'] },
    { label: 'Shop Settings', path: '/settings', icon: Settings, roles: ['admin', 'developer'] },
    { label: 'Recycle Bin', path: '/recycle-bin', icon: Trash2, roles: ['admin', 'developer', 'technician', 'staff'] },
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
        className={`fixed top-0 bottom-0 left-0 z-40 w-48 spatial-sidebar flex flex-col print:hidden transition-transform duration-250 ease-out ${
          collapsed ? 'lg:w-20' : ''
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Apple Brand Header */}
        <div className={`h-16 flex items-center border-b border-[var(--spatial-border)] ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={shop?.name || 'Shop Logo'}
                className="w-full h-12 object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#0077ed] to-[#0066cc] dark:from-[#0a84ff] dark:to-[#0071e3] flex items-center justify-center text-white shadow-sm shadow-blue-500/20 shrink-0">
                <Smartphone className="w-5 h-5 stroke-[2.2]" />
              </div>
            )}
          </div>
          {/* {!collapsed && (
            <button
              onClick={onToggleCollapse}
              title="Collapse sidebar"
              className="p-1.5 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)] rounded-lg transition-colors active:scale-95 shrink-0"
            >
              <ChevronsLeft className="w-4 h-4 stroke-[2]" />
            </button>
          )} */}
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
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-medium transition-all duration-150 active:scale-[0.98] ${
                    collapsed ? 'justify-center px-0' : ''
                  } ${
                    isActive
                      ? 'bg-[#0071e3]/12 text-[#0071e3] dark:bg-[#0a84ff]/18 dark:text-[#0a84ff] font-semibold'
                      : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 stroke-[2]" />
                {!collapsed && <span className="tracking-tight">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-[var(--spatial-border)] space-y-2">
          <div className={`flex items-center rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] ${collapsed ? 'justify-center p-1.5' : 'justify-between p-2'}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                title={`Login Mail ID: ${user?.email || 'Not available'}`}
                className="w-8 h-8 rounded-full bg-[#0071e3]/15 text-[#0071e3] dark:bg-[#0a84ff]/20 dark:text-[#0a84ff] border border-[#0071e3]/20 dark:border-[#0a84ff]/30 flex items-center justify-center font-bold text-xs uppercase shrink-0"
              >
                {user?.full_name ? user.full_name.charAt(0) : 'U'}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p
                    title={`Login Mail ID: ${user?.email || 'Not available'}`}
                    className="text-xs font-semibold text-[var(--spatial-text-title)] truncate tracking-tight"
                  >
                    {user?.full_name || 'Staff'}
                  </p>
                  <p className="text-[10px] text-[var(--spatial-text-muted)] uppercase tracking-wider font-medium">{user?.role_id || 'Role'}</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 text-[var(--spatial-text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors active:scale-95"
              >
                <LogOut className="w-4 h-4 stroke-[2]" />
              </button>
            )}
          </div>

          {collapsed && (
            <button
              onClick={onToggleCollapse}
              title="Expand sidebar"
              className="w-full flex items-center justify-center px-2.5 py-2 rounded-xl text-xs font-medium text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)] transition-all duration-150 active:scale-[0.98]"
            >
              <ChevronsRight className="w-4 h-4 shrink-0 stroke-[2]" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
