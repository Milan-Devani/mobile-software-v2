import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  IndianRupee,
  BarChart3,
  LayoutDashboard,
} from 'lucide-react';

const TABS = [
  { path: '/vendors', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/vendors/send', label: 'I send to other vendor', icon: ArrowUpRight },
  { path: '/vendors/receive', label: 'Other vendor send to me', icon: ArrowDownLeft },
  { path: '/vendors/list', label: 'Vendors list', icon: Building2 },
  { path: '/vendors/ledger', label: 'Vendor Khata', icon: IndianRupee },
  { path: '/vendors/reports', label: 'Reports', icon: BarChart3 },
];

export const VendorNavTabs = ({ activeTab }) => {
  return (
    <div className="p-1 rounded-2xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] flex items-center gap-1 overflow-x-auto no-scrollbar shadow-2xs">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.exact}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all duration-140 select-none cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-[var(--spatial-bg-card)] text-[#0071e3] dark:text-[##0a84ff] shadow-sm font-bold border border-[var(--spatial-border)]'
                  : 'font-medium text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)]'
              }`
            }
          >
            <Icon className="w-3.5 h-3.5 shrink-0 stroke-[2]" />
            <span className="tracking-tight">{tab.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
};

export default VendorNavTabs;