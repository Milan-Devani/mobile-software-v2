import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  Clock,
  CreditCard,
  BarChart3,
} from 'lucide-react';

const TABS = [
  { path: '/vendors', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/vendors/list', label: 'Vendor Master', icon: Building2 },
  { path: '/vendors/send', label: 'Send Mobiles', icon: ArrowUpRight },
  { path: '/vendors/receive', label: 'Receive Mobiles', icon: ArrowDownLeft },
  { path: '/vendors/transactions', label: 'Transactions', icon: Receipt },
  { path: '/vendors/pending', label: 'Pending Repairs', icon: Clock },
  { path: '/vendors/ledger', label: 'Vendor Ledger', icon: CreditCard },
  { path: '/vendors/reports', label: 'Reports', icon: BarChart3 },
];

export const VendorNavTabs = ({ activeTab }) => {
  return (
    <div className="spatial-card p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar shadow-xs">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.exact}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all select-none cursor-pointer ${
                isActive
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-950/30'
                  : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)]'
              }`
            }
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
};

export default VendorNavTabs;
