import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { TopLoadingBar } from '../common/TopLoadingBar';
import { useTheme } from '../../context/ThemeContext';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('mobotech_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const { spatialStyle, isDark } = useTheme();
  const location = useLocation();

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('mobotech_sidebar_collapsed', next ? '1' : '0');
      } catch {
        // Ignore storage errors (e.g. private browsing)
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden selection:bg-[#0071e3] selection:text-white">
      {/* Top Progress Loading Bar during page/tab switches */}
      <TopLoadingBar />

      {/* Subtle Apple Ambient Vignette Depth */}
      {isDark && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-25 transition-opacity duration-500 print:hidden"
        >
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-500/10 rounded-full blur-[140px]" />
        </div>
      )}

      {/* Spatial Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />

      {/* Fixed Top Navbar (spans from sidebar edge to viewport edge) */}
      <Topbar
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Main Content Area (offset by sidebar width + fixed navbar height) */}
      <div className={`${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-[192px]'} pt-16 flex flex-col flex-1 min-w-0 z-10 relative print:pl-0 print:pt-0 transition-all duration-300`}>
        <main className="flex-1 flex flex-col p-4 sm:p-5 lg:p-6 xl:p-8 max-w-[1680px] w-full mx-auto print:p-0 print:m-0 print:max-w-none min-w-0">
          <div key={location.pathname} className="spatial-page-transition flex-1 flex flex-col w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
